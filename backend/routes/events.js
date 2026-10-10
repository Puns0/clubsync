const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { advanceWaitlist, studentHasClash, timesOverlap } = require('../workers/promotionWorker');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function generateTicketToken(regId, eventId, userId) {
  const secret = process.env.JWT_SECRET || 'clubsync_secret_key';
  const hmac = crypto.createHmac('sha256', secret)
    .update(`${regId}:${eventId}:${userId}`)
    .digest('hex').substring(0, 12).toUpperCase();
  return `CS-TKT-${regId}-${hmac}`;
}

const router = express.Router();

const DUMMY_VENUES = [
  'Lab 1',
  'Seminar Hall 1',
  'Main Auditorium',
  'CS Block Hall',
  'Main Ground'
];

/**
 * Helper to check venue and time slot collision on the same date.
 * An overlap occurs if: (new_start < existing_end) AND (new_end > existing_start)
 */
function checkVenueConflict(db, venue, date, timeStart, timeEnd, excludeEventId = null) {
  let query = `
    SELECT id, title, time_start, time_end, status 
    FROM events 
    WHERE venue = ? 
      AND date = ? 
      AND status IN ('approved', 'pending_approval')
  `;
  const params = [venue, date];

  if (excludeEventId) {
    query += ' AND id != ?';
    params.push(excludeEventId);
  }

  const existingBookings = db.prepare(query).all(...params);

  for (const b of existingBookings) {
    if (timeStart < b.time_end && timeEnd > b.time_start) {
      return {
        hasConflict: true,
        conflictWith: b
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Format DB event row for frontend consumption
 */
function formatEvent(e) {
  return {
    id: e.id.toString(),
    title: e.title,
    club: e.club_name,
    clubId: e.club_id,
    organizerId: e.organizer_id,
    organizerName: e.organizer_name || 'Event Organizer',
    date: e.date,
    time: `${e.time_start} - ${e.time_end}`,
    timeStart: e.time_start,
    timeEnd: e.time_end,
    venue: e.venue,
    description: e.description || '',
    totalSeats: e.total_seats,
    takenSeats: e.taken_seats,
    waitlistCount: e.waitlist_count,
    isPaid: Boolean(e.is_paid),
    ticketPrice: e.ticket_price || 0,
    paymentQr: e.payment_qr || null,
    imageUrl: e.image_url || null,
    pdfUrl: e.pdf_url || null,
    pdfName: e.pdf_name || null,
    status: e.status,
    rejectionReason: e.rejection_reason || null,
    isLive: Boolean(e.is_live),
    eligibleYears: e.eligible_years ? JSON.parse(e.eligible_years) : null,
    eligibleDepartments: e.eligible_departments ? JSON.parse(e.eligible_departments) : null,
    customQuestions: e.custom_questions ? JSON.parse(e.custom_questions) : [],
    demoMode: Boolean(e.demo_mode),
    createdAt: e.created_at,
    updatedAt: e.updated_at
  };
}

/**
 * GET /api/events
 * Fetch all publicly visible (approved & live) events
 */
router.get('/', (req, res) => {
  const db = req.app.get('db');
  const events = db.prepare(`
    SELECT * FROM events 
    WHERE status = 'approved' OR is_live = 1 
    ORDER BY date ASC, time_start ASC
  `).all();

  res.json({ events: events.map(formatEvent), venues: DUMMY_VENUES });
});

/**
 * GET /api/events/venues
 * Get allowed venue options
 */
router.get('/venues', (req, res) => {
  res.json({ venues: DUMMY_VENUES });
});

/**
 * GET /api/events/all (Admin only)
 * Fetch all events regardless of status for administration
 */
router.get('/all', authenticate, authorize('admin'), (req, res) => {
  const db = req.app.get('db');
  const events = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();

  res.json({ events: events.map(formatEvent) });
});

/**
 * GET /api/events/my-events (Organizer or Admin)
 * Fetch events created by the logged in user
 */
router.get('/my-events', authenticate, (req, res) => {
  const db = req.app.get('db');
  let events;

  if (req.user.role === 'admin') {
    events = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
  } else {
    events = db.prepare('SELECT * FROM events WHERE organizer_id = ? ORDER BY created_at DESC').all(req.user.id);
  }

  res.json({ events: events.map(formatEvent) });
});

/**
 * POST /api/events
 * Create a new event (Organizer or Admin)
 */
router.post('/', authenticate, (req, res) => {
  const db = req.app.get('db');

  if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only organizers and admins can create events' });
  }

  const {
    title,
    clubId,
    date,
    timeStart,
    timeEnd,
    venue,
    description = '',
    totalSeats = 50,
    isPaid = false,
    ticketPrice = 0,
    paymentQr = '',
    imageUrl = '',
    pdfUrl = '',
    pdfName = '',
    status = 'draft', // 'draft' or 'pending_approval'
    eligibleYears = null,
    eligibleDepartments = null,
    customQuestions = [],
    demoMode = false
  } = req.body;

  // Basic validation
  if (!title || !clubId || !date || !timeStart || !timeEnd || !venue) {
    return res.status(400).json({ error: 'Please provide all required fields: title, club, date, times, and venue' });
  }

  if (timeStart >= timeEnd) {
    return res.status(400).json({ error: 'Start time must be strictly before end time' });
  }

  if (!DUMMY_VENUES.includes(venue)) {
    return res.status(400).json({ error: `Invalid venue. Must be one of: ${DUMMY_VENUES.join(', ')}` });
  }

  // Verify club exists
  const club = db.prepare('SELECT * FROM clubs WHERE id = ?').get(clubId);
  if (!club) {
    return res.status(404).json({ error: 'Selected club does not exist' });
  }

  // If not admin, verify organizer is assigned to this club
  if (req.user.role !== 'admin') {
    const isAssigned = db.prepare('SELECT id FROM user_clubs WHERE user_id = ? AND club_id = ?').get(req.user.id, clubId);
    if (!isAssigned) {
      return res.status(403).json({ error: `You are not an assigned organizer for ${club.name}` });
    }
  }

  // Check venue overlap if submitting for approval or draft
  const conflict = checkVenueConflict(db, venue, date, timeStart, timeEnd);
  if (conflict.hasConflict) {
    return res.status(409).json({
      error: `Venue Conflict: "${venue}" is already booked on ${date} between ${conflict.conflictWith.time_start} and ${conflict.conflictWith.time_end} for "${conflict.conflictWith.title}". Please pick another time or venue.`
    });
  }

  const eventStatus = ['draft', 'pending_approval'].includes(status) ? status : 'draft';

  const insertStmt = db.prepare(`
    INSERT INTO events (
      title, club_id, club_name, organizer_id, organizer_name,
      date, time_start, time_end, venue, description,
      total_seats, taken_seats, waitlist_count,
      is_paid, ticket_price, payment_qr,
      image_url, pdf_url, pdf_name, status, is_live,
      eligible_years, eligible_departments, custom_questions, demo_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    title,
    club.id,
    club.name,
    req.user.id,
    req.user.name,
    date,
    timeStart,
    timeEnd,
    venue,
    description,
    parseInt(totalSeats, 10) || 50,
    isPaid ? 1 : 0,
    isPaid ? parseFloat(ticketPrice) || 0 : 0,
    paymentQr,
    imageUrl,
    pdfUrl,
    pdfName,
    eventStatus,
    eligibleYears ? JSON.stringify(eligibleYears) : null,
    eligibleDepartments ? JSON.stringify(eligibleDepartments) : null,
    JSON.stringify(customQuestions || []),
    demoMode ? 1 : 0
  );

  const newEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({
    message: eventStatus === 'pending_approval' ? 'Event submitted for admin approval!' : 'Event saved as draft!',
    event: formatEvent(newEvent)
  });
});

/**
 * PUT /api/events/:id
 * Update an existing event
 */
router.put('/:id', authenticate, (req, res) => {
  const db = req.app.get('db');
  const eventId = parseInt(req.params.id, 10);

  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!existing) {
    return res.status(404).json({ error: 'Event not found' });
  }

  // Permission check
  if (req.user.role !== 'admin' && existing.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to edit this event' });
  }

  const {
    title = existing.title,
    clubId = existing.club_id,
    date = existing.date,
    timeStart = existing.time_start,
    timeEnd = existing.time_end,
    venue = existing.venue,
    description = existing.description,
    totalSeats = existing.total_seats,
    isPaid = Boolean(existing.is_paid),
    ticketPrice = existing.ticket_price,
    paymentQr = existing.payment_qr,
    imageUrl = existing.image_url,
    pdfUrl = existing.pdf_url,
    pdfName = existing.pdf_name,
    status = existing.status,
    eligibleYears = existing.eligible_years ? JSON.parse(existing.eligible_years) : null,
    eligibleDepartments = existing.eligible_departments ? JSON.parse(existing.eligible_departments) : null,
    customQuestions = existing.custom_questions ? JSON.parse(existing.custom_questions) : [],
    demoMode = Boolean(existing.demo_mode)
  } = req.body;

  if (timeStart >= timeEnd) {
    return res.status(400).json({ error: 'Start time must be strictly before end time' });
  }

  // Check venue overlap
  const conflict = checkVenueConflict(db, venue, date, timeStart, timeEnd, eventId);
  if (conflict.hasConflict) {
    return res.status(409).json({
      error: `Venue Conflict: "${venue}" is already booked on ${date} between ${conflict.conflictWith.time_start} and ${conflict.conflictWith.time_end} for "${conflict.conflictWith.title}".`
    });
  }

  // Club details
  const club = db.prepare('SELECT * FROM clubs WHERE id = ?').get(clubId);
  const clubName = club ? club.name : existing.club_name;

  db.prepare(`
    UPDATE events SET
      title = ?, club_id = ?, club_name = ?,
      date = ?, time_start = ?, time_end = ?, venue = ?,
      description = ?, total_seats = ?,
      is_paid = ?, ticket_price = ?, payment_qr = ?,
      image_url = ?, pdf_url = ?, pdf_name = ?,
      status = ?, eligible_years = ?, eligible_departments = ?, custom_questions = ?, demo_mode = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title, clubId, clubName,
    date, timeStart, timeEnd, venue,
    description, parseInt(totalSeats, 10) || 50,
    isPaid ? 1 : 0, isPaid ? parseFloat(ticketPrice) || 0 : 0, paymentQr,
    imageUrl, pdfUrl, pdfName,
    status,
    eligibleYears ? JSON.stringify(eligibleYears) : null,
    eligibleDepartments ? JSON.stringify(eligibleDepartments) : null,
    JSON.stringify(customQuestions || []),
    demoMode ? 1 : 0,
    eventId
  );

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  res.json({ message: 'Event updated successfully', event: formatEvent(updated) });
});

/**
 * PATCH /api/events/:id/status (Admin only)
 * Approve or reject an event
 */
router.patch('/:id/status', authenticate, authorize('admin'), (req, res) => {
  const db = req.app.get('db');
  const eventId = parseInt(req.params.id, 10);
  const { status, rejectionReason = '' } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
  }

  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!existing) {
    return res.status(404).json({ error: 'Event not found' });
  }

  // If approving, double check for conflict
  if (status === 'approved') {
    const conflict = checkVenueConflict(db, existing.venue, existing.date, existing.time_start, existing.time_end, eventId);
    if (conflict.hasConflict && conflict.conflictWith.status === 'approved') {
      return res.status(409).json({
        error: `Cannot approve: Venue "${existing.venue}" already has an approved event ("${conflict.conflictWith.title}") at this time.`
      });
    }
  }

  const isLive = status === 'approved' ? 1 : 0;

  db.prepare(`
    UPDATE events SET
      status = ?,
      rejection_reason = ?,
      is_live = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, status === 'rejected' ? rejectionReason : null, isLive, eventId);

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  res.json({
    message: `Event ${status === 'approved' ? 'approved and made live' : 'rejected'}`,
    event: formatEvent(updated)
  });
});

/**
 * POST /api/events/demo (Admin only)
 * Instant demo event creator for testing cross-dashboard sync
 */
router.post('/demo', authenticate, authorize('admin'), (req, res) => {
  const db = req.app.get('db');
  const randomNum = Math.floor(Math.random() * 900) + 100;
  
  // Pick random club
  const clubs = db.prepare('SELECT * FROM clubs').all();
  const selectedClub = clubs.length > 0 ? clubs[Math.floor(Math.random() * clubs.length)] : { id: 1, name: 'Coding Club' };
  
  const today = new Date().toISOString().split('T')[0];
  const venues = DUMMY_VENUES;
  const venue = venues[Math.floor(Math.random() * venues.length)];

  const startHour = 10 + Math.floor(Math.random() * 8);
  const timeStart = `${String(startHour).padStart(2, '0')}:00`;
  const timeEnd = `${String(startHour + 2).padStart(2, '0')}:00`;

  const demoEvent = {
    title: `Sync Showcase #${randomNum}: AI & Future Tech`,
    club_id: selectedClub.id,
    club_name: selectedClub.name,
    organizer_id: req.user.id,
    organizer_name: req.user.name,
    date: today,
    time_start: timeStart,
    time_end: timeEnd,
    venue: venue,
    description: 'An interactive hands-on demo event created to test real-time cross-dashboard synchronization across Admin, Organizer, and User portals.',
    total_seats: 75,
    taken_seats: 12,
    waitlist_count: 0,
    is_paid: 0,
    ticket_price: 0,
    status: 'approved',
    is_live: 1,
    demo_mode: 1 // fast promotion for demo
  };

  const result = db.prepare(`
    INSERT INTO events (
      title, club_id, club_name, organizer_id, organizer_name,
      date, time_start, time_end, venue, description,
      total_seats, taken_seats, waitlist_count,
      is_paid, ticket_price, status, is_live, demo_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    demoEvent.title, demoEvent.club_id, demoEvent.club_name, demoEvent.organizer_id, demoEvent.organizer_name,
    demoEvent.date, demoEvent.time_start, demoEvent.time_end, demoEvent.venue, demoEvent.description,
    demoEvent.total_seats, demoEvent.taken_seats, demoEvent.waitlist_count,
    demoEvent.is_paid, demoEvent.ticket_price, demoEvent.status, demoEvent.is_live, demoEvent.demo_mode
  );

  const created = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({
    message: 'Demo event created and published live!',
    event: formatEvent(created)
  });
});

/**
 * DELETE /api/events/:id
 * Delete an event (Owner or Admin)
 */
router.delete('/:id', authenticate, (req, res) => {
  const db = req.app.get('db');
  const eventId = parseInt(req.params.id, 10);

  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!existing) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (req.user.role !== 'admin' && existing.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
  res.json({ message: 'Event deleted successfully' });
});

/**
 * POST /api/events/:id/register
 * Student registers for an event (Free or Paid)
 */
router.post('/:id/register', authenticate, (req, res) => {
  const db = req.app.get('db');
  const eventId = parseInt(req.params.id, 10);
  const { paymentScreenshot, preferredEvent, answers } = req.body; // preferredEvent is boolean

  // Get user with department and year
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  // START TRANSACTION
  db.exec('BEGIN IMMEDIATE');

  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      db.exec('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check Eligibility
    let eligibleYears = null;
    let eligibleDepts = null;
    try { eligibleYears = event.eligible_years ? JSON.parse(event.eligible_years) : null; } catch (_) {}
    try { eligibleDepts = event.eligible_departments ? JSON.parse(event.eligible_departments) : null; } catch (_) {}
    
    if (eligibleYears && eligibleYears.length > 0) {
      if (!user.year || !eligibleYears.includes(user.year)) {
        db.exec('ROLLBACK');
        return res.status(403).json({ error: `Not eligible. This event is restricted to years: ${eligibleYears.join(', ')}` });
      }
    }
    
    if (eligibleDepts && eligibleDepts.length > 0) {
      if (!user.department || !eligibleDepts.includes(user.department)) {
         db.exec('ROLLBACK');
         return res.status(403).json({ error: `Not eligible. This event is restricted to departments: ${eligibleDepts.join(', ')}` });
      }
    }

    // Check if user is already registered in a terminal/active state
    const existingReg = db.prepare('SELECT * FROM registrations WHERE event_id = ? AND user_id = ?').get(eventId, req.user.id);
    if (existingReg) {
      if (['confirmed', 'promoted', 'pending_approval', 'waitlisted'].includes(existingReg.status)) {
        db.exec('ROLLBACK');
        return res.status(400).json({ error: `You are already ${existingReg.status} for this event.` });
      }
    }

    // Overlap / Clash Detection
    // Allow if they are just waitlisting for a preferred event
    const clashCheck = studentHasClash(db, req.user.id, event.date, event.time_start, event.time_end);
    if (clashCheck.hasClash) {
      if (!preferredEvent) {
         db.exec('ROLLBACK');
         return res.status(409).json({
           error: 'Time Clash Detected',
           clashWith: clashCheck.clashWith,
           suggestions: [
             { action: 'join_waitlist', label: 'Join waitlist for this event instead (Preferred Event)' },
             { action: 'swap', label: `Cancel ${clashCheck.clashWith.title} and register here` }
           ]
         });
      }
    }

    const isPaid = Boolean(event.is_paid);
    let finalStatus = 'confirmed';

    if (isPaid && !paymentScreenshot && !preferredEvent) { // if just joining waitlist, don't need screenshot yet (waitlist bypasses payment until promoted, or maybe we want it now. Let's say waitlist needs screenshot if paid, but let's assume they don't have to pay until promoted for simplicity, OR we require it now. Let's require it now if they want to join waitlist for a paid event, to keep it simple). Actually, the prompt says "If seats remain, create a confirmed registration and a QR pass."
        if(!paymentScreenshot) {
             db.exec('ROLLBACK');
             return res.status(400).json({ 
                error: 'Mandatory Requirement: Please upload your payment transaction screenshot to request registration.' 
             });
        }
    }

    // Capacity Check
    if (event.taken_seats >= event.total_seats || preferredEvent) {
       // Waitlist them!
       finalStatus = 'waitlisted';
       const maxPos = db.prepare('SELECT MAX(waitlist_position) as m FROM registrations WHERE event_id = ?').get(eventId).m || 0;
       const nextPos = maxPos + 1;

       if (existingReg) {
          db.prepare(`
            UPDATE registrations SET 
              payment_screenshot = ?, 
              status = 'waitlisted',
              waitlist_position = ?,
              preferred_event = ?,
              answers = ?,
              rejection_reason = NULL,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(paymentScreenshot, nextPos, preferredEvent ? 1 : 0, JSON.stringify(answers || {}), existingReg.id);
       } else {
          db.prepare(`
            INSERT INTO registrations (event_id, user_id, user_name, user_email, is_paid, ticket_price, payment_screenshot, status, waitlist_position, preferred_event, answers)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'waitlisted', ?, ?, ?)
          `).run(eventId, req.user.id, req.user.name, req.user.email, isPaid ? 1 : 0, event.ticket_price, paymentScreenshot, nextPos, preferredEvent ? 1 : 0, JSON.stringify(answers || {}));
       }

       db.prepare('UPDATE events SET waitlist_count = waitlist_count + 1 WHERE id = ?').run(eventId);

       db.exec('COMMIT');
       return res.status(201).json({
          message: 'Added to Waitlist!',
          status: 'waitlisted',
          waitlistPosition: nextPos
       });
    }

    // All registrations go to pending_approval (requires organizer approval)
    finalStatus = 'pending_approval';

    if (existingReg) {
      db.prepare(`
        UPDATE registrations SET 
          payment_screenshot = ?, 
          status = ?,
          preferred_event = 0,
          answers = ?,
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(paymentScreenshot, finalStatus, JSON.stringify(answers || {}), existingReg.id);
    } else {
      db.prepare(`
        INSERT INTO registrations (event_id, user_id, user_name, user_email, is_paid, ticket_price, payment_screenshot, status, answers)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(eventId, req.user.id, req.user.name, req.user.email, isPaid ? 1 : 0, event.ticket_price, paymentScreenshot, finalStatus, JSON.stringify(answers || {}));
    }

    // Increment taken seats
    db.prepare('UPDATE events SET taken_seats = taken_seats + 1 WHERE id = ?').run(eventId);
    
    db.exec('COMMIT');

    return res.status(201).json({
      message: isPaid ? 'Payment screenshot submitted! Waiting for approval.' : 'Registration confirmed! Your seat is secured.',
      status: finalStatus
    });

  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

/**
 * POST /api/events/:id/confirm-promotion
 * Student confirms a promoted seat.
 * If they have a clash, the conflicting seat is released!
 */
router.post('/:id/confirm-promotion', authenticate, (req, res) => {
   const db = req.app.get('db');
   const eventId = parseInt(req.params.id, 10);

   db.exec('BEGIN IMMEDIATE');
   try {
       const reg = db.prepare("SELECT * FROM registrations WHERE event_id = ? AND user_id = ? AND status = 'promoted'").get(eventId, req.user.id);
       if (!reg) {
           db.exec('ROLLBACK');
           return res.status(404).json({ error: 'No active promotion found for this event.' });
       }

       // Check if window expired
       if (new Date(reg.promotion_expires_at) < new Date()) {
           // Should be handled by worker, but just in case
           db.prepare("UPDATE registrations SET status = 'expired' WHERE id = ?").run(reg.id);
           db.exec('COMMIT');
           advanceWaitlist(db, eventId);
           return res.status(400).json({ error: 'Promotion window has expired.' });
       }

       const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

       // Check for clash and release conflicting event if present
       const clashCheck = studentHasClash(db, req.user.id, event.date, event.time_start, event.time_end, eventId);
       let swappedFrom = null;
       if (clashCheck.hasClash) {
           const clashingReg = clashCheck.clashWith;
           // Release the clashing seat
           db.prepare("UPDATE registrations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(clashingReg.id);
           db.prepare("UPDATE events SET taken_seats = MAX(0, taken_seats - 1) WHERE id = ?").run(clashingReg.event_id);
           swappedFrom = clashingReg.title;
       }

       // Confirm this one
       const finalStatus = 'pending_approval';
       db.prepare(`
           UPDATE registrations 
           SET status = ?, promoted_at = NULL, promotion_expires_at = NULL, waitlist_position = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
       `).run(finalStatus, reg.id);
       
       db.prepare("UPDATE events SET waitlist_count = MAX(0, waitlist_count - 1), taken_seats = taken_seats + 1 WHERE id = ?").run(eventId);

       db.exec('COMMIT');

       // Advance waitlist for the event we just released (if any) outside the main transaction
       if (swappedFrom && clashCheck.clashWith) {
           advanceWaitlist(db, clashCheck.clashWith.event_id);
       }

       res.json({ message: `Successfully confirmed seat for ${event.title}!${swappedFrom ? ` Automatically released your seat for ${swappedFrom}.` : ''}`, status: finalStatus });

   } catch(error) {
       db.exec('ROLLBACK');
       console.error(error);
       res.status(500).json({ error: 'Failed to confirm promotion.' });
   }
});

/**
 * POST /api/events/:id/pass-promotion
 * Student declines a promoted seat.
 */
router.post('/:id/pass-promotion', authenticate, (req, res) => {
   const db = req.app.get('db');
   const eventId = parseInt(req.params.id, 10);

   db.exec('BEGIN IMMEDIATE');
   try {
       const reg = db.prepare("SELECT * FROM registrations WHERE event_id = ? AND user_id = ? AND status = 'promoted'").get(eventId, req.user.id);
       if (!reg) {
           db.exec('ROLLBACK');
           return res.status(404).json({ error: 'No active promotion found for this event.' });
       }

       db.prepare("UPDATE registrations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reg.id);
       db.prepare("UPDATE events SET waitlist_count = MAX(0, waitlist_count - 1) WHERE id = ?").run(eventId);
       
       db.exec('COMMIT');
       
       // Advance to next person
       advanceWaitlist(db, eventId);

       res.json({ message: 'You passed on this seat.' });
   } catch(error) {
       db.exec('ROLLBACK');
       res.status(500).json({ error: 'Failed to pass promotion.' });
   }
});


/**
 * DELETE /api/events/:id/register
 * Student cancels registration (from confirmed, waitlisted, pending etc)
 */
router.delete('/:id/register', authenticate, (req, res) => {
   const db = req.app.get('db');
   const eventId = parseInt(req.params.id, 10);

   db.exec('BEGIN IMMEDIATE');
   try {
       const reg = db.prepare("SELECT * FROM registrations WHERE event_id = ? AND user_id = ? AND status NOT IN ('cancelled', 'expired', 'rejected')").get(eventId, req.user.id);
       if (!reg) {
           db.exec('ROLLBACK');
           return res.status(404).json({ error: 'Active registration not found.' });
       }

       db.prepare("UPDATE registrations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reg.id);
       
       if (['confirmed', 'pending_approval'].includes(reg.status)) {
           db.prepare("UPDATE events SET taken_seats = MAX(0, taken_seats - 1) WHERE id = ?").run(eventId);
           db.exec('COMMIT');
           advanceWaitlist(db, eventId);
       } else if (['waitlisted', 'promoted'].includes(reg.status)) {
           db.prepare("UPDATE events SET waitlist_count = MAX(0, waitlist_count - 1) WHERE id = ?").run(eventId);
           db.exec('COMMIT');
           if (reg.status === 'promoted') {
               advanceWaitlist(db, eventId);
           }
       } else {
           db.exec('COMMIT');
       }

       res.json({ message: 'Registration cancelled.' });
   } catch(error) {
       db.exec('ROLLBACK');
       res.status(500).json({ error: 'Failed to cancel registration.' });
   }
});


/**
 * GET /api/events/:id/registrations
 * Organizer or Admin views all registrations (with screenshots and answers) for an event
 */
router.get('/:id/registrations', authenticate, (req, res) => {
  const db = req.app.get('db');
  const eventId = parseInt(req.params.id, 10);

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied: You can only view registrations for your own events.' });
  }

  const registrations = db.prepare(`
    SELECT r.id, r.event_id, r.user_id, r.user_name, r.user_email, r.is_paid, r.ticket_price, r.payment_screenshot, r.status, r.rejection_reason, r.waitlist_position, r.promoted_at, r.promotion_expires_at, r.answers, r.ticket_token, r.checked_in, r.checked_in_at, r.created_at, r.updated_at, u.year, u.department
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.event_id = ?
    ORDER BY 
      CASE r.status
        WHEN 'pending_approval' THEN 1
        WHEN 'confirmed' THEN 2
        WHEN 'promoted' THEN 3
        WHEN 'waitlisted' THEN 4
        ELSE 5
      END ASC,
      r.waitlist_position ASC,
      r.created_at DESC
  `).all(eventId);

  res.json({
    registrations: registrations.map(r => ({
      ...r,
      id: r.id.toString(),
      isPaid: Boolean(r.is_paid),
      answers: r.answers ? JSON.parse(r.answers) : {},
      ticketToken: r.ticket_token,
      checkedIn: Boolean(r.checked_in),
      checkedInAt: r.checked_in_at
    }))
  });
});

/**
 * PATCH /api/events/:id/registrations/:regId/status
 * Organizer approves or rejects a registration (especially for paid events)
 */
router.patch('/:id/registrations/:regId/status', authenticate, async (req, res) => {
  const db = req.app.get('db');
  const eventId = parseInt(req.params.id, 10);
  const regId = parseInt(req.params.regId, 10);
  const { status, rejectionReason = '' } = req.body;

  if (!['confirmed', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "confirmed" or "rejected"' });
  }

  db.exec('BEGIN IMMEDIATE');
  try {
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
      if (!event) {
          db.exec('ROLLBACK');
          return res.status(404).json({ error: 'Event not found' });
      }

      if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
          db.exec('ROLLBACK');
          return res.status(403).json({ error: 'Permission denied' });
      }

      const reg = db.prepare('SELECT * FROM registrations WHERE id = ? AND event_id = ?').get(regId, eventId);
      if (!reg) {
          db.exec('ROLLBACK');
          return res.status(404).json({ error: 'Registration not found' });
      }

      let ticketToken = reg.ticket_token;

      // If approving (changing to confirmed):
      if (status === 'confirmed' && reg.status !== 'confirmed') {
        if (event.taken_seats >= event.total_seats && reg.status !== 'pending_approval') {
          if (reg.status !== 'pending_approval') {
             db.exec('ROLLBACK');
             return res.status(400).json({ error: 'Cannot approve: Event is already at maximum capacity!' });
          }
        }

        if (!ticketToken) {
          ticketToken = generateTicketToken(regId, eventId, reg.user_id);
        }

        db.prepare(`
          UPDATE registrations SET
            status = 'confirmed',
            ticket_token = ?,
            rejection_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(ticketToken, regId);

        // If it was waitlisted/promoted, increment taken_seats and decrement waitlist_count
        if (['waitlisted', 'promoted'].includes(reg.status)) {
            db.prepare('UPDATE events SET taken_seats = taken_seats + 1, waitlist_count = MAX(0, waitlist_count - 1) WHERE id = ?').run(eventId);
        }

        // Generate QR Code data URL for email
        let qrDataUrl = '';
        try {
          qrDataUrl = await QRCode.toDataURL(ticketToken, { margin: 2, width: 300 });
        } catch (qrErr) {
          console.error('Failed to generate QR Data URL:', qrErr);
        }

        // Send confirmation email with QR pass
        if (process.env.RESEND_API_KEY) {
          resend.emails.send({
            from: 'ClubSync <hello@pabit.in>',
            to: reg.user_email,
            subject: `✅ Registration Confirmed: ${event.title}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #1e293b; text-align: center; margin-top: 0;">You're in, ${reg.user_name}! 🎉</h2>
                <p style="font-size: 16px; color: #475569; text-align: center; line-height: 1.5;">
                  Your registration for <strong>${event.title}</strong> has been confirmed by the organizer.
                </p>
                ${qrDataUrl ? `
                <div style="text-align: center; margin: 25px 0; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <p style="font-size: 13px; font-weight: bold; color: #64748b; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Official Entry QR Pass</p>
                  <img src="${qrDataUrl}" alt="Event Entry QR Pass" style="width: 200px; height: 200px; display: block; margin: 0 auto; border: 4px solid #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
                  <p style="font-family: monospace; font-size: 14px; color: #0f172a; margin: 12px 0 0 0; font-weight: bold; letter-spacing: 0.5px;">${ticketToken}</p>
                  <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Show this QR code at the venue entrance for attendance verification.</p>
                </div>
                ` : ''}
                <div style="text-align: center; margin: 30px 0 10px 0;">
                  <a href="https://club.pabit.in" style="background-color: #ff5722; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
                    View Event Details
                  </a>
                </div>
              </div>
            `
          }).then((response) => {
            console.log(`📧 Confirmation email with QR sent to ${reg.user_email}:`, response.data?.id);
          }).catch((error) => {
            console.error('Failed to send confirmation email:', error);
          });
        }

      } else if (status === 'rejected') {
        // If it was previously holding a seat (confirmed or pending)
        if (['confirmed', 'pending_approval'].includes(reg.status)) {
          db.prepare('UPDATE events SET taken_seats = MAX(0, taken_seats - 1) WHERE id = ?').run(eventId);
        } else if (['waitlisted', 'promoted'].includes(reg.status)) {
          db.prepare('UPDATE events SET waitlist_count = MAX(0, waitlist_count - 1) WHERE id = ?').run(eventId);
        }

        db.prepare(`
          UPDATE registrations SET
            status = 'rejected',
            rejection_reason = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(rejectionReason || 'Payment verification rejected.', regId);
      }

      db.exec('COMMIT');

      // If rejected and it held a seat, advance waitlist
      if (status === 'rejected' && ['confirmed', 'pending_approval'].includes(reg.status)) {
         advanceWaitlist(db, eventId);
      }

      const updatedReg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(regId);
      const updatedEvent = db.prepare('SELECT taken_seats, total_seats FROM events WHERE id = ?').get(eventId);

      res.json({
        message: status === 'confirmed' ? 'Registration approved! Student has officially joined the event.' : 'Registration rejected.',
        registration: {
          ...updatedReg,
          id: updatedReg.id.toString(),
          isPaid: Boolean(updatedReg.is_paid),
          answers: updatedReg.answers ? JSON.parse(updatedReg.answers) : {},
          ticketToken: updatedReg.ticket_token,
          checkedIn: Boolean(updatedReg.checked_in),
          checkedInAt: updatedReg.checked_in_at
        },
        eventSeats: {
          takenSeats: updatedEvent.taken_seats,
          totalSeats: updatedEvent.total_seats
        }
      });
  } catch(error) {
      db.exec('ROLLBACK');
      res.status(500).json({ error: 'Failed to update registration status.' });
  }
});

/**
 * GET /api/events/my-registrations
 * Get registrations for the logged in student
 */
router.get('/my-registrations', authenticate, (req, res) => {
  const db = req.app.get('db');
  const regs = db.prepare(`
    SELECT r.*, e.title as event_title, e.date as event_date, e.time_start, e.time_end, e.venue, e.club_name
    FROM registrations r
    INNER JOIN events e ON r.event_id = e.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);

  res.json({
    registrations: regs.map(r => ({
      ...r,
      id: r.id.toString(),
      isPaid: Boolean(r.is_paid),
      answers: r.answers ? JSON.parse(r.answers) : {},
      ticketToken: r.ticket_token,
      checkedIn: Boolean(r.checked_in),
      checkedInAt: r.checked_in_at
    }))
  });
});

/**
 * POST /api/events/:id/verify-ticket
 * Organizer scans or inputs a student's QR ticket_token to verify venue attendance
 */
router.post('/:id/verify-ticket', authenticate, (req, res) => {
  const db = req.app.get('db');
  const eventId = parseInt(req.params.id, 10);
  const { ticketToken } = req.body;

  if (!ticketToken || typeof ticketToken !== 'string') {
    return res.status(400).json({ error: 'Ticket token is required' });
  }

  const cleanToken = ticketToken.trim().toUpperCase();

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied: Only the assigned organizer or admin can scan tickets for this event.' });
  }

  const reg = db.prepare(`
    SELECT r.*, u.year, u.department
    FROM registrations r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.event_id = ? AND UPPER(r.ticket_token) = ?
  `).get(eventId, cleanToken);

  if (!reg) {
    return res.status(404).json({ 
      success: false, 
      error: 'Invalid QR Ticket Code. No matching registration found for this event.' 
    });
  }

  if (reg.status !== 'confirmed') {
    return res.status(400).json({ 
      success: false, 
      error: `Registration is not confirmed (Current Status: ${reg.status.toUpperCase()}).` 
    });
  }

  if (reg.checked_in) {
    return res.json({
      success: true,
      alreadyCheckedIn: true,
      message: '⚠️ Student was ALREADY checked in previously!',
      student: {
        id: reg.id.toString(),
        userId: reg.user_id,
        name: reg.user_name,
        email: reg.user_email,
        year: reg.year || 'N/A',
        department: reg.department || 'N/A',
        status: reg.status,
        ticketToken: reg.ticket_token,
        checkedInAt: reg.checked_in_at
      }
    });
  }

  // Mark student as checked in
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE registrations SET
      checked_in = 1,
      checked_in_at = ?
    WHERE id = ?
  `).run(now, reg.id);

  return res.json({
    success: true,
    alreadyCheckedIn: false,
    message: '✅ Attendance Verified! Student successfully checked into venue.',
    student: {
      id: reg.id.toString(),
      userId: reg.user_id,
      name: reg.user_name,
      email: reg.user_email,
      year: reg.year || 'N/A',
      department: reg.department || 'N/A',
      status: 'confirmed',
      ticketToken: reg.ticket_token,
      checkedInAt: now
    }
  });
});

/**
 * GET /api/events/:id/registrations/:regId/qr
 * Returns registration ticket details and QR code data URL
 */
router.get('/:id/registrations/:regId/qr', authenticate, async (req, res) => {
  const db = req.app.get('db');
  const eventId = parseInt(req.params.id, 10);
  const regId = parseInt(req.params.regId, 10);

  const reg = db.prepare('SELECT * FROM registrations WHERE id = ? AND event_id = ?').get(regId, eventId);
  if (!reg) {
    return res.status(404).json({ error: 'Registration not found' });
  }

  const event = db.prepare('SELECT organizer_id FROM events WHERE id = ?').get(eventId);
  if (req.user.role !== 'admin' && req.user.id !== reg.user_id && event?.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  let tokenToUse = reg.ticket_token;
  if (!tokenToUse && reg.status === 'confirmed') {
    tokenToUse = generateTicketToken(reg.id, eventId, reg.user_id);
    db.prepare('UPDATE registrations SET ticket_token = ? WHERE id = ?').run(tokenToUse, reg.id);
  }

  let qrDataUrl = null;
  if (tokenToUse) {
    try {
      qrDataUrl = await QRCode.toDataURL(tokenToUse, { margin: 2, width: 300 });
    } catch (err) {
      console.error('QR generation error:', err);
    }
  }

  res.json({
    ticketToken: tokenToUse,
    qrDataUrl,
    checkedIn: Boolean(reg.checked_in),
    checkedInAt: reg.checked_in_at
  });
});

module.exports = router;
