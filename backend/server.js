'use strict';

// Load environment variables before anything else
require('dotenv').config();

var express = require('express');
var cors = require('cors');
var { authenticateToken } = require('./middleware/auth');

// ── Express App ────────────────────────────────────────────────
var app = express();

// ── CORS ───────────────────────────────────────────────────────
var frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
app.use(
  cors({
    origin: [frontendUrl, 'http://localhost:4200'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body Parsing ───────────────────────────────────────────────
// We need the raw body for webhook signature verification, so we
// capture it before express.json() parses it.
app.use(
  express.json({
    verify: function (req, _res, buf) {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// ── Request Logging ────────────────────────────────────────────
app.use(function (req, _res, next) {
  var timestamp = new Date().toISOString();
  console.log('[%s] %s %s', timestamp, req.method, req.originalUrl);
  next();
});

// ── Health Check ───────────────────────────────────────────────
app.get('/api/health', function (_req, res) {
  res.json({
    status: 'healthy',
    service: 'yulu-lens-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Public Routes ──────────────────────────────────────────────
var authRoutes = require('./routes/auth');
var webhookRoutes = require('./routes/webhooks');

app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);

// ── Protected Routes ───────────────────────────────────────────
// All routes below this middleware require a valid JWT.
app.use('/api/protected', authenticateToken);

// Protected: Current user profile
app.get('/api/protected/me', function (req, res) {
  res.json({ user: req.user });
});

// Protected: List monitored repositories (mock data for now)
app.get('/api/protected/repos', function (_req, res) {
  res.json({
    repositories: [
      {
        id: 1,
        name: 'frontend-app',
        fullName: 'harshthakur3/frontend-app',
        language: 'TypeScript',
        openPRs: 3,
        lastReview: '2026-06-22T10:30:00Z',
        status: 'active',
      },
      {
        id: 2,
        name: 'api-gateway',
        fullName: 'harshthakur3/api-gateway',
        language: 'JavaScript',
        openPRs: 1,
        lastReview: '2026-06-21T14:15:00Z',
        status: 'active',
      },
      {
        id: 3,
        name: 'data-pipeline',
        fullName: 'harshthakur3/data-pipeline',
        language: 'Python',
        openPRs: 5,
        lastReview: '2026-06-23T08:45:00Z',
        status: 'active',
      },
      {
        id: 4,
        name: 'infrastructure',
        fullName: 'harshthakur3/infrastructure',
        language: 'HCL',
        openPRs: 0,
        lastReview: '2026-06-20T16:00:00Z',
        status: 'paused',
      },
    ],
  });
});

// Protected: Trigger a manual sync for a repository
app.post('/api/protected/repos/:repoId/sync', function (req, res) {
  var repoId = req.params.repoId;
  console.log('[Yulu-Lens] 🔄  Manual sync triggered for repo ID: %s by user: %s', repoId, req.user.login);
  res.json({
    status: 'sync_triggered',
    repoId: repoId,
    triggeredAt: new Date().toISOString(),
    message: 'Repository sync has been queued.',
  });
});

// ── 404 Handler ────────────────────────────────────────────────
app.use(function (_req, res) {
  res.status(404).json({ error: 'Not Found' });
});

// ── Global Error Handler ───────────────────────────────────────
app.use(function (err, _req, res, _next) {
  console.error('[Yulu-Lens] ✖  Unhandled error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message,
  });
});

// ── Start Server ───────────────────────────────────────────────
var PORT = parseInt(process.env.PORT, 10) || 3000;

app.listen(PORT, function () {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════╗');
  console.log('  ║                                           ║');
  console.log('  ║   🔍  Yulu-Lens API Server                ║');
  console.log('  ║   📡  http://localhost:' + PORT + '               ║');
  console.log('  ║   🌍  Environment: ' + (process.env.NODE_ENV || 'development') + '          ║');
  console.log('  ║                                           ║');
  console.log('  ╚═══════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
