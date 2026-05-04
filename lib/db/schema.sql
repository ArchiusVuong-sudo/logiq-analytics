-- LogIQ AI Schema (run once in Supabase SQL Editor)

create extension if not exists "uuid-ossp";

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  client_id text not null,
  order_id text not null unique,
  order_date date not null,
  delivery_date date,
  carrier text not null,
  origin_city text,
  destination_city text,
  status text not null,
  sku text not null,
  product_category text not null,
  quantity integer not null default 1,
  unit_price_usd numeric(12,2),
  order_value_usd numeric(14,2) not null default 0,
  is_promo boolean not null default false,
  promo_discount_pct numeric(6,2) default 0,
  region text,
  warehouse text,
  inserted_at timestamptz not null default now()
);

create index if not exists orders_order_date_idx on public.orders(order_date);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_carrier_idx on public.orders(carrier);
create index if not exists orders_category_idx on public.orders(product_category);
create index if not exists orders_region_idx on public.orders(region);
create index if not exists orders_sku_idx on public.orders(sku);

create table if not exists public.threads (
  id uuid primary key default uuid_generate_v4(),
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  role text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx on public.messages(thread_id, created_at);

create table if not exists public.canvas_blocks (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid references public.threads(id) on delete cascade,
  kind text not null,
  payload jsonb not null,
  layout jsonb,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists canvas_thread_idx on public.canvas_blocks(thread_id, created_at);

create table if not exists public.trained_models (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  kind text not null,
  spec jsonb not null,
  metrics jsonb,
  created_at timestamptz not null default now()
);
