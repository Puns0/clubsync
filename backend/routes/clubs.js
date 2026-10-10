const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/clubs
 * List all clubs (public)
 */
router.get('/', (req, res) => {
  const db = req.app.get('db');
  const clubs = db.prepare('SELECT * FROM clubs ORDER BY name ASC').all();
  res.json({ clubs });
});

/**
 * GET /api/clubs/my-clubs
 * Get clubs assigned to the currently logged in organizer
 */
router.get('/my-clubs', authenticate, (req, res) => {
  const db = req.app.get('db');
  
  // If admin, they have access to all clubs
  if (req.user.role === 'admin') {
    const allClubs = db.prepare('SELECT * FROM clubs ORDER BY name ASC').all();
    return res.json({ clubs: allClubs, isAdmin: true });
  }

  const myClubs = db.prepare(`
    SELECT c.* FROM clubs c
    INNER JOIN user_clubs uc ON c.id = uc.club_id
    WHERE uc.user_id = ?
    ORDER BY c.name ASC
  `).all(req.user.id);

  res.json({ clubs: myClubs, isAdmin: false });
});

/**
 * GET /api/clubs/organizers (Admin only)
 * Get all organizers and the clubs they are assigned to
 */
router.get('/organizers', authenticate, authorize('admin'), (req, res) => {
  const db = req.app.get('db');
  
  const organizers = db.prepare(`
    SELECT id, name, email, role, created_at 
    FROM users 
    WHERE role = 'organizer' 
    ORDER BY name ASC
  `).all();

  const organizersWithClubs = organizers.map(org => {
    const assignedClubs = db.prepare(`
      SELECT c.id, c.name, c.code, c.category 
      FROM clubs c
      INNER JOIN user_clubs uc ON c.id = uc.club_id
      WHERE uc.user_id = ?
      ORDER BY c.name ASC
    `).all(org.id);

    return {
      ...org,
      clubs: assignedClubs
    };
  });

  res.json({ organizers: organizersWithClubs });
});

/**
 * POST /api/clubs/assign (Admin only)
 * Assign a user (organizer) to a club
 */
router.post('/assign', authenticate, authorize('admin'), (req, res) => {
  const db = req.app.get('db');
  const { userId, clubId } = req.body;

  if (!userId || !clubId) {
    return res.status(400).json({ error: 'User ID and Club ID are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const club = db.prepare('SELECT * FROM clubs WHERE id = ?').get(clubId);
  if (!club) {
    return res.status(404).json({ error: 'Club not found' });
  }

  try {
    db.prepare('INSERT OR IGNORE INTO user_clubs (user_id, club_id) VALUES (?, ?)')
      .run(userId, clubId);
    
    // Return updated club list for this user
    const assignedClubs = db.prepare(`
      SELECT c.id, c.name, c.code 
      FROM clubs c
      INNER JOIN user_clubs uc ON c.id = uc.club_id
      WHERE uc.user_id = ?
    `).all(userId);

    res.json({ 
      message: `Assigned ${user.name} to ${club.name}`,
      clubs: assignedClubs
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign club' });
  }
});

/**
 * POST /api/clubs/unassign (Admin only)
 * Remove a user's assignment from a club
 */
router.post('/unassign', authenticate, authorize('admin'), (req, res) => {
  const db = req.app.get('db');
  const { userId, clubId } = req.body;

  if (!userId || !clubId) {
    return res.status(400).json({ error: 'User ID and Club ID are required' });
  }

  try {
    db.prepare('DELETE FROM user_clubs WHERE user_id = ? AND club_id = ?')
      .run(userId, clubId);

    const assignedClubs = db.prepare(`
      SELECT c.id, c.name, c.code 
      FROM clubs c
      INNER JOIN user_clubs uc ON c.id = uc.club_id
      WHERE uc.user_id = ?
    `).all(userId);

    res.json({ 
      message: 'Assignment removed successfully',
      clubs: assignedClubs
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unassign club' });
  }
});

module.exports = router;
