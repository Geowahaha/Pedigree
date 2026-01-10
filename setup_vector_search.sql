-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Add a vector column to the pets table (Gemini embeddings are 768 dimensions)
alter table pets add column if not exists description_embedding vector(768);

-- Create an index for faster queries (IVFFlat) - Optional but good for performance later
-- create index on pets using ivfflat (description_embedding vector_cosine_ops)
-- with (lists = 100);

-- Create a function to search for pets
create or replace function match_pets (
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
as $$
begin
  return query
  select
    pets.id,
    pets.name,
    pets.breed,
    pets.description,
    1 - (pets.description_embedding <=> query_embedding) as similarity
  from pets
  where 1 - (pets.description_embedding <=> query_embedding) > match_threshold
  order by pets.description_embedding <=> query_embedding
  limit match_count;
end;
$$;
