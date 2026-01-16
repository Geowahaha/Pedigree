-- Enforce unique pet identifiers after duplicate cleanup.
-- Run this migration only once duplicates are resolved.

create unique index if not exists pets_registration_number_unique_idx
  on pets ((lower(trim(registration_number))))
  where registration_number is not null;

create unique index if not exists pets_owner_name_unique_idx
  on pets (owner_id, (lower(trim(name))))
  where name is not null;
