// test-utils.tsx
import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { AppStateContext } from '../state/AppProvider';
import { Conversation, ChatHistoryLoadingState } from '../api/models'; 
// Default mock state
const defaultMockState = {
  chatHistory: [],
  isCosmosDBAvailable: { cosmosDB: true, status: 'success' },
  isChatHistoryOpen: true,
  filteredChatHistory: [],
  currentChat: null,
  frontendSettings: {},
  feedbackState: {},
  clientId: '',
  isRequestInitiated: false,
  isLoader: false,
  chatHistoryLoadingState: ChatHistoryLoadingState.Loading,
};

// Create a custom render function
const renderWithContext = (
  component: React.ReactElement,
  contextState = {}
): RenderResult => {
  const state = { ...defaultMockState, ...contextState };
  return render(
    <AppStateContext.Provider value={{ state, dispatch: jest.fn() }}>
      {component}
    </AppStateContext.Provider>
  );
};

export * from '@testing-library/react';
export { renderWithContext };
