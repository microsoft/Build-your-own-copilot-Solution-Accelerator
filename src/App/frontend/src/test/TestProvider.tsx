// AppProvider.tsx
import React, { createContext, useReducer, ReactNode } from 'react';
import { Conversation, ChatHistoryLoadingState } from '../api/models';
// Define the AppState interface
export interface AppState {
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

// Define the context
export const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<any>;
}>({
  state: {} as AppState,
  dispatch: () => {},
});
