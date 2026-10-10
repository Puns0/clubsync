/**
 * Promotion Worker
 * ────────────────────────────────────────────────────
 * Runs every 15 seconds via node-cron.
 *
 * 1.  Finds any registration whose status is 'promoted'
 *     but whose promotion_expires_at is in the past.
 * 2.  Marks those as 'expired'.
 * 3.  For each affected event, calls advanceWaitlist()
 *     to promote the next eligible, clash-free student.
 *
 * Timer-safe: driven by expires_at column, not in-memory
 * timers, so a server restart does not lose state.
 * ────────────────────────────────────────────────────
 */
const cron = require('node-cron');
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

/**
 * Check whether two time ranges overlap.
 * Back-to-back (end === start) is NOT a clash.
 */
function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

/**
 * Check if a student has any overlapping confirmed or
 * in-window promoted registration on the given date/time.
 */
function studentHasClash(db, userId, date, timeStart, timeEnd, excludeEventId = null) {
  const rows = db.prepare(`
    SELECT r.id, r.event_id, r.status, e.date, e.time_start, e.time_end, e.title
    FROM registrations r
    INNER JOIN events e ON r.event_id = e.id
    WHERE r.user_id = ?
      AND e.date = ?
      AND r.status IN ('confirmed', 'promoted', 'pending_approval')
  `).all(userId, date);

  for (const row of rows) {
    if (excludeEventId && row.event_id === excludeEventId) continue;
    if (timesOverlap(timeStart, timeEnd, row.time_start, row.time_end)) {
      return { hasClash: true, clashWith: row };
    }
  }
  return { hasClash: false };
}

/**
 * Advance the waitlist for a given event.
 * Finds the next waitlisted student who is:
 *   - eligible (year/department)
 *   - clash-free (no overlapping confirmed/promoted registrations)
 * Promotes them with a time window.
 */
function advanceWaitlist(db, eventId) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) return;

  // Count active seats (confirmed + promoted + pending_approval)
  const activeCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM registrations 
    WHERE event_id = ? AND status IN ('confirmed', 'promoted', 'pending_approval')
  `).get(eventId).cnt;

  if (activeCount >= event.total_seats) return; // still full

  // Get next waitlisted student by position
  const waitlisted = db.prepare(`
    SELECT r.*, u.year, u.department
    FROM registrations r
    INNER JOIN users u ON r.user_id = u.id
    WHERE r.event_id = ? AND r.status = 'waitlisted'
    ORDER BY r.waitlist_position ASC
  `).all(eventId);

  // Parse eligibility
  let eligibleYears = null;
  let eligibleDepts = null;
  try { eligibleYears = event.eligible_years ? JSON.parse(event.eligible_years) : null; } catch (_) {}
  try { eligibleDepts = event.eligible_departments ? JSON.parse(event.eligible_departments) : null; } catch (_) {}

  for (const student of waitlisted) {
    // Check eligibility
    if (eligibleYears && eligibleYears.length > 0 && student.year) {
      if (!eligibleYears.includes(student.year)) continue; // skip ineligible
    }
    if (eligibleDepts && eligibleDepts.length > 0 && student.department) {
      if (!eligibleDepts.includes(student.department)) continue;
    }

    // Check for time clash
    const clash = studentHasClash(db, student.user_id, event.date, event.time_start, event.time_end, eventId);
    if (clash.hasClash) continue; // skip — they now have a clash

    // This student is eligible and clash-free → instantly accept them!
    const isPaid = Boolean(event.is_paid);
    const newStatus = isPaid ? 'pending_approval' : 'confirmed';

    let ticketToken = student.ticket_token;
    if (newStatus === 'confirmed' && !ticketToken) {
      ticketToken = generateTicketToken(student.id, eventId, student.user_id);
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`
        UPDATE registrations SET
          status = ?,
          ticket_token = COALESCE(?, ticket_token),
          promoted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStatus, ticketToken, student.id);

      db.prepare(`
        UPDATE events SET
          taken_seats = taken_seats + 1,
          waitlist_count = MAX(0, waitlist_count - 1)
        WHERE id = ?
      `).run(eventId);

      db.exec('COMMIT');
    } catch(err) {
      db.exec('ROLLBACK');
      console.error('Failed to auto-accept waitlisted student:', err);
      continue;
    }

    console.log(`🎫 Auto-accepted waitlisted student ${student.user_name} (ID:${student.user_id}) for event "${event.title}"`);

    // Send email notification with QR pass if confirmed
    if (process.env.RESEND_API_KEY) {
      (async () => {
        let qrDataUrl = '';
        if (newStatus === 'confirmed' && ticketToken) {
          try {
            qrDataUrl = await QRCode.toDataURL(ticketToken, { margin: 2, width: 300 });
          } catch (e) {
            console.error('QR generation error in promotion worker:', e);
          }
        }

        resend.emails.send({
          from: 'ClubSync <hello@pabit.in>',
          to: student.user_email,
          subject: `🎉 You're in! Seat Secured for ${event.title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #1e293b; text-align: center; margin-top: 0;">Great news, ${student.user_name}! 🎉</h2>
              <p style="font-size: 16px; color: #475569; text-align: center; line-height: 1.5;">
                A seat opened up for <strong>${event.title}</strong>, and since you were next on the waitlist, you have been automatically accepted!
              </p>
              <p style="font-size: 15px; color: #475569; text-align: center;">
                ${isPaid 
                  ? 'Your registration is now pending organizer approval while they verify your payment.' 
                  : 'You are now officially joined into the event.'}
              </p>
              ${qrDataUrl ? `
              <div style="text-align: center; margin: 25px 0; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="font-size: 13px; font-weight: bold; color: #64748b; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Official Entry QR Pass</p>
                <img src="${qrDataUrl}" alt="Event Entry QR Pass" style="width: 200px; height: 200px; display: block; margin: 0 auto; border: 4px solid #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
                <p style="font-family: monospace; font-size: 14px; color: #0f172a; margin: 12px 0 0 0; font-weight: bold; letter-spacing: 0.5px;">${ticketToken}</p>
                <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Show this QR code at the venue entry for instant attendance scan.</p>
              </div>
              ` : ''}
              <div style="text-align: center; margin: 30px 0 10px 0;">
                <a href="https://club.pabit.in" style="background-color: #ff5722; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
                  View Your Dashboard
                </a>
              </div>
            </div>
          `
        }).then((response) => {
          console.log(`📧 Acceptance email sent to ${student.user_email}:`, response.data?.id);
        }).catch((error) => {
          console.error('Failed to send acceptance email:', error);
        });
      })();
    }

    return; // only promote one at a time
  }
}

/**
 * Start the promotion worker cron job.
 * Runs every 15 seconds.
 */
function startPromotionWorker(db) {
  console.log('⏰ Promotion worker started (checking every 15s)');

  cron.schedule('*/15 * * * * *', () => {
    try {
      const now = new Date().toISOString();

      // Find all expired promotions
      const expired = db.prepare(`
        SELECT r.id, r.event_id, r.user_id, r.user_name, e.title
        FROM registrations r
        INNER JOIN events e ON r.event_id = e.id
        WHERE r.status = 'promoted'
          AND r.promotion_expires_at IS NOT NULL
          AND r.promotion_expires_at < ?
      `).all(now);

      if (expired.length > 0) {
        const markExpired = db.prepare(`
          UPDATE registrations SET 
            status = 'expired', 
            updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `);

        const affectedEventIds = new Set();

        for (const reg of expired) {
          markExpired.run(reg.id);
          affectedEventIds.add(reg.event_id);
          console.log(`⏰ Promotion expired for ${reg.user_name} on "${reg.title}"`);
        }

        // Advance waitlist for each affected event
        for (const eventId of affectedEventIds) {
          advanceWaitlist(db, eventId);
        }
      }
    } catch (err) {
      console.error('Promotion worker error:', err.message);
    }
  });
}

module.exports = { startPromotionWorker, advanceWaitlist, studentHasClash, timesOverlap };
