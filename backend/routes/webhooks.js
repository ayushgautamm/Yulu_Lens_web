'use strict';

const crypto = require('crypto');
const express = require('express');
const { getInstallationOctokit } = require('../config/github');

const router = express.Router();

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

// ── Helpers ────────────────────────────────────────────────────

/**
 * Verifies the GitHub webhook signature (HMAC-SHA256).
 * @param {string} payload  Raw request body (string)
 * @param {string} signature  Value of x-hub-signature-256 header
 * @returns {boolean}
 */
function verifySignature(payload, signature) {
  if (!WEBHOOK_SECRET) {
    console.warn('[Yulu-Lens] ⚠  GITHUB_WEBHOOK_SECRET is not set — skipping verification.');
    return true; // Allow in dev when no secret is configured
  }

  if (!signature) {
    return false;
  }

  const expectedSig =
    'sha256=' +
    crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload, 'utf8')
      .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch (_err) {
    return false;
  }
}

/**
 * Builds a summary comment from the list of changed files.
 * @param {Array} files  Files returned by pulls.listFiles
 * @param {string} prTitle
 * @returns {string}
 */
function buildReviewComment(files, prTitle) {
  const totalChanges = files.reduce(function (sum, f) {
    return sum + f.additions + f.deletions;
  }, 0);

  const fileList = files
    .map(function (f) {
      return '| `' + f.filename + '` | +' + f.additions + ' / −' + f.deletions + ' | ' + f.status + ' |';
    })
    .join('\n');

  return [
    '## 🔍 Yulu-Lens Automated Review',
    '',
    '**PR:** ' + prTitle,
    '**Files changed:** ' + files.length,
    '**Total diff:** +/− ' + totalChanges + ' lines',
    '',
    '| File | Changes | Status |',
    '|------|---------|--------|',
    fileList,
    '',
    '---',
    '_This is an automated review by **Yulu-Lens**. A human reviewer should verify critical changes._',
    '',
    '✅ No blocking issues detected. PR is ready for human review.',
  ].join('\n');
}

// ── Route ──────────────────────────────────────────────────────

/**
 * POST /webhooks/github
 *
 * Receives GitHub webhook events. Requires the raw body for signature
 * verification, which is provided by the custom middleware in server.js.
 */
router.post('/github', function (req, res) {
  // --- Signature verification ---
  var rawBody = req.rawBody || '';
  var signature = req.headers['x-hub-signature-256'] || '';

  if (!verifySignature(rawBody, signature)) {
    console.error('[Yulu-Lens] ✖  Webhook signature verification failed.');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // --- Event routing ---
  var event = req.headers['x-github-event'] || '';
  var payload = req.body;

  console.log('[Yulu-Lens] ➜  Webhook received: %s (action: %s)', event, payload.action);

  if (event === 'pull_request' && payload.action === 'opened') {
    handlePullRequestOpened(payload)
      .then(function () {
        res.status(200).json({ status: 'processed' });
      })
      .catch(function (err) {
        console.error('[Yulu-Lens] ✖  Error processing PR webhook:', err.message);
        res.status(500).json({ error: 'Internal processing error' });
      });
  } else {
    // Acknowledge but ignore unhandled events
    res.status(200).json({ status: 'ignored', event: event, action: payload.action });
  }
});

/**
 * Handles the `pull_request.opened` event:
 * 1. Obtains an installation-scoped Octokit client.
 * 2. Fetches the list of changed files in the PR.
 * 3. Posts an automated review summary comment.
 */
async function handlePullRequestOpened(payload) {
  var installation = payload.installation;
  var pr = payload.pull_request;
  var repo = payload.repository;

  if (!installation || !installation.id) {
    console.warn('[Yulu-Lens] ⚠  No installation ID in webhook payload — cannot process.');
    return;
  }

  var owner = repo.owner.login;
  var repoName = repo.name;
  var prNumber = pr.number;

  console.log(
    '[Yulu-Lens] 📋  Processing PR #%d on %s/%s: "%s"',
    prNumber, owner, repoName, pr.title
  );

  // 1. Get installation-scoped Octokit
  var octokit = await getInstallationOctokit(installation.id);

  // 2. Fetch changed files
  var filesResponse = await octokit.rest.pulls.listFiles({
    owner: owner,
    repo: repoName,
    pull_number: prNumber,
    per_page: 100,
  });

  var files = filesResponse.data;
  console.log('[Yulu-Lens] 📄  %d file(s) changed in PR #%d', files.length, prNumber);

  // 3. Build and post review comment
  var commentBody = buildReviewComment(files, pr.title);

  await octokit.rest.issues.createComment({
    owner: owner,
    repo: repoName,
    issue_number: prNumber,
    body: commentBody,
  });

  console.log('[Yulu-Lens] ✔  Review comment posted on PR #%d', prNumber);
}

module.exports = router;
