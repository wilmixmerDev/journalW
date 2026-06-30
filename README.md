# Journal W — Trading Journal

A professional trading journal built with Next.js, TypeScript, Tailwind CSS, and Supabase. Designed to be deployed on Vercel and fully responsive across desktop, tablet, and mobile.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 + shadcn/ui (Base UI registry)
- **Database/Auth**: Supabase (PostgreSQL + Row Level Security)
- **Charts**: Recharts
- **Forms**: react-hook-form + Zod
- **State**: Zustand
- **Theme**: next-themes

---

## Getting Started Locally

### 1. Clone and install

```bash
git clone <your-repo-url>
cd journaleW
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Demo mode**: If you leave the placeholder values, the app runs fully in demo mode with seeded mock data — no Supabase connection required. Useful for local development and UI iteration.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the dashboard in demo mode.

---

## Supabase Setup

### Create the project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Copy the **Project URL** and **anon public key** from **Project Settings → API**.
3. Paste them into `.env.local`.

### Run the SQL migration

In the Supabase dashboard go to **SQL Editor** and run the contents of:

```
supabase/schema.sql
```

This creates:
- `public.trades` table with all required columns
- Indexes for fast filtering by user, date, and status
- Row Level Security policies (each user only sees their own trades)
- A `trade-screenshots` storage bucket with RLS policies
- An `updated_at` auto-trigger

### Regenerate TypeScript types (optional)

After setting up the schema you can regenerate the type file for full type safety:

```bash
npx supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts
```

### Enable Google OAuth (optional)

In the Supabase dashboard go to **Authentication → Providers → Google** and follow the instructions to enable Google sign-in. The login page will show the Google button automatically.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Import into Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Select your repository.
3. Add the following environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` |

4. Click **Deploy**. Vercel auto-detects Next.js — no build config needed.

### 3. Set the Supabase redirect URL

In Supabase go to **Authentication → URL Configuration** and add your Vercel URL to the **Redirect URLs** list:

```
https://your-app.vercel.app/auth/callback
```

---

## Features

| Page | Description |
|---|---|
| `/dashboard` | Hero KPIs, equity curve, recent trades table |
| `/trades` | Full trades list with status/market/session filters |
| `/analytics` | Expectancy, profit factor, R-distribution, breakdowns by session/strategy/weekday |
| `/calendar` | Monthly P&L heatmap calendar with month-level stats |
| `/login` | Email/password + Google OAuth |

### Live / Backtest switcher

The sidebar contains a toggle that switches the entire app between your **Live** journal and your **Backtest** journal. All pages react instantly — no page reload required.

### Light / Dark theme

The theme toggle in the sidebar persists across sessions via `next-themes`.

---

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app shell
│   │   ├── dashboard/
│   │   ├── trades/
│   │   ├── analytics/
│   │   └── calendar/
│   ├── login/
│   └── auth/callback/
├── components/
│   ├── app-shell/          # Sidebar, mobile header/nav, journal switcher
│   ├── charts/             # Recharts wrappers
│   ├── shared/             # MetricCard and other reusable UI
│   ├── trades/             # NewTradeDialog, TradeDetailSheet
│   └── ui/                 # shadcn/ui components
├── hooks/
├── lib/
│   ├── supabase/           # Browser/server clients, config helper
│   ├── format.ts           # es-ES locale formatters
│   ├── metrics.ts          # computeMetrics, buildEquityCurve, etc.
│   ├── mock-trades.ts      # Seeded mock data generator
│   └── trades-data.ts      # getTrades / getAllJournals (demo-mode aware)
├── proxy.ts                # Next.js middleware (auth + session refresh)
├── store/                  # Zustand stores
└── types/                  # Trade, Supabase DB types
supabase/
└── schema.sql              # SQL migration to run in Supabase dashboard
```
