create table if not exists public.ai_video_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  model_version text,
  created_at timestamptz not null default now()
);

create index if not exists ai_video_usage_user_id_created_at_idx
  on public.ai_video_usage (user_id, created_at desc);

alter table public.ai_video_usage enable row level security;

drop policy if exists "Users can view own ai video usage" on public.ai_video_usage;
create policy "Users can view own ai video usage"
  on public.ai_video_usage
  for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can view ai video usage" on public.ai_video_usage;
create policy "Admins can view ai video usage"
  on public.ai_video_usage
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
