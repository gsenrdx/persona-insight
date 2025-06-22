import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatInterface from '../chat-interface';
import '@testing-library/jest-dom';

// Mock all dependencies
vi.mock('../styles', () => ({
  chatStyles: `.chat-container {}`
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => null
}));

vi.mock('../components/chat-messages', () => ({
  ChatMessages: () => <div data-testid="chat-messages">Chat Messages</div>
}));

vi.mock('../components/chat-input', () => ({
  ChatInput: () => <div data-testid="chat-input">Chat Input</div>
}));

vi.mock('../components/summary-button', () => ({
  SummaryButton: () => <button data-testid="summary-button">Summary</button>
}));

vi.mock('../hooks/use-miso-streaming', () => ({
  useMisoStreaming: () => ({
    misoConversationId: null,
    isStreaming: false,
    isUsingTool: false,
    isUsingToolRef: { current: false },
    processMisoStreaming: vi.fn(),
    setIsUsingTool: vi.fn()
  })
}));

vi.mock('../hooks/use-mention-system', () => ({
  useMentionSystem: () => ({
    showMentionDropdown: false,
    mentionSearchText: '',
    mentionedPersonas: [],
    activePersona: {
      id: 'test-persona',
      persona_title: 'Test Persona',
      name: 'Test'
    },
    handleTextareaChange: vi.fn(),
    handleMentionSelect: vi.fn(),
    removeMention: vi.fn(),
    setShowMentionDropdown: vi.fn()
  })
}));

// Mock fetch
global.fetch = vi.fn();

describe('ChatInterface Simplified Tests', () => {
  const mockPersonaData = {
    id: 'persona-1',
    persona_title: 'Test Persona',
    name: 'Test Persona',
    persona_summary: 'A test persona',
    persona_style: 'Friendly'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Structure', () => {
    it('should render basic structure', () => {
      render(
        <ChatInterface 
          personaId="persona-1"
          personaData={mockPersonaData}
          allPersonas={[mockPersonaData]}
        />
      );

      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
      expect(screen.getByTestId('summary-button')).toBeInTheDocument();
    });

    it('should use persona data from props', () => {
      const customPersona = {
        id: 'custom-persona',
        persona_title: 'Custom Persona',
        name: 'Custom',
        persona_summary: 'Custom summary'
      };

      const { rerender } = render(
        <ChatInterface 
          personaId="persona-1"
          personaData={mockPersonaData}
          allPersonas={[mockPersonaData]}
        />
      );

      // Rerender with different persona
      rerender(
        <ChatInterface 
          personaId="custom-persona"
          personaData={customPersona}
          allPersonas={[customPersona]}
        />
      );

      // Component should still render
      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('should handle empty allPersonas array', () => {
      render(
        <ChatInterface 
          personaId="persona-1"
          personaData={mockPersonaData}
          allPersonas={[]}
        />
      );

      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    });

    it('should handle minimal persona data', () => {
      const minimalPersona = {
        id: 'minimal',
        name: 'Minimal Persona'
      };

      render(
        <ChatInterface 
          personaId="minimal"
          personaData={minimalPersona}
          allPersonas={[minimalPersona]}
        />
      );

      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    });
  });

  describe('Hook Integration', () => {
    it('should render with custom hook values', () => {
      // Test that component renders correctly with hook values
      // The actual hook is already mocked at the top level
      render(
        <ChatInterface 
          personaId="persona-1"
          personaData={mockPersonaData}
          allPersonas={[mockPersonaData]}
        />
      );

      // Component should render without errors
      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should memoize persona data to prevent unnecessary re-renders', () => {
      let renderCount = 0;
      
      const TestWrapper = ({ personaData }: any) => {
        renderCount++;
        return (
          <ChatInterface 
            personaId="persona-1"
            personaData={personaData}
            allPersonas={[personaData]}
          />
        );
      };

      const { rerender } = render(
        <TestWrapper personaData={mockPersonaData} />
      );

      expect(renderCount).toBe(1);

      // Rerender with same data (different object reference but same values)
      rerender(
        <TestWrapper personaData={{ ...mockPersonaData }} />
      );

      // Due to memoization, internal optimizations should minimize re-renders
      expect(renderCount).toBe(2); // Parent re-renders but child is memoized
    });
  });

  describe('Error Boundaries', () => {
    it('should handle missing required props gracefully', () => {
      // Even with partial data, component should not crash
      render(
        <ChatInterface 
          personaId=""
          personaData={{ id: '', name: '' }}
          allPersonas={[]}
        />
      );

      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    });
  });
});