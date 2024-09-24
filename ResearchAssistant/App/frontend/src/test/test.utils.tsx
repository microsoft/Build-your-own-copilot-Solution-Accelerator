import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { AppStateContext } from '../state/AppProvider';
import { Conversation, ChatMessage } from '../api/models'; 

// Default mock state
const defaultMockState = {
  currentChat: null,
  articlesChat: null,
  grantsChat: null,
  frontendSettings: null,
  documentSections: null,
  researchTopic: "Test topic",
  favoritedCitations: [],
  isSidebarExpanded: false,
  isChatViewOpen: true,
  sidebarSelection: null,
  showInitialChatMessage: false,
};

const mockDispatch = jest.fn();

// Create a custom render function
const renderWithContext = (
  component: React.ReactElement,
  contextState = {}
): RenderResult => {
  const state = { ...defaultMockState, ...contextState };
  return render(
    <AppStateContext.Provider value={{ state, dispatch: mockDispatch }}>
      {component}
    </AppStateContext.Provider>
  );
};

// Mocked conversation and chat message
const mockChatMessage: ChatMessage = {
  id: 'msg1',
  role: 'user',
  content: 'Test message content',
  date: new Date().toISOString(),
};

const mockConversation: Conversation = {
  id: '1',
  title: 'Test Conversation',
  messages: [mockChatMessage],
  date: new Date().toISOString(),
};

export { defaultMockState, renderWithContext, mockDispatch, mockChatMessage, mockConversation };
export * from '@testing-library/react';
