---
description: How to use the Champion Voting System
---

# Champion Voting System

The voting system allows the community to verify "Champion Bloodlines" and boost a pet's social credibility.

## Database Schema

This feature is backed by the `pet_champion_votes` table in Supabase.

```sql
create table pet_champion_votes (
  id uuid default uuid_generate_v4() primary key,
  pet_id text not null, -- references pets(id)
  user_id uuid not null references auth.users(id),
  category text default 'champion', -- 'champion' | 'beautiful' | 'smart'
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(pet_id, user_id, category)
);
```

## Functions

The core logic is in `src/lib/database.ts`:

-   `voteForPet(petId, category)`: Casts a vote. Enforces 1 vote per user per pet.
-   `getPetVotes(petId)`: Returns total vote count.
-   `hasUserVoted(petId)`: Returns boolean if current user voted.

## UI Integration

The voting interface is located in `PetDetailsModal.tsx` in the "Community" section.

**Features:**
-   **Vote Count**: Displays aggregated votes with a trophy (🏆).
-   **Vote Button**: Allows one-click voting.
-   **State Management**: Updates UI optimistically and prohibits double-voting locally.

## Future Plans

-   **Badges**: Automatically award a "Community Choice" badge if votes > 50.
-   **Leaderboard**: Create a "Top Rated" section in the Explore page.
