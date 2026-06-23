'use strict';

var express = require('express');
var jwt = require('jsonwebtoken');
var fetch = require('node-fetch');
var { createUserOctokit } = require('../config/github');
var { JWT_SECRET } = require('../middleware/auth');

var router = express.Router();

var CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Iv23li0EigVw5zkvDppy';
var CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
var FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// ── In-memory user store (mock) ────────────────────────────────
// In production, replace with a real database.
var users = {};

/**
 * GET /auth/github
 *
 * Redirects the user to GitHub's OAuth authorization page.
 */
router.get('/github', function (_req, res) {
  var scopes = 'read:user,user:email,repo';
  var redirectUri = encodeURIComponent(
    (process.env.BACKEND_URL || 'http://localhost:3000') + '/api/auth/github/callback'
  );

  var authorizeUrl =
    'https://github.com/login/oauth/authorize' +
    '?client_id=' + CLIENT_ID +
    '&scope=' + scopes +
    '&redirect_uri=' + redirectUri;

  res.redirect(authorizeUrl);
});

/**
 * GET /auth/github/callback
 *
 * GitHub redirects here after the user authorises. We:
 *  1. Exchange the temporary code for an access token.
 *  2. Fetch the GitHub user profile.
 *  3. Upsert the user in our mock store.
 *  4. Sign and return a JWT, then redirect to the frontend.
 */
router.get('/github/callback', function (req, res) {
  var code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code.' });
  }

  // 1. Exchange code for access token
  fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
    }),
  })
    .then(function (tokenRes) {
      return tokenRes.json();
    })
    .then(function (tokenData) {
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      var accessToken = tokenData.access_token;

      // 2. Fetch user profile from GitHub
      var octokit = createUserOctokit(accessToken);

      return octokit.rest.users.getAuthenticated().then(function (userRes) {
        return { profile: userRes.data, accessToken: accessToken };
      });
    })
    .then(function (result) {
      var profile = result.profile;
      var accessToken = result.accessToken;

      // 3. Upsert user in mock store
      var user = {
        id: profile.id,
        login: profile.login,
        name: profile.name || profile.login,
        avatarUrl: profile.avatar_url,
        email: profile.email || '',
        githubAccessToken: accessToken,
        lastLogin: new Date().toISOString(),
      };

      users[profile.id] = user;
      console.log('[Yulu-Lens] ✔  User authenticated: %s (ID: %d)', user.login, user.id);

      // 4. Sign JWT
      var token = jwt.sign(
        {
          sub: user.id,
          login: user.login,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Redirect to frontend with the token
      res.redirect(FRONTEND_URL + '/dashboard?token=' + token);
    })
    .catch(function (err) {
      console.error('[Yulu-Lens] ✖  OAuth callback error:', err.message);
      res.status(500).json({
        error: 'Authentication failed',
        message: err.message,
      });
    });
});

/**
 * GET /auth/me
 *
 * Returns the current user profile from the JWT.
 * Protected by the auth middleware (applied in server.js).
 */
router.get('/me', function (req, res) {
  var userId = req.user && req.user.sub;
  var storedUser = users[userId];

  res.json({
    user: storedUser || {
      id: req.user.sub,
      login: req.user.login,
      name: req.user.name,
      avatarUrl: req.user.avatarUrl,
    },
  });
});

module.exports = router;
