# Kinetix Marketing Automation Platform

Kinetix is a unified marketing automation dashboard built with Next.js 14, Supabase, and Tailwind CSS. It centralizes Meta Ads management, Newsletter campaigns, and Outreach processes into a single, cohesive interface.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (`npm install -g supabase`)
- A [Supabase](https://supabase.com/) account and project.

---

## 🚀 Project Setup & Installation

Follow these steps exactly to get the project running on your local machine.

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy the example environment file to create your local environment file:
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in your actual Supabase credentials. You can find these in your Supabase Dashboard under **Project Settings > API**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Required for the seed script)

### 3. Database Setup (Supabase & Prisma)

We manage our database schema using Supabase Migrations, but we use **Prisma** as our ORM to interact with the database from our Next.js application.

**Step 3a: Login to Supabase CLI**
```bash
npx supabase login
```

**Step 3b: Link your project**
Find your Reference ID in your Supabase dashboard URL.
```bash
npx supabase link --project-ref <YOUR_REFERENCE_ID>
```

**Step 3c: Push the Schema**
Push all local migrations to your remote Supabase database:
```bash
npx supabase db push
```

**Step 3d: Sync Prisma Schema**
We need to generate our Prisma client based on the Supabase schema. Make sure you add `DATABASE_URL` and `DIRECT_URL` to your `.env.local` using the Supabase connection strings, then run:
```bash
npx prisma db pull
npx prisma generate
```

### 4. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

---

## 📁 Project Structure

Here is a detailed breakdown of the repository structure:

```text
kinetix/
├── src/
│   ├── app/                # Next.js App Router (Pages, Layouts, API Routes)
│   │   ├── (app)/          # Protected dashboard routes (requires authentication)
│   │   ├── (auth)/         # Public authentication routes (login/signup)
│   │   └── api/            # Serverless API endpoints
│   ├── components/         # Shared, generic UI components (Shadcn UI buttons, inputs, modals)
│   ├── config/             # Application-wide configuration (navigation, route constants)
│   ├── hooks/              # Global React hooks (e.g., useAuth)
│   ├── lib/                # Utility functions and external service clients (Supabase setup)
│   ├── modules/            # Domain-driven feature modules (The core logic)
│   │   ├── auth/           # Authentication components and logic
│   │   ├── meta-ads/       # Meta Ads dashboard (Overview, Campaigns, Approval, etc.)
│   │   ├── newsletter/     # Newsletter campaign management and generation
│   │   └── outreach/       # Lead outreach and CRM features
│   ├── services/           # Backend communication and external API services
│   ├── styles/             # Global CSS and Tailwind styling
│   ├── types/              # Global TypeScript interfaces and type definitions
│   └── utils/              # Helper functions and pure utility logic
├── supabase/
│   └── migrations/         # SQL migration files defining the database schema
└── public/                 # Static assets (images, icons, fonts)
```

## 🛠️ Architecture

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Shadcn UI
- **Backend/Database:** Supabase (PostgreSQL), Supabase Auth
- **Data Fetching:** React Query (`@tanstack/react-query`), Supabase JS Client
