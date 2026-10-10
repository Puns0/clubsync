const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'clubsync.db');

function initDatabase() {
  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'organizer', 'user')),
      year TEXT,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create clubs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create user_clubs table (organizer assignments)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, club_id)
    )
  `);

  // Create events table with full metadata
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
      club_name TEXT NOT NULL,
      organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      organizer_name TEXT,
      date TEXT NOT NULL,
      time_start TEXT NOT NULL,
      time_end TEXT NOT NULL,
      venue TEXT NOT NULL,
      description TEXT,
      total_seats INTEGER NOT NULL DEFAULT 50,
      taken_seats INTEGER DEFAULT 0,
      waitlist_count INTEGER DEFAULT 0,
      is_paid BOOLEAN DEFAULT 0,
      ticket_price REAL DEFAULT 0,
      payment_qr TEXT,
      image_url TEXT,
      pdf_url TEXT,
      pdf_name TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_approval', 'approved', 'rejected')),
      rejection_reason TEXT,
      is_live BOOLEAN DEFAULT 0,
      eligible_years TEXT,
      eligible_departments TEXT,
      custom_questions TEXT,
      demo_mode INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ──────────────────────────────────────────────────────
  //  Registrations table — must support the full waitlist
  //  lifecycle: confirmed, waitlisted, promoted, expired,
  //  pending_approval, rejected, cancelled
  // ──────────────────────────────────────────────────────
  //  We drop-and-recreate when the schema is outdated so
  //  new status values and columns are available.
  // ──────────────────────────────────────────────────────
  const regCols = db.pragma('table_info(registrations)').map(c => c.name);
  const needsMigration = !regCols.includes('waitlist_position') || !regCols.includes('answers');

  if (regCols.length > 0 && needsMigration) {
    // Table exists but lacks new columns — recreate
    db.exec('DROP TABLE IF EXISTS registrations');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      is_paid BOOLEAN DEFAULT 0,
      ticket_price REAL DEFAULT 0,
      payment_screenshot TEXT,
      status TEXT NOT NULL DEFAULT 'confirmed',
      rejection_reason TEXT,
      waitlist_position INTEGER,
      promoted_at DATETIME,
      promotion_expires_at DATETIME,
      preferred_event INTEGER DEFAULT 0,
      answers TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, user_id)
    )
  `);

  // ──────────────────────────────────────────────────────
  //  Safe migrations for columns added after initial
  //  CREATE TABLE (idempotent — ignores if already there)
  // ──────────────────────────────────────────────────────
  const safeAlter = (sql) => {
    try { db.exec(sql); } catch (_) { /* column already exists */ }
  };

  // Users table additions
  safeAlter('ALTER TABLE users ADD COLUMN year TEXT');
  safeAlter('ALTER TABLE users ADD COLUMN department TEXT');

  // Events table additions
  safeAlter('ALTER TABLE events ADD COLUMN eligible_years TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN eligible_departments TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN custom_questions TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN demo_mode INTEGER DEFAULT 0');
  safeAlter('ALTER TABLE events ADD COLUMN certificate_template TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN certificates_issued INTEGER DEFAULT 0');
  safeAlter('ALTER TABLE events ADD COLUMN is_ended INTEGER DEFAULT 0');

  // Registrations table additions
  safeAlter('ALTER TABLE registrations ADD COLUMN ticket_token TEXT');
  safeAlter('ALTER TABLE registrations ADD COLUMN checked_in INTEGER DEFAULT 0');
  safeAlter('ALTER TABLE registrations ADD COLUMN checked_in_at DATETIME');

  // ──────────────────────────────────────────────────────
  //  Seed data
  // ──────────────────────────────────────────────────────

  // Seed default admin account
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@clubsync.com');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin', 12);
    db.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run('Admin', 'admin@clubsync.com', hashedPassword, 'admin');
    console.log('✅ Default admin account created (admin@clubsync.com / admin)');
  }

  // Seed default clubs if none exist
  const clubCount = db.prepare('SELECT COUNT(*) as count FROM clubs').get().count;
  if (clubCount === 0) {
    const defaultClubs = [
      { name: 'Coding Club', code: 'CODING', description: 'Competitive programming, open source, and hackathons', category: 'Technical' },
      { name: 'Robotics Society', code: 'ROBOTICS', description: 'Hardware prototyping, autonomous systems, and IoT', category: 'Technical' },
      { name: 'Design & Media Guild', code: 'DESIGN', description: 'UI/UX design, visual storytelling, and cinematography', category: 'Creative' },
      { name: 'Cultural Ensemble', code: 'CULTURAL', description: 'Performing arts, musical productions, and drama', category: 'Cultural' },
      { name: 'Sports Council', code: 'SPORTS', description: 'Inter-college tournaments and campus fitness', category: 'Sports' }
    ];

    const insertClub = db.prepare('INSERT INTO clubs (name, code, description, category) VALUES (?, ?, ?, ?)');
    for (const c of defaultClubs) {
      insertClub.run(c.name, c.code, c.description, c.category);
    }
    console.log('✅ Default clubs seeded successfully');
  }

  // Seed default demo organizer account if none exists
  const orgExists = db.prepare('SELECT id FROM users WHERE email = ?').get('organizer@clubsync.com');
  let orgId;
  if (!orgExists) {
    const orgPass = bcrypt.hashSync('organizer123', 12);
    const res = db.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run('Demo Organizer', 'organizer@clubsync.com', orgPass, 'organizer');
    orgId = res.lastInsertRowid;
    console.log('✅ Default organizer account created (organizer@clubsync.com / organizer123)');

    // Assign to first 2 clubs by default so multi-club selection can be tested immediately
    const clubs = db.prepare('SELECT id FROM clubs LIMIT 2').all();
    const assignStmt = db.prepare('INSERT OR IGNORE INTO user_clubs (user_id, club_id) VALUES (?, ?)');
    for (const cl of clubs) {
      assignStmt.run(orgId, cl.id);
    }
  }

  return db;
}

module.exports = { initDatabase, DB_PATH };
