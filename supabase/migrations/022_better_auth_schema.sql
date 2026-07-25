-- Better Auth owns identity and sessions in a schema that is not exposed by
-- Supabase's Data API. Keep this schema in sync with the pinned better-auth
-- package when upgrading.
create schema if not exists better_auth;

create table if not exists better_auth."user" (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists better_auth."session" (
  id uuid primary key default gen_random_uuid(),
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid not null references better_auth."user"(id) on delete cascade
);

create index if not exists better_auth_session_user_id_idx
  on better_auth."session"("userId");

create table if not exists better_auth."account" (
  id uuid primary key default gen_random_uuid(),
  "accountId" text not null,
  "providerId" text not null,
  "userId" uuid not null references better_auth."user"(id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists better_auth_account_user_id_idx
  on better_auth."account"("userId");

create table if not exists better_auth."verification" (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists better_auth_verification_identifier_idx
  on better_auth."verification"(identifier);

-- A dedicated runtime role should receive access only to this schema. Replace
-- `better_auth_runtime` with the role used by DATABASE_URL when provisioning.
-- grant usage on schema better_auth to better_auth_runtime;
-- grant select, insert, update, delete on all tables in schema better_auth to better_auth_runtime;
