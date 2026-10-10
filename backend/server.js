require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const clubsRoutes = require('./routes/clubs');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' })); // Support base64 image/file uploads

// Initialize Database and attach to app so routes can access it
const db = initDatabase();
app.set('db', db);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/clubs', clubsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ClubSync API is running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start promotion worker
const { startPromotionWorker } = require('./workers/promotionWorker');
startPromotionWorker(db);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
