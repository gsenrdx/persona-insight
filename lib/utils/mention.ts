export interface MentionData {
  id: string;
  name: string;
  avatar?: string;
}

export interface ParsedMention {
  type: 'text' | 'mention';
  content: string;
  data?: MentionData;
}

// 멘션 패턴: @[페르소나명](페르소나ID)
const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * @ 위치와 이후 텍스트를 찾는 함수
 */
export function findMentionContext(text: string, cursorPosition: number): {
  mentionStart: number;
  searchText: string;
  isInMention: boolean;
} {
  // 커서 위치 이전에서 가장 가까운 @ 찾기
  const beforeCursor = text.substring(0, cursorPosition);
  const lastAtIndex = beforeCursor.lastIndexOf('@');
  
  if (lastAtIndex === -1) {
    return { mentionStart: -1, searchText: '', isInMention: false };
  }
  
  // @ 이후 공백이 있으면 멘션이 아님
  const afterAt = text.substring(lastAtIndex + 1, cursorPosition);
  if (afterAt.includes(' ') || afterAt.includes('\n')) {
    return { mentionStart: -1, searchText: '', isInMention: false };
  }
  
  return {
    mentionStart: lastAtIndex,
    searchText: afterAt,
    isInMention: true
  };
}

/**
 * 텍스트에 멘션을 삽입하는 함수
 */
export function insertMention(
  text: string,
  cursorPosition: number,
  mention: MentionData
): {
  newText: string;
  newCursorPosition: number;
} {
  const mentionContext = findMentionContext(text, cursorPosition);
  
  if (!mentionContext.isInMention) {
    return { newText: text, newCursorPosition: cursorPosition };
  }
  
  const mentionText = `@[${mention.name}](${mention.id})`;
  const beforeMention = text.substring(0, mentionContext.mentionStart);
  const afterMention = text.substring(cursorPosition);
  
  const newText = beforeMention + mentionText + afterMention;
  const newCursorPosition = mentionContext.mentionStart + mentionText.length;
  
  return { newText, newCursorPosition };
}

/**
 * 텍스트에서 멘션을 파싱하는 함수
 */
export function parseMentions(text: string): ParsedMention[] {
  const parts: ParsedMention[] = [];
  let lastIndex = 0;
  
  text.replace(MENTION_PATTERN, (match, name, id, offset) => {
    // 멘션 이전 텍스트 추가
    if (offset > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, offset)
      });
    }
    
    // 멘션 추가
    parts.push({
      type: 'mention',
      content: `@${name}`,
      data: { id, name }
    });
    
    lastIndex = offset + match.length;
    return match;
  });
  
  // 마지막 텍스트 추가
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  return parts;
}

/**
 * 멘션된 페르소나 ID들을 추출하는 함수
 */
export function extractMentionedPersonas(text: string): string[] {
  const mentions: string[] = [];
  text.replace(MENTION_PATTERN, (match, name, id) => {
    mentions.push(id);
    return match;
  });
  return mentions;
}