import React from 'react';
import { ClientMessage, SentMessage } from '../utils/messageUtils'; // 경로 수정 필요 시 확인

type Message = ClientMessage | SentMessage; // chat-interface.tsx와 동일한 타입 사용

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  if (!messages.length) {
    return <div style={{ textAlign: 'center', color: '#aaa', marginTop: '20px' }}>No messages yet.</div>;
  }

  return (
    <div style={{ border: '1px solid #ccc', height: '300px', overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column-reverse' }}>
      {/* 메시지를 아래부터 쌓고, 새 메시지가 오면 위로 밀려나도록 flex-direction: column-reverse 사용 */}
      {/* 실제 채팅처럼 보이려면 messages 배열을 reverse하거나 CSS 추가 조정 필요 */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg) => (
          <div
            key={msg.id.toString()}
            style={{
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              margin: '5px 0',
            }}
          >
            <span
              style={{
                backgroundColor: msg.sender === 'user' ? '#dcf8c6' : '#f1f0f0',
                padding: '8px 12px',
                borderRadius: '12px',
                display: 'inline-block',
                maxWidth: '70%',
                wordWrap: 'break-word',
              }}
            >
              {msg.text}
              {(msg as ClientMessage).status === 'sending' && <small style={{ marginLeft: '5px', color: '#888' }}>(Sending...)</small>}
              {(msg as ClientMessage).status === 'failed' && <small style={{ marginLeft: '5px', color: 'red' }}>(Failed to send)</small>}
              {msg.sender === 'bot' && (msg as SentMessage).timestamp && (
                <small style={{ display: 'block', textAlign: 'right', fontSize: '0.7em', color: '#999', marginTop: '3px' }}>
                  {new Date((msg as SentMessage).timestamp!).toLocaleTimeString()}
                </small>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessageList;
