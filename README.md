# Samarth SurveyOS

**Land Survey Management System** — a full-stack web application for managing clients, sites, field visits, instruments, account-manager ledgers, invoices, reports, and company settings. Built for production deployment with a React (Vite) frontend and a Node.js (Express) API backed by MongoDB Atlas, Cloudinary file storage, and Brevo SMTP for password-reset OTP email.

---

## Features

- JWT authentication with role-based access (**admin**, **super_admin**)
- Password reset flow with **email OTP** (Brevo SMTP)
- **Dashboard** with scoped metrics by role and instrument
- **Clients & sites** CRUD, **site visits** with photo uploads (Cloudinary)
- **Account manager** transaction ledgers and **reports** export
- **Invoice** PDF generation, **settings** (company branding, bank columns, signatures)
- **Instrument** assignment and peer visibility for survey crews
- **PWA** support (installable, offline-friendly asset caching)
- Security-oriented API: **Helmet**, **CORS**, **rate limiting**, centralized errors, `/api/health`

---

## Tech stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 19, Vite 7, TypeScript, Tailwind CSS 4    |
| Backend   | Node.js (ESM), Express.js                       |
| Database  | MongoDB (Mongoose) — Atlas in production        |
| Files     | Cloudinary                                      |
| Email     | Nodemailer + Brevo SMTP                         |
| Auth      | JWT (HTTP Bearer + optional instrument header) |
| Deploy    | Frontend: **Vercel** · Backend: **Render**      |

---

## Repository layout

```
samarth-surveyos/
├── frontend/          # Vite + React SPA
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   └── vercel.json
├── backend/           # Express API
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── seed/          # Optional dev-only database seeds
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── package.json       # npm workspaces + root scripts
├── render.yaml        # Optional Render Blueprint (API)
└── README.md
```

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 9+ (workspaces)
- **MongoDB** (Atlas URI for production)
- **Cloudinary** account (for uploads)
- **Brevo** SMTP credentials (for OTP email)

---

## Installation

Clone the repository, then install dependencies from the **repository root** (workspaces install `frontend` and `backend`):

```bash
npm install
```

---

## Environment setup

Copy the example files and fill in values **without committing real secrets**:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### Frontend (`frontend/.env`)

| Variable              | Description |
|-----------------------|-------------|
| `VITE_API_BASE_URL`   | Production API origin, e.g. `https://your-api.onrender.com` (no trailing slash). Leave empty for local dev when using the Vite `/api` proxy. |

### Backend (`backend/.env`)

| Variable                            | Description |
|-------------------------------------|-------------|
| `PORT`                              | API port (Render sets `PORT` automatically). |
| `MONGO_URI`                         | MongoDB connection string (`MONGODB_URI` is also supported). |
| `JWT_SECRET`                        | Long random string; **required** in production. |
| `JWT_EXPIRES_IN`                    | JWT lifetime (default `7d`). |
| `FRONTEND_ORIGIN`                   | Comma-separated allowed CORS origins (e.g. `https://app.vercel.app,http://localhost:5173`). |
| `CLOUDINARY_*`                      | Cloudinary cloud name, API key, and API secret. |
| `BREVO_SMTP_*`, `BREVO_FROM_EMAIL`  | Brevo SMTP relay and verified sender. |

See `frontend/.env.example` and `backend/.env.example` for copy-paste templates.

---

## Run locally

**API (from repo root):**

```bash
npm run dev:backend
```

**Vite (from repo root):**

```bash
npm run dev:frontend
```

Or both:

```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- API default: [http://localhost:4000](http://localhost:4000)
- In development, Vite proxies `/api` to `http://localhost:4000` (override with `VITE_API_PROXY_TARGET` in `frontend/.env`).

**Production build (frontend):**

```bash
npm run build
```

The committed files `frontend/public/icons/icon-192.png` and `icon-512.png` are used for the PWA manifest. Cloud hosts (e.g. Render) do **not** run icon generation during build. If you change `frontend/src/assets/logo.jpeg`, regenerate icons locally before committing:

```bash
npm run icons -w frontend
```

**Preview the production build:**

```bash
npm run preview
```

**Start the API in production:**

```bash
npm start
```

(Set `NODE_ENV=production` and all backend env vars on the host.)

---

## Roles: Admin and Super Admin

- **Admin** — day-to-day operations: clients, sites, visits, transactions for assigned account managers, reports, personal settings, password change. Scoped by assigned **instruments** where applicable.
- **Super Admin** — full company control: manage other admins, instruments, company settings, invoice assets, backups, and destructive operations allowed by the API.

Optional **development** seeds live under `backend/seed/` (run only with care; see script comments).

---

## Screens and modules

| Area | Route / module |
|------|----------------|
| Login and session | `/login` |
| Forgot password, OTP, reset | `/forgot-password`, `/verify-reset-otp`, `/reset-password` |
| Dashboard | `/dashboard` |
| Clients and sites | `/clients`, `/sites`, client and site detail flows |
| Site visits | Add/edit visits, photo uploads |
| Reports | `/reports` |
| Invoice | `/invoice` |
| Account manager ledger | `/account-manager`, `/account-manager/:slug` |
| Settings | `/settings` |
| PWA install | `InstallPrompt` component |

---

## API health check

```http
GET /api/health
```

Returns JSON including service id, timestamp, and MongoDB connection state (`db`: `connected`, `connecting`, and so on).

---

## Security notes

- **Never commit** `.env` files; only `.env.example` templates belong in Git.
- Use a **strong `JWT_SECRET`** in production; the server refuses to start in production without it.
- Restrict **MongoDB Atlas** network access appropriately; rotate credentials if exposed.
- Keep **Cloudinary** and **Brevo** keys in the host dashboard only (Render / Vercel environment variables).
- CORS uses `FRONTEND_ORIGIN` (comma-separated list) plus localhost ports in development.
- Rate limits apply to login, password reset, OTP verification, and authenticated API traffic (`backend/middleware/rateLimit.js`).

---

## Deployment guide

### Vercel (frontend)

1. New project: import this GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite**.
4. Build command: `npm run build`. Output directory: `dist`.
5. Environment variable: `VITE_API_BASE_URL` = your public **Render API URL** (no `/api` suffix).
6. Redeploy after any environment change.

### Render (backend)

1. New **Web Service**: same repository.
2. **Root Directory**: `backend`.
3. **Build**: `npm install` — **Start**: `npm start`.
4. Set variables from `backend/.env.example` in the Render dashboard (`MONGO_URI`, `JWT_SECRET`, `FRONTEND_ORIGIN` matching your Vercel URL, Cloudinary, Brevo, `NODE_ENV=production`).
5. Optional: use `render.yaml` as a blueprint; health check path `/api/health`.
6. **MongoDB Atlas**: allow outbound access from Render (see Atlas Network Access; free-tier outbound IPs may change — use Atlas guidance for your security model).

### Cloudinary

Store `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` on Render.

### Brevo SMTP

Verify sender in Brevo; use the **SMTP key** from the Brevo dashboard (not your account login password). Map all `BREVO_*` variables on Render.

---

## Production checklist

- [ ] `.env` files are not in Git; `.gitignore` verified
- [ ] `JWT_SECRET`, `MONGO_URI`, Cloudinary, and Brevo set on Render
- [ ] `VITE_API_BASE_URL` and `FRONTEND_ORIGIN` aligned between Vercel and Render
- [ ] `npm run build` succeeds from repository root
- [ ] `GET /api/health` returns `ok: true` and `db: connected` in production
- [ ] Login and JWT-protected routes work end-to-end
- [ ] Image upload to Cloudinary works
- [ ] Password reset email OTP received
- [ ] Admin vs super_admin permissions smoke-tested
- [ ] Responsive UI on mobile and desktop
- [ ] Production URLs tested (HTTPS, no mixed content)

---

## Git: initialize and push to GitHub

```bash
git init
git add .
git status
git commit -m "chore: production-ready Samarth SurveyOS monorepo"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

If the remote already exists, use `git remote set-url origin https://github.com/YOUR_USER/YOUR_REPO.git`.

---

## Developer contact

**Maintainer:** Your Name / Organization  
**Email:** your.email@example.com  

Replace with real contact details for client delivery.

---

## License

Proprietary — all rights reserved unless otherwise agreed in writing.
