// test-utils.tsx
import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { AppStateContext, AppState } from './TestProvider'; // Adjust import path if needed
import { Conversation, ChatHistoryLoadingState } from '../api/models';

// Define the extended state type if necessary
interface MockState extends AppState {
  chatHistory: Conversation[];
  isCosmosDBAvailable: { cosmosDB: boolean; status: string };
  isChatHistoryOpen: boolean;
  filteredChatHistory: Conversation[];
  currentChat: Conversation | null;
  frontendSettings: Record<string, unknown>;
  feedbackState: Record<string, unknown>;
  clientId: string;
  isRequestInitiated: boolean;
  isLoader: boolean;
  chatHistoryLoadingState: ChatHistoryLoadingState;
}

// Default mock state
const defaultMockState: MockState = {
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
const renderWithContext = (contextValue: Partial<MockState> & { children: React.ReactNode }): RenderResult => {
  const value = { ...defaultMockState, ...contextValue };
  return render(
    <AppStateContext.Provider value={{ state: value, dispatch: jest.fn() }}>
      {contextValue.children}
    </AppStateContext.Provider>
  );
};

export * from '@testing-library/react';
export { renderWithContext };
