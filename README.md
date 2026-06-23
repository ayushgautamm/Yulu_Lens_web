# 🔍 Yulu-Lens — Automated Code Review Platform

> GitHub App–powered pull request analysis and automated review comments.

**App Owner:** [@harshthakur3](https://github.com/harshthakur3)
**GitHub App ID:** `4121674`
**GitHub Client ID:** `Iv23li0EigVw5zkvDppy`

---

## Architecture

```
┌─────────────────────┐        ┌─────────────────────────┐
│   Angular 11 SPA    │◀──────▶│   Node.js 14 API        │
│   (Port 4200)       │  HTTP  │   (Port 3000)           │
│                     │        │                         │
│  • Dashboard UI     │        │  • /api/auth/*          │
│  • JWT Interceptor  │        │  • /api/webhooks/*      │
│  • Repo monitoring  │        │  • /api/protected/*     │
└─────────────────────┘        └────────────┬────────────┘
                                            │ Webhooks
                                            ▼
                               ┌─────────────────────────┐
                               │       GitHub API         │
                               │                         │
                               │  • OAuth Authentication │
                               │  • Pull Request Events  │
                               │  • Automated Comments   │
                               └─────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js v14.x
- npm v6+

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your secrets
# Place your GitHub App private key at ./yulu-lens-private-key.pem
npm install
npm start
# → http://localhost:3000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
# → http://localhost:4200
```

### 3. GitHub App Configuration

1. **Webhook URL:** Point to `https://your-domain.com/api/webhooks/github`
2. **Webhook Secret:** Match `GITHUB_WEBHOOK_SECRET` in your `.env`
3. **Permissions:** `Pull requests: Read`, `Issues: Write`, `Contents: Read`
4. **Events:** Subscribe to `Pull request`

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| GET | `/api/auth/github` | — | Initiate OAuth login |
| GET | `/api/auth/github/callback` | — | OAuth callback |
| POST | `/api/webhooks/github` | HMAC | GitHub webhook receiver |
| GET | `/api/protected/me` | JWT | Current user profile |
| GET | `/api/protected/repos` | JWT | List monitored repos |
| POST | `/api/protected/repos/:id/sync` | JWT | Trigger manual sync |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Angular | 11.0.x |
| **Backend** | Node.js / Express | 14.x / 4.18.x |
| **GitHub SDK** | @octokit/app + @octokit/rest | 13.x / 19.x |
| **Auth** | JWT (jsonwebtoken) | 9.x |

---

## License

MIT © [@harshthakur3](https://github.com/harshthakur3)
