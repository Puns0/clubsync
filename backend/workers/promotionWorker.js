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
      AND r.status IN ('confirmed', 'promoted', 'pending_payment_approval')
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

  // Count active seats (confirmed + promoted + pending_payment_approval)
  const activeCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM registrations 
    WHERE event_id = ? AND status IN ('confirmed', 'promoted', 'pending_payment_approval')
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

    // This student is eligible and clash-free → promote them!
    const windowSeconds = event.demo_mode ? 60 : 1800; // 60s demo, 30min normal
    const expiresAt = new Date(Date.now() + windowSeconds * 1000).toISOString();

    db.prepare(`
      UPDATE registrations SET
        status = 'promoted',
        promoted_at = CURRENT_TIMESTAMP,
        promotion_expires_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(expiresAt, student.id);

    console.log(`🎫 Promoted student ${student.user_name} (ID:${student.user_id}) for event "${event.title}" — window expires at ${expiresAt}`);
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
