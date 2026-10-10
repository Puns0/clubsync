const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

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
    status = 'draft' // 'draft' or 'pending_approval'
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
      image_url, pdf_url, pdf_name, status, is_live
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, 0)
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
    eventStatus
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
    status = existing.status
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
      status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title, clubId, clubName,
    date, timeStart, timeEnd, venue,
    description, parseInt(totalSeats, 10) || 50,
    isPaid ? 1 : 0, isPaid ? parseFloat(ticketPrice) || 0 : 0, paymentQr,
    imageUrl, pdfUrl, pdfName,
    status, eventId
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
    is_live: 1
  };

  const result = db.prepare(`
    INSERT INTO events (
      title, club_id, club_name, organizer_id, organizer_name,
      date, time_start, time_end, venue, description,
      total_seats, taken_seats, waitlist_count,
      is_paid, ticket_price, status, is_live
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    demoEvent.title, demoEvent.club_id, demoEvent.club_name, demoEvent.organizer_id, demoEvent.organizer_name,
    demoEvent.date, demoEvent.time_start, demoEvent.time_end, demoEvent.venue, demoEvent.description,
    demoEvent.total_seats, demoEvent.taken_seats, demoEvent.waitlist_count,
    demoEvent.is_paid, demoEvent.ticket_price, demoEvent.status, demoEvent.is_live
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
  const { paymentScreenshot } = req.body;

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  // Check if user is already registered
  const existingReg = db.prepare('SELECT * FROM registrations WHERE event_id = ? AND user_id = ?').get(eventId, req.user.id);
  if (existingReg) {
    if (existingReg.status === 'confirmed') {
      return res.status(400).json({ error: 'You are already registered for this event!' });
    }
    if (existingReg.status === 'pending_payment_approval') {
      return res.status(400).json({ error: 'Your registration is already awaiting payment verification by the organizer.' });
    }
  }

  // Check capacity
  if (event.taken_seats >= event.total_seats) {
    return res.status(400).json({ error: 'Sorry, this event is fully booked.' });
  }

  const isPaid = Boolean(event.is_paid);

  // If paid, payment screenshot is MANDATORY
  if (isPaid) {
    if (!paymentScreenshot) {
      return res.status(400).json({ 
        error: 'Mandatory Requirement: Please upload your payment transaction screenshot to request verification for this paid event.' 
      });
    }

    if (existingReg) {
      db.prepare(`
        UPDATE registrations SET 
          payment_screenshot = ?, 
          status = 'pending_payment_approval',
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(paymentScreenshot, existingReg.id);
    } else {
      db.prepare(`
        INSERT INTO registrations (event_id, user_id, user_name, user_email, is_paid, ticket_price, payment_screenshot, status)
        VALUES (?, ?, ?, ?, 1, ?, ?, 'pending_payment_approval')
      `).run(eventId, req.user.id, req.user.name, req.user.email, event.ticket_price, paymentScreenshot);
    }

    return res.status(201).json({
      message: 'Payment screenshot submitted! Your seat will be confirmed once the organizer approves your transaction.',
      status: 'pending_payment_approval'
    });
  }

  // Free Event: Auto-confirm & increment seats
  if (existingReg) {
    db.prepare(`
      UPDATE registrations SET 
        status = 'confirmed',
        rejection_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(existingReg.id);
  } else {
    db.prepare(`
      INSERT INTO registrations (event_id, user_id, user_name, user_email, is_paid, ticket_price, status)
      VALUES (?, ?, ?, ?, 0, 0, 'confirmed')
    `).run(eventId, req.user.id, req.user.name, req.user.email);
  }

  // Increment taken seats
  db.prepare('UPDATE events SET taken_seats = taken_seats + 1 WHERE id = ?').run(eventId);

  const updatedEvent = db.prepare('SELECT taken_seats, total_seats FROM events WHERE id = ?').get(eventId);

  return res.status(201).json({
    message: 'Registration confirmed! Your seat is secured.',
    status: 'confirmed',
    takenSeats: updatedEvent.taken_seats,
    totalSeats: updatedEvent.total_seats
  });
});

/**
 * GET /api/events/:id/registrations
 * Organizer or Admin views all registrations (with screenshots) for an event
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
    SELECT id, event_id, user_id, user_name, user_email, is_paid, ticket_price, payment_screenshot, status, rejection_reason, created_at, updated_at
    FROM registrations
    WHERE event_id = ?
    ORDER BY created_at DESC
  `).all(eventId);

  res.json({
    registrations: registrations.map(r => ({
      ...r,
      id: r.id.toString(),
      isPaid: Boolean(r.is_paid)
    }))
  });
});

/**
 * PATCH /api/events/:id/registrations/:regId/status
 * Organizer approves or rejects a registration (especially for paid events)
 */
router.patch('/:id/registrations/:regId/status', authenticate, (req, res) => {
  const db = req.app.get('db');
  const eventId = parseInt(req.params.id, 10);
  const regId = parseInt(req.params.regId, 10);
  const { status, rejectionReason = '' } = req.body;

  if (!['confirmed', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "confirmed" or "rejected"' });
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const reg = db.prepare('SELECT * FROM registrations WHERE id = ? AND event_id = ?').get(regId, eventId);
  if (!reg) {
    return res.status(404).json({ error: 'Registration not found' });
  }

  // If approving (changing to confirmed):
  if (status === 'confirmed' && reg.status !== 'confirmed') {
    if (event.taken_seats >= event.total_seats) {
      return res.status(400).json({ error: 'Cannot approve: Event is already at maximum capacity!' });
    }

    db.prepare(`
      UPDATE registrations SET
        status = 'confirmed',
        rejection_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(regId);

    // Increment taken seats by 1 (reducing available seats by 1)
    db.prepare('UPDATE events SET taken_seats = taken_seats + 1 WHERE id = ?').run(eventId);
  } else if (status === 'rejected') {
    // If it was previously confirmed, decrement taken seats
    if (reg.status === 'confirmed') {
      db.prepare('UPDATE events SET taken_seats = MAX(0, taken_seats - 1) WHERE id = ?').run(eventId);
    }

    db.prepare(`
      UPDATE registrations SET
        status = 'rejected',
        rejection_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rejectionReason || 'Payment verification rejected.', regId);
  }

  const updatedReg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(regId);
  const updatedEvent = db.prepare('SELECT taken_seats, total_seats FROM events WHERE id = ?').get(eventId);

  res.json({
    message: status === 'confirmed' ? 'Registration approved! Student has officially joined the event.' : 'Registration rejected.',
    registration: {
      ...updatedReg,
      id: updatedReg.id.toString(),
      isPaid: Boolean(updatedReg.is_paid)
    },
    eventSeats: {
      takenSeats: updatedEvent.taken_seats,
      totalSeats: updatedEvent.total_seats
    }
  });
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
      isPaid: Boolean(r.is_paid)
    }))
  });
});

module.exports = router;

