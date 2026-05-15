# SecureData Vault (https://securevault-utvv.onrender.com)

> **Academic midterm project — Web Security & Vulnerability Mitigation**

Side-by-side demonstration of OWASP Top 10 vulnerabilities vs hardened mitigations, with an encrypted data vault, audit logging, rule-based risk scoring, and a security analytics dashboard.

**Author:** [weamon17](https://github.com/weamon17)  

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18+, Express 4, better-sqlite3 |
| Auth | JWT in HttpOnly cookie, CSRF double-submit |
| Encryption | AES-256-GCM (at rest) |
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Charts | Chart.js 4 + react-chartjs-2 |

---

## Quick Start

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Điền ENCRYPTION_KEY và JWT_SECRET vào .env
```

Generate keys:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Seed database

```bash
cd server
npm run db:seed
```

### 4. Start

```bash
# Terminal 1 — backend (port 4000)
cd server && npm run dev

# Terminal 2 — frontend (port 5173)
cd client && npm run dev
```

Open **http://localhost:5173**

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@securevault.local` | `Admin123!` |
| User | `user@securevault.local` | `User123!` |

---

## Features

### Vulnerability Lab (`/lab`)

| Demo | Vulnerability | Mitigation |
|------|--------------|------------|
| SQL Injection | Raw string concat + UNION SELECT | Prepared statements |
| XSS | Stored + Reflected via `innerHTML` | `escapeHtml()` + DOMPurify + CSP |
| CSRF | No token, accepts GET | Double-submit cookie + POST-only |
| IDOR | No ownership check | `WHERE id=? AND user_id=?` |
| CSP | No security headers | Helmet strict CSP |

### Encrypted Vault (`/vault`)

- AES-256-GCM encryption at rest (IV + auth tag in base64)
- Requires login (JWT HttpOnly cookie)
- Ownership check on every query

### Audit Log + Risk Scoring

- Every security event logged with `risk_score` (0–100) and `severity`
- Requests with score ≥ 51 blocked on hardened routes
- Admin-only dashboard with Bar / Doughnut / Line charts

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ENCRYPTION_KEY` | **Required.** 64 hex chars (32 bytes) |
| `JWT_SECRET` | **Required.** Long random string |
| `NODE_ENV` | `development` / `production` |
| `PORT` | Default `4000` |
| `LAB_MODE` | `true` enables `/api/vulnerable` |
| `BCRYPT_ROUNDS` | Default `12` |

---

## Deploy (Render.com)

```bash
# Build command
cd client && npm ci && npm run build && cd ../server && npm ci --omit=dev

# Start command
node server/db/seed.js && node server/server.js
```

Set `ENCRYPTION_KEY` and `JWT_SECRET` in Render Environment tab.

---

## Author

| | |
|--|--|
| **GitHub** | [@weamon17](https://github.com/weamon17) |
