---
description: How to use the Pet Life Story/Timeline
---

# Pet Life Story / Timeline

The Pet Life Story Timeline creates a visual history of a pet's life, including milestones, medical updates, and events.

## Database Schema

This feature uses the `pet_stories` table in Supabase.

```sql
create table pet_stories (
  id uuid default uuid_generate_v4() primary key,
  pet_id text not null, -- references pets(id)
  title text not null,
  description text,
  image_url text, -- For future photo attachment support
  event_date date default CURRENT_DATE,
  event_type text default 'other', -- 'milestone' | 'medical' | 'competition' | 'travel' | 'other'
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

## Functions

The core logic is in `src/lib/database.ts`:

-   `addPetStory(story)`: Creates a new timeline entry.
-   `getPetStories(petId)`: Retrieves all stories for a pet, ordered by date (newest first).
-   `deletePetStory(id)`: Removes an entry.

## UI Integration

The timeline is integrated into `PetDetailsModal.tsx`.

**Features:**
-   **Visual Timeline**: Displayed as a vertical list with dot indicators.
-   **Event Types**: Supports categorization (e.g., Medical, Travel) with distinct labels (future: distinct icons/colors).
-   **Owner Controls**: Owners see an "Add Milestone" button to easily add new events.
-   **Mock Data**: Guest users viewing persistent "Magic Cards" see a mock "Born" event.

## Usage

1.  Open any Pet Details card.
2.  Scroll down to the "Story" section (below Photos, above Comments).
3.  If you are the owner, click "+ Add Milestone" to post a new update.
