#!/usr/bin/env node

/**
 * Regenerates words.csv and word_forms.csv from JMdict term bank JSON files
 * This ensures all meanings are correctly mapped to words
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JMDICT_DIR = path.join(__dirname, '../public/jmdict');
const OUTPUT_DIR = path.join(__dirname, '../public/database/generated');
const JLPT_LEVELS_FILE = path.join(__dirname, '../public/database/source/jlpt_levels.csv');

// Verb conjugation patterns for different verb types
const VERB_FORMS = {
  godan: {
    // う-verbs (godan)
    う: { negative: 'わ', masu: 'い', te: 'っ', ta: 'っ', potential: 'え', conditional: 'え', volitional: 'お', imperative: 'え' },
    く: { negative: 'か', masu: 'き', te: 'い', ta: 'い', potential: 'け', conditional: 'け', volitional: 'こ', imperative: 'け' },
    ぐ: { negative: 'が', masu: 'ぎ', te: 'い', ta: 'い', potential: 'げ', conditional: 'げ', volitional: 'ご', imperative: 'げ' },
    す: { negative: 'さ', masu: 'し', te: 'し', ta: 'し', potential: 'せ', conditional: 'せ', volitional: 'そ', imperative: 'せ' },
    つ: { negative: 'た', masu: 'ち', te: 'っ', ta: 'っ', potential: 'て', conditional: 'て', volitional: 'と', imperative: 'て' },
    ぬ: { negative: 'な', masu: 'に', te: 'ん', ta: 'ん', potential: 'ね', conditional: 'ね', volitional: 'の', imperative: 'ね' },
    ぶ: { negative: 'ば', masu: 'び', te: 'ん', ta: 'ん', potential: 'べ', conditional: 'べ', volitional: 'ぼ', imperative: 'べ' },
    む: { negative: 'ま', masu: 'み', te: 'ん', ta: 'ん', potential: 'め', conditional: 'め', volitional: 'も', imperative: 'め' },
    る: { negative: 'ら', masu: 'り', te: 'っ', ta: 'っ', potential: 'れ', conditional: 'れ', volitional: 'ろ', imperative: 'れ' },
  }
};

// Irregular verbs
// Reserved for explicit irregular-verb overrides as the generator grows.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const IRREGULAR_VERBS = {
  'する': 'suru',
  '来る': 'kuru',
  'ある': 'aru',
  '行く': 'iku', // Special: て form is 行って not 行いて
};

function readTermBanks() {
  const termBanks = [];
  const files = fs.readdirSync(JMDICT_DIR)
    .filter(f => f.startsWith('term_bank_') && f.endsWith('.json'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });

  console.log(`Found ${files.length} term bank files`);

  for (const file of files) {
    const filePath = path.join(JMDICT_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    termBanks.push(...data);
  }

  console.log(`Loaded ${termBanks.length} total entries`);
  return termBanks;
}

function extractMeanings(entry) {
  // entry format: [term, reading, tags, rules, score, definitions, sequence, termTags]
  const definitions = entry[5];
  
  if (!definitions || definitions.length === 0) {
    return [];
  }

  const meanings = [];
  
  for (const def of definitions) {
    if (typeof def === 'string') {
      meanings.push(def);
    } else if (def.content) {
      // Extract text from structured content
      const text = extractTextFromStructuredContent(def.content);
      if (text) meanings.push(text);
    }
  }

  return meanings;
}

function extractTextFromStructuredContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(extractTextFromStructuredContent).filter(Boolean).join('; ');
  }
  if (content && typeof content === 'object') {
    if (content.content) {
      return extractTextFromStructuredContent(content.content);
    }
    if (content.tag === 'li' && typeof content.content === 'string') {
      return content.content;
    }
  }
  return '';
}

function getPartOfSpeech(tags) {
  const posMap = {
    'n': 'noun',
    'v1': 'verb',
    'v5': 'verb',
    'v5u': 'verb',
    'v5k': 'verb',
    'v5g': 'verb',
    'v5s': 'verb',
    'v5t': 'verb',
    'v5n': 'verb',
    'v5b': 'verb',
    'v5m': 'verb',
    'v5r': 'verb',
    'vs': 'verb',
    'adj-i': 'adjective',
    'adj-na': 'adjective',
    'adv': 'adverb',
    'pron': 'pronoun',
    'int': 'interjection',
    'conj': 'conjunction',
    'exp': 'expression',
  };

  const tagStr = tags || '';
  for (const [key, value] of Object.entries(posMap)) {
    if (tagStr.includes(key)) return value;
  }
  return 'noun'; // default
}

function getVerbType(tags) {
  if (!tags) return '';
  if (tags.includes('v1')) return 'ichidan';
  if (tags.includes('v5') || tags.includes('v5u') || tags.includes('v5k') || 
      tags.includes('v5g') || tags.includes('v5s') || tags.includes('v5t') ||
      tags.includes('v5n') || tags.includes('v5b') || tags.includes('v5m') || tags.includes('v5r')) {
    return 'godan';
  }
  if (tags.includes('vs')) return 'suru';
  return '';
}

function getAdjectiveType(tags) {
  if (!tags) return '';
  if (tags.includes('adj-i')) return 'i_adjective';
  if (tags.includes('adj-na')) return 'na_adjective';
  return '';
}

function getJLPTLevel(tags) {
  if (!tags) return '';
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  for (const level of levels) {
    if (tags.includes(level) || tags.toLowerCase().includes(level.toLowerCase())) {
      return level;
    }
  }
  return '';
}

function loadJLPTWords() {
  console.log('Loading JLPT word list...');
  const csvContent = fs.readFileSync(JLPT_LEVELS_FILE, 'utf-8');
  const lines = csvContent.trim().split('\n').slice(1); // Skip header
  
  const jlptWords = new Set();
  const jlptLevels = new Map();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Split by comma but respect quoted fields
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim()); // Push last field
    
    if (fields.length >= 4) {
      const expression = fields[0].replace(/^"|"$/g, '');
      const readingsStr = fields[1].replace(/^"|"$/g, '');
      const tags = fields[3];
      
      // Extract JLPT level from tags (JLPT_5 means N5, etc.)
      let level = '';
      const levelMatch = tags.match(/JLPT_(\d)/);
      if (levelMatch) {
        level = `N${levelMatch[1]}`;
      }
      
      // Handle multiple readings separated by semicolon
      const readings = readingsStr.split(/[;；]/).map(r => r.trim());
      
      for (const reading of readings) {
        if (!reading) continue;
        const key = `${expression}_${reading}`;
        jlptWords.add(key);
        if (level) {
          jlptLevels.set(key, level);
        }
      }
    }
  }
  
  console.log(`Loaded ${jlptWords.size} JLPT word entries`);
  return { jlptWords, jlptLevels };
}

function conjugateGodan(stem, ending, formType) {
  const conjugation = VERB_FORMS.godan[ending];
  if (!conjugation) return null;

  switch (formType) {
    case 'masu':
      return stem + conjugation.masu + 'ます';
    case 'masu_negative':
      return stem + conjugation.masu + 'ません';
    case 'masu_past':
      return stem + conjugation.masu + 'ました';
    case 'masu_past_negative':
      return stem + conjugation.masu + 'ませんでした';
    case 'plain_negative':
      return stem + conjugation.negative + 'ない';
    case 'plain_past':
      return stem + conjugation.ta + 'た';
    case 'plain_past_negative':
      return stem + conjugation.negative + 'なかった';
    case 'te':
      return stem + conjugation.te + 'て';
    case 'negative_te':
      return stem + conjugation.negative + 'なくて';
    case 'progressive':
      return stem + conjugation.te + 'ている';
    case 'progressive_negative':
      return stem + conjugation.te + 'ていない';
    case 'progressive_past':
      return stem + conjugation.te + 'ていた';
    case 'progressive_past_negative':
      return stem + conjugation.te + 'ていなかった';
    case 'volitional':
      return stem + conjugation.volitional + 'う';
    case 'polite_volitional':
      return stem + conjugation.masu + 'ましょう';
    case 'imperative':
      return stem + conjugation.imperative;
    case 'polite_imperative':
      return stem + conjugation.masu + 'なさい';
    case 'prohibitive':
    case 'negative_imperative':
      return stem + ending + 'な';
    case 'potential':
      return stem + conjugation.potential + 'る';
    case 'potential_negative':
      return stem + conjugation.potential + 'ない';
    case 'potential_past':
      return stem + conjugation.potential + 'た';
    case 'potential_past_negative':
      return stem + conjugation.potential + 'なかった';
    case 'passive':
      return stem + conjugation.negative + 'れる';
    case 'passive_negative':
      return stem + conjugation.negative + 'れない';
    case 'passive_past':
      return stem + conjugation.negative + 'れた';
    case 'passive_past_negative':
      return stem + conjugation.negative + 'れなかった';
    case 'causative':
      return stem + conjugation.negative + 'せる';
    case 'causative_negative':
      return stem + conjugation.negative + 'せない';
    case 'causative_past':
      return stem + conjugation.negative + 'せた';
    case 'causative_past_negative':
      return stem + conjugation.negative + 'せなかった';
    case 'causative_passive':
      return stem + conjugation.negative + 'せられる';
    case 'causative_passive_negative':
      return stem + conjugation.negative + 'せられない';
    case 'causative_passive_past':
      return stem + conjugation.negative + 'せられた';
    case 'causative_passive_past_negative':
      return stem + conjugation.negative + 'せられなかった';
    case 'conditional_ba':
      return stem + conjugation.conditional + 'ば';
    case 'conditional_ba_negative':
      return stem + conjugation.negative + 'なければ';
    case 'conditional_tara':
      return stem + conjugation.ta + 'たら';
    case 'conditional_tara_negative':
      return stem + conjugation.negative + 'なかったら';
    case 'conditional_nara':
      return stem + ending + 'なら';
    case 'desire':
      return stem + conjugation.masu + 'たい';
    case 'desire_negative':
      return stem + conjugation.masu + 'たくない';
    case 'desire_past':
      return stem + conjugation.masu + 'たかった';
    case 'desire_past_negative':
      return stem + conjugation.masu + 'たくなかった';
    default:
      return null;
  }
}

function conjugateIchidan(word, formType) {
  // Remove る ending
  const stem = word.slice(0, -1);

  switch (formType) {
    case 'masu':
      return stem + 'ます';
    case 'masu_negative':
      return stem + 'ません';
    case 'masu_past':
      return stem + 'ました';
    case 'masu_past_negative':
      return stem + 'ませんでした';
    case 'plain_negative':
      return stem + 'ない';
    case 'plain_past':
      return stem + 'た';
    case 'plain_past_negative':
      return stem + 'なかった';
    case 'te':
      return stem + 'て';
    case 'negative_te':
      return stem + 'なくて';
    case 'progressive':
      return stem + 'ている';
    case 'progressive_negative':
      return stem + 'ていない';
    case 'progressive_past':
      return stem + 'ていた';
    case 'progressive_past_negative':
      return stem + 'ていなかった';
    case 'volitional':
      return stem + 'よう';
    case 'polite_volitional':
      return stem + 'ましょう';
    case 'imperative':
      return stem + 'ろ';
    case 'polite_imperative':
      return stem + 'なさい';
    case 'prohibitive':
    case 'negative_imperative':
      return word + 'な';
    case 'potential':
      return stem + 'られる';
    case 'potential_negative':
      return stem + 'られない';
    case 'potential_past':
      return stem + 'られた';
    case 'potential_past_negative':
      return stem + 'られなかった';
    case 'passive':
      return stem + 'られる';
    case 'passive_negative':
      return stem + 'られない';
    case 'passive_past':
      return stem + 'られた';
    case 'passive_past_negative':
      return stem + 'られなかった';
    case 'causative':
      return stem + 'させる';
    case 'causative_negative':
      return stem + 'させない';
    case 'causative_past':
      return stem + 'させた';
    case 'causative_past_negative':
      return stem + 'させなかった';
    case 'causative_passive':
      return stem + 'させられる';
    case 'causative_passive_negative':
      return stem + 'させられない';
    case 'causative_passive_past':
      return stem + 'させられた';
    case 'causative_passive_past_negative':
      return stem + 'させられなかった';
    case 'conditional_ba':
      return stem + 'れば';
    case 'conditional_ba_negative':
      return stem + 'なければ';
    case 'conditional_tara':
      return stem + 'たら';
    case 'conditional_tara_negative':
      return stem + 'なかったら';
    case 'conditional_nara':
      return word + 'なら';
    case 'desire':
      return stem + 'たい';
    case 'desire_negative':
      return stem + 'たくない';
    case 'desire_past':
      return stem + 'たかった';
    case 'desire_past_negative':
      return stem + 'たくなかった';
    default:
      return null;
  }
}

function generateVerbForms(word, reading, verbType) {
  const forms = [];
  const formTypes = [
    'masu', 'masu_negative', 'masu_past', 'masu_past_negative',
    'plain_present', 'plain_negative', 'plain_past', 'plain_past_negative',
    'te', 'negative_te',
    'progressive', 'progressive_negative', 'progressive_past', 'progressive_past_negative',
    'volitional', 'polite_volitional',
    'imperative', 'polite_imperative', 'prohibitive', 'negative_imperative',
    'potential', 'potential_negative', 'potential_past', 'potential_past_negative',
    'passive', 'passive_negative', 'passive_past', 'passive_past_negative',
    'causative', 'causative_negative', 'causative_past', 'causative_past_negative',
    'causative_passive', 'causative_passive_negative', 'causative_passive_past', 'causative_passive_past_negative',
    'conditional_ba', 'conditional_ba_negative', 'conditional_tara', 'conditional_tara_negative', 'conditional_nara',
    'desire', 'desire_negative', 'desire_past', 'desire_past_negative'
  ];

  for (const formType of formTypes) {
    let conjugated = null;
    
    if (formType === 'plain_present') {
      conjugated = word;
    } else if (verbType === 'ichidan') {
      conjugated = conjugateIchidan(word, formType);
    } else if (verbType === 'godan') {
      const lastChar = word[word.length - 1];
      const stem = word.slice(0, -1);
      
      // Special case for 行く
      if (word === '行く' && (formType === 'te' || formType === 'plain_past')) {
        conjugated = formType === 'te' ? '行って' : '行った';
      } else {
        conjugated = conjugateGodan(stem, lastChar, formType);
      }
    }

    if (conjugated) {
      // Generate reading for conjugated form (simplified)
      const readingForm = conjugated; // TODO: Could enhance this with proper reading generation
      forms.push({ form: conjugated, reading: readingForm, formType });
    }
  }

  return forms;
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('Reading JMdict term banks...');
  const entries = readTermBanks();
  
  // Load JLPT word list to filter
  const { jlptWords, jlptLevels } = loadJLPTWords();

  const words = [];
  const wordForms = [];
  const seenWords = new Set();
  const wordsByKanji = new Map(); // Track words by kanji to merge readings
  let wordId = 1;
  let formId = 1;
  let skippedNonJLPT = 0;

  // Process entries
  for (const entry of entries) {
    const [term, reading, tags] = entry;
    
    // Filter: Only include JLPT words
    const uniqueKey = `${term}_${reading}`;
    if (!jlptWords.has(uniqueKey)) {
      skippedNonJLPT++;
      continue;
    }
    
    // Skip creating a new word entry
    seenWords.add(uniqueKey);

    const meanings = extractMeanings(entry);
    if (meanings.length === 0) continue;

    const partOfSpeech = getPartOfSpeech(tags);
    const verbType = getVerbType(tags);
    const adjectiveType = getAdjectiveType(tags);
    
    // Get JLPT level from our JLPT list (more reliable than tags)
    const jlptLevel = jlptLevels.get(uniqueKey) || getJLPTLevel(tags);

    // Skip kanji variants of する and なる if we already have the kana versions
    // This prevents duplicates like 為る when we already have する/なる
    if ((term === '為る' && (reading === 'する' || reading === 'なる')) ||
        (term === '成る' && reading === 'なる')) {
      continue;
    }

    // Use the term as-is for dictionary form
    const dictionaryForm = term;
    
    // Check if we already have this exact dictionary form
    if (wordsByKanji.has(dictionaryForm)) {
      const existingWord = wordsByKanji.get(dictionaryForm);
      
      // Add this reading to the existing word if it's not already there
      const existingReadings = existingWord.reading.split('; ');
      if (!existingReadings.includes(reading)) {
        existingWord.reading = existingReadings.concat(reading).join('; ');
      }
      
      // Update JLPT level to the highest (N5 > N4 > N3 > N2 > N1)
      if (jlptLevel && (!existingWord.jlptLevel || 
          parseInt(jlptLevel[1]) > parseInt(existingWord.jlptLevel[1]))) {
        existingWord.jlptLevel = jlptLevel;
      }
      
      continue; // Skip creating a new word entry
    }

    const wordEntry = {
      id: wordId,
      dictionary: dictionaryForm,
      reading: reading,
      meanings: JSON.stringify(meanings),
      partOfSpeech,
      verbType,
      adjectiveType,
      jlptLevel,
      frequency: 1
    };
    
    words.push(wordEntry);
    wordsByKanji.set(dictionaryForm, wordEntry);

    // Generate forms for verbs (only once per dictionary form)
    if (partOfSpeech === 'verb' && verbType) {
      // Add dictionary form
      wordForms.push({
        id: formId++,
        wordId,
        form: dictionaryForm,
        reading: reading,
        formType: 'dictionary'
      });

      // Generate conjugations (dictionary form based, not reading-based)
      const forms = generateVerbForms(dictionaryForm, reading, verbType);
      for (const form of forms) {
        wordForms.push({
          id: formId++,
          wordId,
          form: form.form,
          reading: form.reading,
          formType: form.formType
        });
      }
    }

    wordId++;

    if (wordId % 1000 === 0) {
      console.log(`Processed ${wordId} words...`);
    }
  }

  // Write words.csv
  console.log(`\nSkipped ${skippedNonJLPT} non-JLPT words`);
  console.log(`Writing ${words.length} JLPT words to CSV...`);
  const wordsCSV = [
    'id,dictionary,reading,meanings,partOfSpeech,verbType,adjectiveType,jlptLevel,frequency',
    ...words.map(w => 
      `${w.id},"${w.dictionary}","${w.reading}","${w.meanings.replace(/"/g, '""')}","${w.partOfSpeech}","${w.verbType}","${w.adjectiveType}","${w.jlptLevel}",${w.frequency}`
    )
  ].join('\n');

  fs.writeFileSync(path.join(OUTPUT_DIR, 'words.csv'), wordsCSV, 'utf-8');
  console.log(`✓ Wrote words.csv with ${words.length} entries`);

  // Write word_forms.csv
  console.log(`\nWriting ${wordForms.length} word forms to CSV...`);
  const formsCSV = [
    'id,wordId,form,reading,formType',
    ...wordForms.map(f => 
      `${f.id},${f.wordId},"${f.form}","${f.reading}","${f.formType}"`
    )
  ].join('\n');

  fs.writeFileSync(path.join(OUTPUT_DIR, 'word_forms.csv'), formsCSV, 'utf-8');
  console.log(`✓ Wrote word_forms.csv with ${wordForms.length} entries`);

  console.log('\n✨ Done! CSV files regenerated successfully.');
}

main();
