# Enhanced Review System - Implementation Summary

## Overview
Comprehensive enhancement to the vocabulary review system with practice mode, 5 study focus modes, and advanced filtering options.

## Features Implemented

### 1. Practice Mode
- **Purpose**: Study without affecting mastery/SRS scores
- **Implementation**: 
  - Added `practice` boolean flag to Setup type
  - Client-side: Conditionally skips POST request to `/api/flashcards/review` when grading
  - UI: Toggle between "📝 Review (affects mastery)" and "🎯 Practice (no mastery change)"
- **Use Case**: Preview cards, warm-up sessions, or casual study without impacting long-term progress

### 2. Study Focus Modes (5 modes)
Replaced simple "due/all" with intelligent study modes:

#### ⏰ Due Now (default)
- Cards with `nextReview <= now()`
- Sorted by `nextReview` ascending (most overdue first)
- Ideal for daily review routine

#### 📚 Study Ahead
- Any cards (no date filter)
- Sorted by `createdAt` descending (newest first)
- Ideal for learning new vocabulary or getting ahead

#### ✨ Recently Added
- Cards created in the last 7 days
- Sorted by `createdAt` descending
- Ideal for reinforcing newly learned words

#### 😓 Struggling Cards
- Cards with `easeFactor < 2.0` (low ease = difficult cards)
- Sorted by `easeFactor` ascending (hardest first)
- Ideal for focused practice on problem vocabulary

#### 🐛 Leeches
- Cards with `timesReviewed >= 8` AND `interval < 7 days`
- Sorted by `timesReviewed` descending (most reviewed first)
- Identifies cards that aren't "sticking" despite multiple reviews
- Ideal for identifying words that need different study approaches

### 3. Advanced Filters

#### JLPT Level Filter
- Options: Any, N5, N4, N3, N2, N1
- Filters by `jlptTier` field in Flashcard table
- UI: Chip selector with visual feedback

#### Part of Speech Filter
- Options: Any, Noun, Verb, Adjective, Adverb, Particle, Expression
- Filters by `partOfSpeech` field
- UI: Chip selector with visual feedback

#### Status Filter (existing, preserved)
- Options: Any, New, Learning, Known
- Filters by `status` field

### 4. Review Type Selector
- Options: 📚 Vocabulary, 漢 Kanji
- Kanji mode redirects to `/kanji` page (using useEffect to avoid mutation error)
- Vocabulary mode shows the review setup/session as normal

### 5. UI Improvements
- Reorganized setup screen with logical grouping:
  1. Review Type (top)
  2. Mode (Practice vs Review)
  3. Study Focus (5 modes)
  4. Status, JLPT Level, Part of Speech filters
  5. Limit selector
- Added emoji icons for visual distinction
- Maintained consistent spacing and styling

## Technical Implementation

### Frontend Changes
**File**: `src/app/(app)/review/ReviewClient.tsx`

- Added `StudyMode` type with 5 modes
- Updated `Setup` type with `studyMode` and `practice` fields
- Modified `start()` to use `studyMode` parameter
- Modified `grade()` to conditionally skip API call in practice mode
- Added useEffect for kanji redirect (avoids mutation lint error)
- Reorganized UI with new filter sections

### Backend Changes
**File**: `src/app/api/flashcards/review/route.ts`

- Updated GET endpoint to accept `studyMode` parameter (replaces `mode`)
- Added `jlpt` filter support (validates against N5/N4/N3/N2/N1)
- Enhanced where clause building for complex queries (struggling, leeches)
- Smart sorting based on study mode:
  - `due`: `nextReview` ascending
  - `all`, `recent`: `createdAt` descending
  - `struggling`: `easeFactor` ascending
  - `leeches`: `timesReviewed` descending
- Fixed TypeScript types for orderBy (removed `any`)

### Tests
**File**: `src/app/api/flashcards/review/route.test.ts` (NEW)

28 comprehensive tests covering:
- Authentication (401 errors)
- All 5 study modes with correct filters and sorting
- Status, POS, and JLPT filter validation
- Invalid input handling (bad JLPT levels, status values)
- Multiple filter combinations
- Limit validation (min 1, max 200, default 50)
- Grading all 4 grades (0=Again, 1=Hard, 2=Good, 3=Easy)
- Error handling (invalid JSON, missing fields, card not found)
- Security (prevent grading other users' cards)
- SRS integration (timesReviewed increment, lastReviewedAt update)

## How Each Study Mode Works

### Due Now
```typescript
where: {
  userId: "...",
  nextReview: { lte: new Date() }
}
orderBy: { nextReview: "asc" }
```

### Study Ahead
```typescript
where: {
  userId: "..."
}
orderBy: { createdAt: "desc" }
```

### Recently Added
```typescript
where: {
  userId: "...",
  createdAt: { gte: sevenDaysAgo }
}
orderBy: { createdAt: "desc" }
```

### Struggling Cards
```typescript
where: {
  userId: "...",
  easeFactor: { lt: 2.0 }
}
orderBy: { easeFactor: "asc" }
```

### Leeches
```typescript
where: {
  userId: "...",
  AND: [
    { timesReviewed: { gte: 8 } },
    { interval: { lt: 7 } }
  ]
}
orderBy: { timesReviewed: "desc" }
```

## Edge Cases Handled

1. **Practice Mode**: Grading doesn't update database, but tally still tracks
2. **Empty Results**: Shows "Nothing to review" with option to start new session
3. **Invalid Filters**: Silently ignores invalid JLPT/status values
4. **Limit Bounds**: Enforces min 1, max 200 (prevents abuse)
5. **Kanji Redirect**: Uses useEffect to avoid mutation during render
6. **Multiple Filters**: Combines all active filters correctly

## Testing Strategy

- **Unit Tests**: 28 tests for API route covering all modes and filters
- **Integration**: Tests verify Prisma queries build correctly
- **Security**: Tests prevent cross-user card access
- **Validation**: Tests enforce input constraints
- **Error Handling**: Tests graceful degradation

All tests pass (180/180) ✅
Lint passes with no warnings ✅

## Git Commits

1. **Dev branch**: `feat: add enhanced review system with study modes and advanced filters`
2. **Main branch**: Merged dev with conflict resolution

## Usage Examples

### Practice Mode
```
1. Select "🎯 Practice (no mastery change)"
2. Choose study mode (e.g., "📚 Study ahead")
3. Optionally filter by JLPT, POS, status
4. Start session
5. Grade cards - progress tracked but SRS not updated
```

### Struggling Cards Focus
```
1. Select "📝 Review (affects mastery)"
2. Choose "😓 Struggling cards"
3. Optionally filter by JLPT level (e.g., N5 only)
4. Start session
5. Review hardest cards first, SRS updates as normal
```

### Leech Identification
```
1. Choose "🐛 Leeches"
2. Review cards that aren't sticking
3. Consider alternative study methods for these words
```

## Future Enhancements (Not Implemented)

Potential additions discussed but not implemented:
- Reverse mode (show meaning, recall word)
- Recently failed cards
- Listening practice mode
- Writing/production mode
- Custom date ranges
- Exclude specific words
- Session history/analytics

## Performance Considerations

- All queries use indexed fields (`userId`, `nextReview`, `createdAt`, `easeFactor`)
- Limit capped at 200 to prevent memory issues
- Smart sorting reduces need for client-side re-sorting
- No N+1 queries - single findMany call per session start

## Backward Compatibility

- ✅ Existing "Due today" quick-start button preserved
- ✅ All existing SRS logic unchanged
- ✅ Previous grading behavior maintained
- ✅ Database schema unchanged (uses existing fields)

## Documentation

- CHANGELOG.md updated with detailed feature list
- API comments updated with all parameters
- Type definitions clarify purpose of each mode
- Tests serve as executable documentation
