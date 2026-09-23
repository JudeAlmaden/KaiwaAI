KaiwaAI — SRS & Gradual Introduction Design Doc

1. Goal

Build an SRS system that helps users steadily learn vocabulary without creating an overwhelming review backlog.

The system combines:

Vocabulary capture from Kai conversations

Gradual introduction of new cards

Short initial learning

Long-term spaced repetition scheduling

A daily review workload limit

Focus Guard integration

2. Core Principle

Users should not be expected to review their entire vocabulary collection.

The system decides which cards deserve attention today.

Chat with Kai
    ↓
Encounter / tap a word
    ↓
Save to vocabulary pool
    ↓
Gradually introduce card
    ↓
Initial learning
    ↓
SRS scheduling
    ↓
Due review
    ↓
Longer interval
    ↓
Long-term retention

3. SRS Algorithm

Use FSRS as the long-term scheduling algorithm.

FSRS should determine the next review interval from the user's review history rather than relying on a fixed schedule such as 1d → 3d → 7d → 14d → 30d.

Recommended initial target:

Desired retention: 90%

4. Vocabulary States

POOL
  ↓
NEW
  ↓
LEARNING
  ↓
REVIEW
  ↓
MATURE

Pool: saved vocabulary that has not yet been introduced.

New: selected for introduction.

Learning: undergoing initial learning.

Review: graduated into long-term SRS.

Mature: accumulated longer review intervals.

5. Gradual Introduction

Do not immediately activate every saved vocabulary item.

Initial recommendation:

5 new cards per day

Prioritize words encountered naturally in recent conversations.

Do not introduce new cards when the review workload is already excessive.

Example:

User encounters 20 words
        ↓
20 words enter vocabulary pool
        ↓
5 are introduced today
        ↓
Remaining words stay in the pool

6. Initial Learning

New cards should have a short learning phase before entering long-term scheduling.

Starting concept:

New
 ↓
~10 minute review
 ↓
Later same day / next session
 ↓
Graduate to FSRS

Keep initial learning steps short. Do not manually hard-code long-term intervals. Once a card graduates, FSRS controls the longer-term schedule.

7. Review Ratings

Use four simple outcomes:

Rating

Meaning

Again

Forgot the answer

Hard

Remembered with significant difficulty

Good

Remembered normally

Easy

Recalled immediately

These ratings are passed to the scheduler so it can adjust the card's future interval.

8. Daily Workload Management

Due reviews should be prioritized before new cards.

Initial limits:

New cards/day:       5
Maximum reviews/day: 30
Target retention:    90%

Decision flow:

Are reviews due?
      ↓
Complete due reviews
      ↓
Is workload manageable?
   ↙          ↘
 YES          NO
  ↓            ↓
Add new      Add no
cards        new cards

If the user has a significant review backlog, new-card introduction should pause until the backlog is reduced.

9. Focus Guard Integration

Focus Guard should use the SRS queue rather than requiring the user to review their entire collection.

FSRS determines:
"7 cards are due today."
        ↓
Focus Guard
        ↓
User reviews 7 cards
        ↓
Apps unlock

Focus Guard requires due reviews, not all saved vocabulary.

10. Kai Conversation Integration

Kai should naturally reinforce vocabulary outside the flashcard interface.

User learns: 電車
       ↓
Card enters SRS
       ↓
Later Kai conversation
       ↓
Kai naturally uses 電車
       ↓
User encounters it again in context
       ↓
Formal SRS review when due

This creates two reinforcement channels:

Natural exposure through conversation

Explicit recall through flashcards

11. Example User Journey

Day 1

User encounters 12 useful words.

12 saved

5 introduced

7 remain in the pool

Day 2

User reviews cards that are due.

Due cards are reviewed first.

Up to 5 additional cards may be introduced.

Day 3+

The same process continues.

Cards remembered successfully receive progressively longer intervals. Cards that are difficult or forgotten return sooner.

12. Preventing Review Explosion

The system must avoid continuously adding new cards when the user already has a heavy workload.

Rules:

Due reviews take priority.

New-card introduction is capped.

New cards can be paused when the review backlog is high.

Users never need to review every card they own in one session.

Long-term intervals are controlled by FSRS.

Focus Guard only requires currently due reviews.

13. Suggested Data Model

VocabularyCard {
  id
  userId
  word
  reading
  meaning

  state
  createdAt
  introducedAt

  dueAt
  lastReviewedAt

  stability
  difficulty
  reviewCount
  lapseCount

  fsrsData
}

The exact FSRS fields should follow the chosen FSRS implementation rather than duplicating scheduler logic unnecessarily.

14. Daily Scheduler

async function generateDailyQueue(userId) {
  const dueCards = await getDueCards(userId);

  const reviewQueue = prioritizeDueCards(dueCards);

  if (reviewQueue.length >= MAX_DAILY_REVIEWS) {
    return reviewQueue.slice(0, MAX_DAILY_REVIEWS);
  }

  const remainingSlots =
    MAX_DAILY_REVIEWS - reviewQueue.length;

  const newCards = await getNewCards(
    userId,
    Math.min(DAILY_NEW_LIMIT, remainingSlots)
  );

  return [...reviewQueue, ...newCards];
}

The exact implementation should keep new-card limits separate from the review limit.

15. Initial Configuration

const SRS_CONFIG = {
  algorithm: "FSRS",
  desiredRetention: 0.90,

  dailyNewCards: 5,
  maxDailyReviews: 30,

  learningSteps: [
    "10m",
    "same-day / next-session"
  ],

  pauseNewCardsWhenBacklogged: true,
};

16. Design Outcome

Learn naturally → save useful words → gradually introduce them → review only when needed → intervals grow → vocabulary becomes long-term memory.

The SRS should feel like a background system supporting Kai's conversations rather than a giant deck the user has to maintain manually.