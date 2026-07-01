# Requirements: Kanji Learning System

## Introduction

This specification outlines enhancements to KaiwaAI's vocabulary system to include comprehensive kanji learning features. The system will integrate kanji mnemonics, radicals, and etymology with the existing flashcard system, providing users with a deeper understanding of the kanji they encounter while learning Japanese.

## Glossary

- **Kanji**: Chinese characters used in Japanese writing
- **Radical**: A fundamental component of a kanji character that often provides semantic or phonetic meaning
- **Mnemonic**: A memory aid or story to help remember a kanji's meaning and reading
- **Onyomi**: Chinese reading of a kanji
- **Kunyomi**: Native Japanese reading of a kanji
- **Flashcard**: Existing vocabulary item in the user's deck
- **JLPT**: Japanese Language Proficiency Test (N5-N1 levels)

## User Stories & Requirements

### Requirement 1: Kanji Detail Page from Vocabulary

**User Story:** As a learner, I want to click on a vocabulary word and see detailed kanji breakdowns, so that I can understand the characters that make up the word.

#### Acceptance Criteria

1. GIVEN I am viewing my vocabulary deck page (/vocab)
   WHEN I click on a vocabulary word card
   THEN I should see the existing detail modal with an additional "Learn Kanji" button

2. GIVEN I click the "Learn Kanji" button on a vocabulary word
   WHEN the word contains kanji characters
   THEN I should be navigated to /kanji?word={word} showing detailed breakdowns of each kanji

3. GIVEN a vocabulary word contains only hiragana/katakana
   WHEN I view its detail modal
   THEN the "Learn Kanji" button should not be displayed

4. GIVEN I am viewing a kanji detail page
   WHEN I click the back button
   THEN I should return to the vocabulary page

### Requirement 2: Dedicated Kanji Learning Page

**User Story:** As a learner, I want a dedicated kanji page where I can explore kanji from my vocabulary, so that I can systematically study the characters I'm encountering.

#### Acceptance Criteria

1. GIVEN I navigate to /kanji
   WHEN the page loads
   THEN I should see a list of all unique kanji extracted from my vocabulary words

2. GIVEN I am on the kanji page
   WHEN viewing the kanji list
   THEN each kanji should display: the character, meaning, on'yomi, kun'yomi, and JLPT level

3. GIVEN I am on the kanji page
   WHEN I click on a kanji character
   THEN I should see a detailed view with: radicals, mnemonic, stroke order, example words from my vocabulary

4. GIVEN I am on the kanji page
   WHEN no vocabulary words exist yet
   THEN I should see an empty state: "Add vocabulary words to start learning kanji"

5. GIVEN the kanji list
   WHEN displayed
   THEN kanji should be sortable by: frequency (most common in my vocab), JLPT level, stroke count

### Requirement 3: AI-Generated Kanji Mnemonics

**User Story:** As a learner, I want AI-generated memory aids for each kanji, so that I can more easily remember their meanings and readings.

#### Acceptance Criteria

1. GIVEN I view a kanji detail page
   WHEN the page loads
   THEN the system should generate a mnemonic story using the kanji's radicals and meaning

2. GIVEN the AI generates a mnemonic
   WHEN the generation is successful
   THEN the mnemonic should reference the kanji's component radicals and create a memorable story

3. GIVEN the AI generation fails or times out
   WHEN viewing a kanji
   THEN a fallback explanation should be shown: "Kanji meaning: {meaning}. Composed of {radicals}."

4. GIVEN a mnemonic has been generated
   WHEN I refresh the page
   THEN the same mnemonic should be cached and displayed (not regenerated)

5. GIVEN I am viewing a mnemonic
   WHEN I click "Regenerate mnemonic"
   THEN a new mnemonic story should be created with different wording/approach

### Requirement 4: Radical Breakdown Integration

**User Story:** As a learner, I want to see the radical components of each kanji, so that I can understand how kanji are constructed and find patterns.

#### Acceptance Criteria

1. GIVEN I view a kanji detail page
   WHEN the page loads
   THEN I should see a "Radicals" section listing all component radicals with their meanings

2. GIVEN a radical is displayed
   WHEN I hover over or tap it
   THEN I should see a tooltip with: radical name, meaning, and its position in this kanji

3. GIVEN I click on a radical
   WHEN the radical is itself a standalone kanji
   THEN I should navigate to that kanji's detail page

4. GIVEN I view the radical breakdown
   WHEN the kanji has 3+ radicals
   THEN they should be displayed hierarchically showing composition structure

### Requirement 5: Vocabulary Word Examples

**User Story:** As a learner, I want to see which vocabulary words from my deck use a specific kanji, so that I can see the kanji in context.

#### Acceptance Criteria

1. GIVEN I view a kanji detail page
   WHEN the page loads
   THEN I should see a "Your Vocabulary" section showing all words from my deck containing this kanji

2. GIVEN the vocabulary examples section
   WHEN displayed
   THEN each example should show: the full word, reading, meaning, and highlight the kanji

3. GIVEN I click on a vocabulary example
   WHEN clicked
   THEN I should navigate back to /vocab with that word selected in the detail modal

4. GIVEN no vocabulary words contain this kanji
   WHEN viewing the kanji detail
   THEN the section should show: "You don't have any vocabulary words using this kanji yet"

### Requirement 6: Kanji Search and Filtering

**User Story:** As a learner, I want to search and filter kanji, so that I can quickly find specific characters I want to study.

#### Acceptance Criteria

1. GIVEN I am on /kanji
   WHEN I use the search input
   THEN I should be able to search by: kanji character, English meaning, reading (romaji/kana)

2. GIVEN the kanji list page
   WHEN I apply JLPT level filters
   THEN only kanji matching the selected levels should be displayed

3. GIVEN the kanji list page
   WHEN I apply "learned status" filter
   THEN I should see: "In vocabulary" (kanji from my saved words), "Not yet learned"

4. GIVEN I search for a kanji not in my vocabulary
   WHEN the search returns no results
   THEN I should see: "This kanji isn't in your vocabulary yet. Add words containing it to learn more."

### Requirement 7: Kanji Progress Tracking

**User Story:** As a learner, I want my kanji learning progress tracked, so that I can see which characters I've mastered.

#### Acceptance Criteria

1. GIVEN I save vocabulary words containing kanji
   WHEN I view the kanji page
   THEN each kanji should show: total vocabulary words containing it, and how many are "known" status

2. GIVEN a kanji appears in 5 vocabulary words
   WHEN 3 of those words are marked "known"
   THEN the kanji should display "60% mastered" or similar indicator

3. GIVEN I view my kanji list
   WHEN sorted by mastery
   THEN kanji should be ordered by the percentage of containing words I've marked as known

### Requirement 8: Kanji Etymology and Context

**User Story:** As a learner, I want historical context about kanji, so that I can appreciate their origins and evolution.

#### Acceptance Criteria

1. GIVEN I view a kanji detail page
   WHEN etymology data is available
   THEN I should see an "Origin" section with: historical forms, original pictographic meaning

2. GIVEN the etymology section
   WHEN displayed
   THEN it should show old forms of the kanji (if available) in chronological order

3. GIVEN etymology data is unavailable
   WHEN viewing the kanji detail
   THEN the "Origin" section should not be displayed

### Requirement 9: Kanji Data Source and Local Storage

**User Story:** As a system administrator, I want kanji data stored locally in our database, so that we have fast, reliable access without depending on external APIs.

#### Acceptance Criteria

1. GIVEN the system needs kanji data
   WHEN initializing the database
   THEN it should seed from the davidluzgouveia/kanji-data JSON file (~13,000 kanji)

2. GIVEN kanji data is stored locally
   WHEN a user requests kanji information
   THEN the system should query the local Kanji table (no external API calls)

3. GIVEN the local kanji database
   WHEN querying for a specific kanji
   THEN it should return: character, meanings, readings (on/kun), radicals, JLPT level, stroke count

4. GIVEN the kanji seed data includes WaniKani information
   WHEN displaying radicals
   THEN the system should use the WaniKani radical names (more learner-friendly)

5. GIVEN the database is seeded
   WHEN checking kanji data freshness
   THEN a database migration script should be available to update from the latest kanji-data.json

#### Data Source Details

**Primary Source**: [davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data)
- ~13,000 kanji in JSON format
- Combines KANJIDIC2 + updated JLPT levels + WaniKani radicals
- MIT licensed (free to use)
- Fields available: strokes, grade, frequency, JLPT (old/new), meanings, readings (on/kun), WaniKani level, WaniKani radicals

**Data Structure Example**:
```json
{
  "勝": {
    "strokes": 12,
    "grade": 3,
    "freq": 185,
    "jlpt_old": 2,
    "jlpt_new": 3,
    "meanings": ["Victory", "Win", "Prevail", "Excel"],
    "readings_on": ["しょう"],
    "readings_kun": ["か.つ", "-が.ち", "まさ.る"],
    "wk_level": 9,
    "wk_meanings": ["Win"],
    "wk_radicals": ["Moon", "Gladiator", "Power"]
  }
}
```

## Non-Functional Requirements

### Performance

1. Kanji detail pages should load within 1 second (data is local, no API calls)
2. Mnemonic generation should complete within 3 seconds or show "Generating..." state
3. Kanji list page should handle 500+ unique kanji without lag
4. Initial database seeding should complete within 30 seconds

### Accessibility

1. All kanji characters should have proper text alternatives for screen readers
2. Color indicators (JLPT levels, progress) should also use icons/text labels

### Data Privacy

1. Generated mnemonics should be cached per-user and not shared between users
2. Kanji learning progress should be user-specific and privacy-protected

### Compatibility

1. Kanji characters should render correctly across all devices and browsers
2. The system should gracefully degrade on devices without Japanese font support

## Correctness Properties

1. **Kanji extraction accuracy**: All kanji extracted from vocabulary words must be valid Japanese kanji characters (U+4E00–U+9FFF Unicode range)

2. **Radical decomposition correctness**: Each kanji's radical breakdown must match the WaniKani radical data from davidluzgouveia/kanji-data

3. **Vocabulary-kanji linkage**: When displaying vocabulary examples for a kanji, all listed words must actually contain that kanji character

4. **Progress calculation accuracy**: Kanji mastery percentage = (known vocabulary words containing kanji / total vocabulary words containing kanji) × 100

5. **JLPT level consistency**: Kanji JLPT levels should use the `jlpt_new` field from the dataset

6. **Data integrity**: Kanji seed data must validate successfully before database insertion (no null characters, valid JSON structure)

7. **Readings accuracy**: On'yomi and kun'yomi readings must be stored and displayed correctly in their respective hiragana forms

## Out of Scope

- Stroke order animations and writing practice
- Handwriting recognition for practicing kanji writing
- Gamification features (points, badges, leaderboards)
- Social features (sharing mnemonics with other users)
- Kanji quizzes or separate testing features (covered by existing flashcard review system)
- Support for Chinese hanzi or Korean hanja variants
