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
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

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

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`
        UPDATE registrations SET
          status = ?,
          promoted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStatus, student.id);

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

    // Send email notification
    if (process.env.RESEND_API_KEY) {
      resend.emails.send({
        from: 'ClubSync <hello@pabit.in>',
        to: student.user_email,
        subject: `🎉 You're in! Seat Secured for ${event.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2b3a42;">Great news, ${student.user_name}!</h2>
            <p style="font-size: 16px; color: #555;">
              A seat has just opened up for <strong>${event.title}</strong>, and since you were first on the waitlist, you have been automatically accepted!
            </p>
            <p style="font-size: 16px; color: #555;">
              ${isPaid 
                ? 'Your registration is now pending organizer approval while they verify your payment.' 
                : 'You are now officially joined into the event.'}
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://club.pabit.in" style="background-color: #ff5722; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
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
