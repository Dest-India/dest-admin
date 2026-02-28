## Dest Admin

Dest Admin is the upcoming control center for Dest. This workspace mirrors the conventions used in dest-user and dest-partners and will evolve to cover:

- OTP-protected admin access
- Partner verification workflows
- Customer and order management
- Analytics and support tooling

## Stack

- Next.js App Router (JavaScript)
- Tailwind CSS v4 with shadcn-inspired design system
- Supabase (planned data source)

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment template and set credentials:

   ```bash
   cp .env.example .env.local
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

## Environment Keys

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ADMIN_LOGIN_EMAIL`
- `NEXT_PUBLIC_ADMIN_OTP_SENDER`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

## Required Supabase Tables

Create lightweight tables to manage OTP state and admin sessions:

```sql
create table if not exists admin_otps (
   id uuid primary key default gen_random_uuid(),
   email text not null,
   code_hash text not null,
   expires_at timestamptz not null,
   consumed boolean not null default false,
   created_at timestamptz not null default now()
);

create index if not exists admin_otps_email_idx
   on admin_otps (email);

create table if not exists admin_sessions (
   id uuid primary key default gen_random_uuid(),
   token_hash text not null,
   expires_at timestamptz not null,
   revoked boolean not null default false,
   created_at timestamptz not null default now()
);

create index if not exists admin_sessions_token_hash_idx
   on admin_sessions (token_hash);
```
