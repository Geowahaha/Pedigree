-- Create pet_photos table if it doesn't exist
create table if not exists public.pet_photos (
    id uuid default gen_random_uuid() primary key,
    pet_id uuid references public.pets(id) on delete cascade not null,
    image_url text not null,
    caption text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.pet_photos enable row level security;

-- Policies
create policy "Public pets photos are viewable by everyone"
    on public.pet_photos for select
    using (true);

create policy "Users can upload photos for their own pets"
    on public.pet_photos for insert
    with check (
        exists (
            select 1 from public.pets
            where pets.id = pet_photos.pet_id
            and pets.owner_id = auth.uid()
        )
    );

create policy "Users can update/delete photos of their own pets"
    on public.pet_photos for all
    using (
        exists (
            select 1 from public.pets
            where pets.id = pet_photos.pet_id
            and pets.owner_id = auth.uid()
        )
    );

-- Add 'view_count' to pets if missing (based on social stats usage)
alter table public.pets add column if not exists view_count bigint default 0;
