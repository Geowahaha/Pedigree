-- Enforce duplicate checks and lineage date sanity for pets.
-- Unique indexes only created when no duplicates exist.

create index if not exists pets_registration_number_norm_idx
  on pets ((lower(trim(registration_number))))
  where registration_number is not null;

create index if not exists pets_owner_name_norm_idx
  on pets (owner_id, (lower(trim(name))))
  where name is not null;

do $$
begin
  if not exists (
    select 1
    from pets
    where registration_number is not null
    group by lower(trim(registration_number))
    having count(*) > 1
  ) then
    execute 'create unique index if not exists pets_registration_number_unique_idx on pets ((lower(trim(registration_number)))) where registration_number is not null';
  else
    raise notice 'Duplicate registration numbers found. Unique index not created.';
  end if;

  if not exists (
    select 1
    from pets
    where owner_id is not null and name is not null
    group by owner_id, lower(trim(name))
    having count(*) > 1
  ) then
    execute 'create unique index if not exists pets_owner_name_unique_idx on pets (owner_id, (lower(trim(name)))) where name is not null';
  else
    raise notice 'Duplicate pet names per owner found. Unique index not created.';
  end if;
end $$;

create or replace function pet_integrity_guard()
returns trigger as $$
declare
  parent_birth date;
begin
  if new.birthday is not null and new.birthday > now() then
    raise exception 'Birth date cannot be in the future.';
  end if;

  if new.registration_number is not null then
    if exists (
      select 1
      from pets
      where id <> new.id
        and registration_number is not null
        and lower(trim(registration_number)) = lower(trim(new.registration_number))
    ) then
      raise exception 'Registration number already exists.';
    end if;
  end if;

  if new.owner_id is not null and new.name is not null then
    if exists (
      select 1
      from pets
      where id <> new.id
        and owner_id = new.owner_id
        and name is not null
        and lower(trim(name)) = lower(trim(new.name))
    ) then
      raise exception 'Duplicate pet name for owner.';
    end if;
  end if;

  if new.birthday is not null then
    if new.father_id is not null then
      select birthday into parent_birth from pets where id = new.father_id;
      if parent_birth is not null then
        if parent_birth > new.birthday then
          raise exception 'Sire birth date cannot be after the child birth date.';
        end if;
        if new.birthday < parent_birth + interval '1 year' then
          raise exception 'Sire must be at least 1 year older than the child.';
        end if;
      end if;
    end if;

    if new.mother_id is not null then
      select birthday into parent_birth from pets where id = new.mother_id;
      if parent_birth is not null then
        if parent_birth > new.birthday then
          raise exception 'Dam birth date cannot be after the child birth date.';
        end if;
        if new.birthday < parent_birth + interval '1 year' then
          raise exception 'Dam must be at least 1 year older than the child.';
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists pet_integrity_guard on pets;
create trigger pet_integrity_guard
before insert or update on pets
for each row execute function pet_integrity_guard();
