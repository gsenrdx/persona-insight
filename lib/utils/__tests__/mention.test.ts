import { describe, it, expect } from 'vitest';
import {
  findMentionContext,
  insertMention,
  parseMentions,
  extractMentionedPersonas,
  type MentionData
} from '../mention';

describe('Mention Utilities', () => {
  describe('findMentionContext', () => {
    it('should find mention context when @ is typed', () => {
      const text = 'Hello @';
      const cursorPosition = 7;
      
      const result = findMentionContext(text, cursorPosition);
      
      expect(result).toEqual({
        mentionStart: 6,
        searchText: '',
        isInMention: true
      });
    });

    it('should find mention context with partial name', () => {
      const text = 'Hello @per';
      const cursorPosition = 10;
      
      const result = findMentionContext(text, cursorPosition);
      
      expect(result).toEqual({
        mentionStart: 6,
        searchText: 'per',
        isInMention: true
      });
    });

    it('should not find mention context after space', () => {
      const text = 'Hello @ person';
      const cursorPosition = 14;
      
      const result = findMentionContext(text, cursorPosition);
      
      expect(result).toEqual({
        mentionStart: -1,
        searchText: '',
        isInMention: false
      });
    });

    it('should not find mention context after newline', () => {
      const text = 'Hello @\nperson';
      const cursorPosition = 14;
      
      const result = findMentionContext(text, cursorPosition);
      
      expect(result).toEqual({
        mentionStart: -1,
        searchText: '',
        isInMention: false
      });
    });

    it('should find the closest @ when multiple exist', () => {
      const text = '@first @second';
      const cursorPosition = 14;
      
      const result = findMentionContext(text, cursorPosition);
      
      expect(result).toEqual({
        mentionStart: 7,
        searchText: 'second',
        isInMention: true
      });
    });

    it('should return no mention when @ not found', () => {
      const text = 'Hello world';
      const cursorPosition = 11;
      
      const result = findMentionContext(text, cursorPosition);
      
      expect(result).toEqual({
        mentionStart: -1,
        searchText: '',
        isInMention: false
      });
    });
  });

  describe('insertMention', () => {
    const mockMention: MentionData = {
      id: 'persona-123',
      name: 'Test Persona',
      avatar: 'avatar.png'
    };

    it('should insert mention at @ position', () => {
      const text = 'Hello @';
      const cursorPosition = 7;
      
      const result = insertMention(text, cursorPosition, mockMention);
      
      expect(result.newText).toBe('Hello @[Test Persona](persona-123)');
      expect(result.newCursorPosition).toBe(34);
    });

    it('should replace partial mention', () => {
      const text = 'Hello @tes';
      const cursorPosition = 10;
      
      const result = insertMention(text, cursorPosition, mockMention);
      
      expect(result.newText).toBe('Hello @[Test Persona](persona-123)');
      expect(result.newCursorPosition).toBe(34);
    });

    it('should not insert if not in mention context', () => {
      const text = 'Hello world';
      const cursorPosition = 11;
      
      const result = insertMention(text, cursorPosition, mockMention);
      
      expect(result.newText).toBe('Hello world');
      expect(result.newCursorPosition).toBe(11);
    });

    it('should preserve text after cursor', () => {
      const text = 'Hello @per and more text';
      const cursorPosition = 10;
      
      const result = insertMention(text, cursorPosition, mockMention);
      
      expect(result.newText).toBe('Hello @[Test Persona](persona-123) and more text');
      expect(result.newCursorPosition).toBe(34);
    });
  });

  describe('parseMentions', () => {
    it('should parse single mention', () => {
      const text = 'Hello @[Test User](user-123)!';
      
      const result = parseMentions(text);
      
      expect(result).toEqual([
        { type: 'text', content: 'Hello ' },
        { 
          type: 'mention', 
          content: '@Test User',
          data: { id: 'user-123', name: 'Test User' }
        },
        { type: 'text', content: '!' }
      ]);
    });

    it('should parse multiple mentions', () => {
      const text = '@[User1](id1) and @[User2](id2) are here';
      
      const result = parseMentions(text);
      
      expect(result).toEqual([
        { 
          type: 'mention', 
          content: '@User1',
          data: { id: 'id1', name: 'User1' }
        },
        { type: 'text', content: ' and ' },
        { 
          type: 'mention', 
          content: '@User2',
          data: { id: 'id2', name: 'User2' }
        },
        { type: 'text', content: ' are here' }
      ]);
    });

    it('should handle text without mentions', () => {
      const text = 'Hello world!';
      
      const result = parseMentions(text);
      
      expect(result).toEqual([
        { type: 'text', content: 'Hello world!' }
      ]);
    });

    it('should handle empty text', () => {
      const text = '';
      
      const result = parseMentions(text);
      
      expect(result).toEqual([]);
    });

    it('should handle mentions with special characters in names', () => {
      const text = '@[Test User (Admin)](user-123)';
      
      const result = parseMentions(text);
      
      expect(result).toEqual([
        { 
          type: 'mention', 
          content: '@Test User (Admin)',
          data: { id: 'user-123', name: 'Test User (Admin)' }
        }
      ]);
    });

    it('should handle consecutive mentions', () => {
      const text = '@[User1](id1)@[User2](id2)';
      
      const result = parseMentions(text);
      
      expect(result).toEqual([
        { 
          type: 'mention', 
          content: '@User1',
          data: { id: 'id1', name: 'User1' }
        },
        { 
          type: 'mention', 
          content: '@User2',
          data: { id: 'id2', name: 'User2' }
        }
      ]);
    });
  });

  describe('extractMentionedPersonas', () => {
    it('should extract single persona ID', () => {
      const text = 'Hello @[Test User](user-123)!';
      
      const result = extractMentionedPersonas(text);
      
      expect(result).toEqual(['user-123']);
    });

    it('should extract multiple persona IDs', () => {
      const text = '@[User1](id1) and @[User2](id2) and @[User3](id3)';
      
      const result = extractMentionedPersonas(text);
      
      expect(result).toEqual(['id1', 'id2', 'id3']);
    });

    it('should return empty array for no mentions', () => {
      const text = 'Hello world!';
      
      const result = extractMentionedPersonas(text);
      
      expect(result).toEqual([]);
    });

    it('should handle duplicate mentions', () => {
      const text = '@[User1](id1) and @[User1](id1) again';
      
      const result = extractMentionedPersonas(text);
      
      expect(result).toEqual(['id1', 'id1']);
    });

    it('should handle empty text', () => {
      const text = '';
      
      const result = extractMentionedPersonas(text);
      
      expect(result).toEqual([]);
    });
  });
});