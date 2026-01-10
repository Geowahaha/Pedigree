-- Force enable pgvector
create extension if not exists vector;

-- Ensure column exists (explicitly)
alter table public.pets add column if not exists description_embedding vector(768);

-- DROP and RECREATE the function to ensure plain text definition survives
drop function if exists public.match_pets;

create or replace function public.match_pets (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  name text,
  breed text,
  description text,
  similarity float
)
language plpgsql
security definer -- Make it accessible bypassing RLS for the search itself (safe for reading public data)
as $$
begin
  return query
  select
    pets.id,
    pets.name,
    pets.breed,
    pets.description,
    1 - (pets.description_embedding <=> query_embedding) as similarity
  from public.pets
  where 1 - (pets.description_embedding <=> query_embedding) > match_threshold
  order by pets.description_embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Explicitly grant execute permission to anonymous and authenticated users
grant execute on function public.match_pets to anon, authenticated, service_role;

-- Notify pgrst to reload schema cache
NOTIFY pgrst, 'reload config';
