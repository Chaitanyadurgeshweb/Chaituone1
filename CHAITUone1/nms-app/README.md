# Chaitu-TX-NMS — Vercel Deployment

Network Management System Analyzer — converts locomotive trial section data into an updated Excel roster.

## Deploy to Vercel (3 steps)

1. Upload this folder to a GitHub repository
2. Import the repository at [vercel.com/new](https://vercel.com/new)
3. Add the environment variables below, then click **Deploy**

Vercel auto-detects Vite. No manual build settings are required.

---

## Required Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Description | Example |
|---|---|---|
| `ADMIN_USERNAME` | Admin login username | `Chaitu` |
| `ADMIN_PASSWORD` | Admin login password | `YourSecurePassword` |
| `JWT_SECRET` | Long random string for signing tokens | `s3cr3t-r@ndom-str1ng-here` |

> **Generate a strong JWT_SECRET** — run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` in any terminal.

---

## Local Development

```bash
npm install
cp .env.example .env          # fill in your values
npm run dev                   # starts API on :3001 + Vite on :5173
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
nms-app/
├── api/
│   └── index.ts            ← Vercel serverless entry (wraps Express)
├── server/
│   ├── app.ts              ← Express app configuration
│   ├── dev.ts              ← Local dev server entry
│   ├── lib/
│   │   ├── jwt.ts          ← JWT sign / verify / middleware
│   │   ├── storage.ts      ← In-memory user store
│   │   └── nms-processor.ts← Excel processing logic
│   └── routes/
│       ├── auth.ts         ← POST /api/auth/login|logout, GET /api/auth/me
│       ├── users.ts        ← CRUD /api/users (admin only)
│       ├── nms.ts          ← POST /api/process-nms (file upload + processing)
│       └── health.ts       ← GET /api/healthz
├── src/
│   ├── App.tsx             ← Root with auth state
│   ├── components/
│   │   ├── LoginPage.tsx
│   │   ├── NmsUpload.tsx   ← Main NMS form (functional)
│   │   └── AdminPanel.tsx  ← User management (admin only)
│   └── lib/api.ts          ← Fetch helpers with JWT headers
├── vercel.json             ← Routes /api/* → serverless, rest → SPA
└── .env.example
```

---

## API Endpoints

All `/api/*` routes are handled by the Express serverless function.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Returns JWT token |
| `POST` | `/api/auth/logout` | None | Client-side token clear |
| `GET` | `/api/auth/me` | Bearer | Current user info |
| `GET` | `/api/users` | Admin | List managed users |
| `POST` | `/api/users` | Admin | Create user |
| `PUT` | `/api/users/:id` | Admin | Update user |
| `DELETE` | `/api/users/:id` | Admin | Delete user |
| `POST` | `/api/process-nms` | Bearer | Upload files → download Excel |
| `GET` | `/api/healthz` | None | Health check |

---

## Known Limitations on Vercel

### User data does not persist between deploys / cold starts
The user store is in-memory. Created users are lost when Vercel restarts or redeploys the function. The admin account (from env vars) always works.

**To fix:** Replace `server/lib/storage.ts` with a database adapter — [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Supabase](https://supabase.com), or [PlanetScale](https://planetscale.com) all work well.

### File size limit (4.5 MB default)
Vercel Hobby plan limits request bodies to 4.5 MB. If your Excel files exceed this, upgrade to Vercel Pro (250 MB limit) or process files client-side before upload.

### Sessions replaced by JWT
The original Replit app used server-side sessions. This version uses JWT tokens stored in `localStorage`. Tokens expire after 24 hours.

---

## Changes from Replit Version

| Change | Reason |
|---|---|
| Removed pnpm workspace / monorepo structure | Vercel works best with a single-package project |
| Removed `.replit`, `replit.nix`, `.replitignore` | Replit-specific — not needed on Vercel |
| Replaced `express-session` with JWT (`jsonwebtoken`) | Sessions don't survive serverless cold starts |
| Replaced JSON file storage with in-memory store | Vercel filesystem is ephemeral |
| Admin credentials moved to env vars | No hardcoded secrets in code |
| Added `vercel.json` routing | Routes `/api/*` to serverless, rest to Vite SPA |
| Added functional frontend | Original had UI mockups; this wires them to the real API |
| Removed `@workspace/*` internal packages | Inlined into single package |
| Removed `pino-pretty` transport in production | Worker threads unsupported in Vercel serverless |
