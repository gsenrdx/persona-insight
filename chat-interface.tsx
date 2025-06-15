import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // React Query 임포트
import { sendMessageToServer, SentMessage, MessagePayload, ApiError } from './src/services/messageService';
import { createClientMessage, ClientMessage } from './src/utils/messageUtils';
import { normalizeError, NormalizedError } from './src/utils/errorUtils';
import MessageList from './src/components/MessageList';
import MessageInput from './src/components/MessageInput';

type Message = ClientMessage | SentMessage;
type ChatError = NormalizedError; // 이전과 동일

// React Query 사용으로 useReducer가 관리할 상태가 줄어들거나 변경됨
// 여기서는 메시지 목록(UI용)은 계속 클라이언트 상태로 관리하고,
// API 호출 관련 로딩/에러는 React Query가 담당하도록 함.
// 또는 메시지 목록 자체도 React Query의 캐시를 활용하는 방법도 있으나(useQuery),
// 채팅처럼 실시간성이 중요하고 낙관적 업데이트가 복잡한 경우 일부는 직접 관리할 수 있음.

interface ChatScreenState {
  messages: Message[]; // 화면에 표시될 메시지 목록
  optimisticMessageId?: number; // 낙관적 업데이트 중인 메시지의 임시 ID
  error: ChatError | null; // UI에 표시할 에러 (useMutation의 error와 별개로 둘 수도 있음)
}

type ChatScreenAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE_STATUS_SUCCESS'; payload: { tempId: number; serverMessage: SentMessage } }
  | { type: 'UPDATE_MESSAGE_STATUS_FAILURE'; payload: { tempId: number; error: ChatError } }
  | { type: 'SET_ERROR'; payload: ChatError | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'REMOVE_MESSAGE_BY_TEMP_ID', payload: { tempId: number }}; // 낙관적 업데이트 롤백용

const initialScreenState: ChatScreenState = {
  messages: [],
  error: null,
};

function chatScreenReducer(state: ChatScreenState, action: ChatScreenAction): ChatScreenState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE_STATUS_SUCCESS':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.tempId
            ? { ...msg, ...action.payload.serverMessage, status: 'sent', id: action.payload.serverMessage.id || action.payload.tempId }
            : msg
        ),
        optimisticMessageId: undefined, // 성공 시 초기화
      };
    case 'UPDATE_MESSAGE_STATUS_FAILURE':
      return {
        ...state,
        error: action.payload.error,
        messages: state.messages.map(msg =>
          msg.id === action.payload.tempId ? { ...(msg as ClientMessage), status: 'failed' } : msg
        ),
        optimisticMessageId: undefined, // 실패 시 초기화
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'REMOVE_MESSAGE_BY_TEMP_ID': // 롤백 시 메시지 제거
        return {
            ...state,
            messages: state.messages.filter(msg => msg.id !== action.payload.tempId)
        };
    default:
      return state;
  }
}


const ChatInterface = () => {
  const [screenState, dispatch] = useReducer(chatScreenReducer, initialScreenState);
  const { messages, error } = screenState;
  const queryClient = useQueryClient(); // React Query 클라이언트

  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageListRef.current) {
      const scrollableDiv = messageListRef.current.firstChild as HTMLDivElement;
      if (scrollableDiv) {
        requestAnimationFrame(() => {
          scrollableDiv.scrollTop = scrollableDiv.scrollHeight;
        });
      }
    }
  }, [messages]);

  // React Query useMutation 사용
  const sendMessageMutation = useMutation<SentMessage, Error, MessagePayload, { tempClientMessage: ClientMessage }>(
    sendMessageToServer, // API 호출 함수
    {
      // onMutate: 낙관적 업데이트를 위해 호출 직전 실행 (선택적)
      onMutate: async (variables) => {
        // 이전 메시지 목록 캐시 (롤백 대비) - 채팅에서는 queryKey가 특정되지 않을 수 있음
        // await queryClient.cancelQueries(['chatMessages']); // 기존 쿼리 취소 (필요시)
        // const previousMessages = queryClient.getQueryData<Message[]>(['chatMessages']) || [];

        const tempClientMessage = createClientMessage(variables.message);
        dispatch({ type: 'ADD_MESSAGE', payload: tempClientMessage });

        // 롤백을 위한 컨텍스트 반환
        return { tempClientMessage };
      },
      onSuccess: (data, variables, context) => {
        // API 호출 성공 시
        if (context?.tempClientMessage) {
          dispatch({ type: 'UPDATE_MESSAGE_STATUS_SUCCESS', payload: { tempId: context.tempClientMessage.id, serverMessage: data } });
        }
        // queryClient.invalidateQueries(['chatMessages']); // 관련 쿼리 무효화 (필요시)
      },
      onError: (err, variables, context) => {
        // API 호출 실패 시
        const normalizedErr = normalizeError(err);
        dispatch({ type: 'SET_ERROR', payload: normalizedErr });
        if (context?.tempClientMessage) {
          dispatch({ type: 'UPDATE_MESSAGE_STATUS_FAILURE', payload: { tempId: context.tempClientMessage.id, error: normalizedErr } });
          // 필요하다면 여기서 메시지를 완전히 제거하는 롤백도 가능
          // dispatch({ type: 'REMOVE_MESSAGE_BY_TEMP_ID', payload: { tempId: context.tempClientMessage.id } });
        }
      },
      // onSettled: 성공/실패 여부와 관계없이 항상 실행 (여기서는 불필요)
    }
  );

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) {
      dispatch({ type: 'SET_ERROR', payload: normalizeError("Message cannot be empty.") });
      return;
    }
    if (screenState.error) dispatch({ type: 'CLEAR_ERROR' });

    // mutate 함수 호출 (variables는 sendMessageToServer의 payload)
    sendMessageMutation.mutate({ message: messageText });

  }, [screenState.error, sendMessageMutation]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '600px', margin: 'auto', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
      <header style={{ padding: '15px 20px', backgroundColor: '#007bff', color: 'white', borderBottom: '1px solid #0056b3', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.5em' }}>Chat Room</h2>
      </header>

      <div ref={messageListRef} style={{ flexGrow: 1, overflowY: 'auto', padding: '10px' }}>
        <MessageList messages={messages} /> {/* screenState.messages 사용 */}
      </div>

      {/* useMutation의 error 상태 또는 screenState.error를 사용해 에러 표시 */}
      {(sendMessageMutation.isError || error) && (
        <div style={{ padding: '10px', margin: '0 10px 10px 10px', backgroundColor: '#ffebee', color: '#c62828', textAlign: 'center', borderRadius: '4px', border: '1px solid #ef9a9a' }}>
          <strong>Error:</strong> { (error || normalizeError(sendMessageMutation.error)).message }
          { (error || normalizeError(sendMessageMutation.error)).status && <small> (Status: { (error || normalizeError(sendMessageMutation.error)).status })</small>}
          {process.env.NODE_ENV === 'development' && (error || normalizeError(sendMessageMutation.error)).details && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8em', textAlign: 'left', maxHeight: '100px', overflowY: 'auto', background: '#f9f9f9', border: '1px solid #eee', padding: '5px', marginTop: '5px' }}>
              {typeof (error || normalizeError(sendMessageMutation.error)).details === 'string' ? (error || normalizeError(sendMessageMutation.error)).details : JSON.stringify((error || normalizeError(sendMessageMutation.error)).details, null, 2)}
            </pre>
          )}
          <button onClick={() => {
              sendMessageMutation.reset(); // React Query 에러 상태 리셋
              dispatch({ type: 'CLEAR_ERROR' });
            }}
            style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2em', verticalAlign: 'middle' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* useMutation의 isLoading 상태 사용 */}
      <MessageInput onSendMessage={handleSendMessage} isLoading={sendMessageMutation.isLoading} />
    </div>
  );
};

export default ChatInterface;
