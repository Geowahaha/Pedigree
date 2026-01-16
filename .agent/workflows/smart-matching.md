---
description: How to use the Smart Pet Matching Algorithm
---

# Smart Pet Matching Algorithm

This feature analyzes the compatibility between two pets for breeding purposes using a weighted scoring system.

## Algorithm Overview

The logic is located in `src/lib/breeding.ts`. It calculates a `score` (0-100) and a `label` (e.g., 'Perfect Match', 'Risk').

**Key Factors:**
1.  **Genetic Risk (40%)**: Checks for inbreeding (Parent/Child, Siblings). Any immediate family match results in a score of 0 (Incompatible/Risk).
2.  **Health Score (30%)**: Rewards pets with `healthCertified: true`.
3.  **Breed Compatibility (15%)**: Prefers same-breed matches (100% score). Cross-breeding gets a lower score but is not penalized as "Risk" unless genetics match.
4.  **Age (10%)**: Checks if both pets are within breeding age (1-8 years).
5.  **Color Strategy (5%)**: Currently sets a baseline, can be expanded for specific color rules (e.g. Merle safety).

## Usage

The algorithm is used in `BreedingMatchModal.tsx`.

```typescript
import { calculateCompatibilityScore } from '@/lib/breeding';

// ...
const matchResult = calculateCompatibilityScore(sourcePet, candidatePet);
console.log(matchResult.score); // 95
console.log(matchResult.label); // "Perfect Match"
```

## UI Integration

-   **Discovery**: `BreedingMatchModal` automatically filters and sorts potential matches by this score.
-   **Badges**: Color-coded badges (Green/Yellow/Red) display the score and label on the card.
-   **Unlock**: Users pay TRD to unlock the contact info for high-matching pets.

## Future Improvements

-   **Deep Pedigree Analysis**: Integrate with `PedigreeTree` to check 3+ generations.
-   **Community Voting**: Allow community to flag "Champion Bloodlines" to boost the Breed Score.
