create extension if not exists "pgcrypto";

create table if not exists public.ai_query_pool (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  query text not null,
  normalized_query text,
  lang text,
  source text,
  intent text,
  result text,
  context_pet_id uuid,
  context_pet_name text,
  user_id uuid
);

alter table public.ai_query_pool enable row level security;

drop policy if exists "allow_insert_ai_query_pool" on public.ai_query_pool;
drop policy if exists "allow_select_ai_query_pool_authenticated" on public.ai_query_pool;

create policy "allow_insert_ai_query_pool"
on public.ai_query_pool
for insert
with check (true);

create policy "allow_select_ai_query_pool_authenticated"
on public.ai_query_pool
for select
using (auth.role() = 'authenticated');
