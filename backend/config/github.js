'use strict';

const fs = require('fs');
const path = require('path');
const { App } = require('@octokit/app');
const { Octokit } = require('@octokit/rest');

// ── Configuration ──────────────────────────────────────────────
const APP_ID = process.env.GITHUB_APP_ID || '4121674';
const PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH || './yulu-lens-private-key.pem';

/**
 * Reads the GitHub App private key from the local filesystem.
 * Returns an empty string if the file does not exist (allows server to boot
 * in dev mode without the key present).
 */
function loadPrivateKey() {
  const resolvedPath = path.resolve(PRIVATE_KEY_PATH);
  try {
    return fs.readFileSync(resolvedPath, 'utf8');
  } catch (err) {
    console.warn(
      '[Yulu-Lens] ⚠  Private key not found at "%s". GitHub App features will be unavailable.',
      resolvedPath
    );
    return '';
  }
}

const privateKey = loadPrivateKey();

// ── GitHub App Instance ────────────────────────────────────────
let app = null;
if (privateKey) {
  app = new App({
    appId: APP_ID,
    privateKey: privateKey,
    Octokit: Octokit,
  });
  console.log('[Yulu-Lens] ✔  GitHub App initialised (ID: %s)', APP_ID);
} else {
  console.warn('[Yulu-Lens] ⚠  GitHub App not initialised — private key missing.');
}

/**
 * Returns an Octokit instance scoped to a specific installation.
 * @param {number} installationId
 * @returns {Promise<InstanceType<typeof Octokit>>}
 */
async function getInstallationOctokit(installationId) {
  if (!app) {
    throw new Error('GitHub App is not initialised. Provide a valid private key.');
  }
  const installationAccessToken = await app.octokit.request(
    'POST /app/installations/{installation_id}/access_tokens',
    { installation_id: installationId }
  );
  return new Octokit({ auth: installationAccessToken.data.token });
}

/**
 * Creates a basic Octokit REST client authenticated with a personal access token.
 * Useful for user-level API calls after OAuth.
 * @param {string} token
 * @returns {InstanceType<typeof Octokit>}
 */
function createUserOctokit(token) {
  return new Octokit({ auth: token });
}

module.exports = {
  app,
  getInstallationOctokit,
  createUserOctokit,
  APP_ID,
};
