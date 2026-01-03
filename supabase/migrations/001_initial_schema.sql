-- IndiaFundTrack initial schema

create extension if not exists "unaccent";
create extension if not exists "pg_trgm";

-- Sectors lookup table
create table if not exists sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz default now()
);

-- Investors table
create table if not exists investors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type text not null default 'Other' check (type in ('VC', 'Angel', 'Corporate', 'Family Office', 'Government', 'Other')),
  website text,
  created_at timestamptz default now()
);

-- Deals table (core)
create table if not exists deals (
  id text primary key,
  company text not null,
  company_url text,
  amount_inr numeric not null default 0,
  amount_usd numeric not null default 0,
  stage text not null,
  sectors text[] not null default '{}',
  investors text[] not null default '{}',
  lead_investor text,
  deal_date date not null,
  location text not null,
  description text,
  source_url text,
  week_folder text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Deal submissions (community-submitted, pending moderation)
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  company_url text,
  amount numeric,
  amount_currency text not null default 'INR' check (amount_currency in ('INR', 'USD')),
  stage text not null,
  sectors text[] not null default '{}',
  investors text[] not null default '{}',
  city text not null,
  deal_date date not null,
  source_url text not null,
  submitted_by text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  reviewed_at timestamptz,
  submitted_at timestamptz default now()
);
