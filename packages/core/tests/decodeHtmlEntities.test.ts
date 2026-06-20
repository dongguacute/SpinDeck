import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities } from '../src/utils/decodeHtmlEntities';

describe('decodeHtmlEntities', () => {
    it('decodes decimal numeric entities to emoji', () => {
        expect(decodeHtmlEntities('我的歌单&#127925;')).toBe('我的歌单🎵');
    });

    it('decodes hex numeric entities to emoji', () => {
        expect(decodeHtmlEntities('Playlist&#x1F3B5;')).toBe('Playlist🎵');
    });

    it('decodes named entities', () => {
        expect(decodeHtmlEntities('A &amp; B &lt; C')).toBe('A & B < C');
    });

    it('decodes multiple entities in one string', () => {
        expect(decodeHtmlEntities('Hi&#128512; there&#127925;')).toBe('Hi😀 there🎵');
    });

    it('returns empty string for empty input', () => {
        expect(decodeHtmlEntities('')).toBe('');
    });

    it('leaves plain text unchanged', () => {
        expect(decodeHtmlEntities('普通歌单名称')).toBe('普通歌单名称');
    });

    it('keeps invalid entities as-is', () => {
        expect(decodeHtmlEntities('bad&#9999999;')).toBe('bad&#9999999;');
    });
});
