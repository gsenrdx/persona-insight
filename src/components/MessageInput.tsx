import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (messageText: string) => void;
  isLoading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText(''); // 입력 필드 비우기
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      event.preventDefault(); // Enter 키 기본 동작 (줄바꿈 등) 방지
      handleSubmit();
    }
  };

  return (
    <div style={{ display: 'flex', marginTop: '10px', padding: '10px', borderTop: '1px solid #eee' }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        style={{
          flexGrow: 1,
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '20px',
          marginRight: '10px',
          outline: 'none',
        }}
        placeholder="Type a message..."
        disabled={isLoading}
      />
      <button
        onClick={handleSubmit}
        disabled={isLoading || !text.trim()}
        style={{
          padding: '10px 20px',
          backgroundColor: isLoading || !text.trim() ? '#b0bec5' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          cursor: isLoading || !text.trim() ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
};

export default MessageInput;
