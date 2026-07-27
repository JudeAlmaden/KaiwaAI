import { describe, it, expect } from 'vitest';
import { alignFurigana } from './Furigana';

describe('alignFurigana', () => {
  it('correctly aligns conjugated verb 食べた (tabeta)', () => {
    const result = alignFurigana('食べた', 'たべた');
    expect(result).toEqual([
      { text: '食', ruby: 'た' },
      { text: 'べた' }
    ]);
  });

  it('correctly aligns conjugated verb 聞きます (kikimasu)', () => {
    const result = alignFurigana('聞きます', 'ききます');
    expect(result).toEqual([
      { text: '聞', ruby: 'き' },
      { text: 'きます' }
    ]);
  });

  it('correctly aligns conjugated adjective 行かなかった (ikanakatta)', () => {
    const result = alignFurigana('行かなかった', 'いかなかった');
    expect(result).toEqual([
      { text: '行', ruby: 'い' },
      { text: 'かなかった' }
    ]);
  });

  it('correctly aligns suru verb 勉強した (benkyoushita)', () => {
    const result = alignFurigana('勉強した', 'べんきょうした');
    expect(result).toEqual([
      { text: '勉強', ruby: 'べんきょう' },
      { text: 'した' }
    ]);
  });

  it('correctly aligns pure kanji word 日本 (nihon)', () => {
    const result = alignFurigana('日本', 'にほん');
    expect(result).toEqual([
      { text: '日本', ruby: 'にほん' }
    ]);
  });

  it('returns plain text for pure hiragana words', () => {
    const result = alignFurigana('こんにちは', 'こんにちは');
    expect(result).toEqual([
      { text: 'こんにちは' }
    ]);
  });
});
