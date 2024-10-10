import React from "react";
import { render, RenderResult } from "@testing-library/react";
import { AppStateContext } from "../state/AppProvider";
import { Conversation, ChatMessage } from "../api/models";

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

const mockAppContextStateProvider = (
  state: any,
  mockedDispatch: any,
  component: any
) => {
  return (
    <AppStateContext.Provider
      value={{ state: state, dispatch: mockedDispatch }}
    >
      {component}
    </AppStateContext.Provider>
  );
};

// Create a custom render function
const renderWithContext = (
  component: React.ReactElement,
  updatedContext = {},
  mockDispatchFunc = mockDispatch
): RenderResult => {
  const state = { ...defaultMockState, ...updatedContext };
  return render(
    mockAppContextStateProvider(state, mockDispatchFunc, component)
  );
};

const renderWithNoContext = (component: React.ReactElement): RenderResult => {
  return render(
    <AppStateContext.Provider value={undefined}>
      {component}
    </AppStateContext.Provider>
  );
};

// Mocked conversation and chat message
const mockChatMessage: ChatMessage = {
  id: "msg1",
  role: "user",
  content: "Test message content",
  date: new Date().toISOString(),
};

const mockConversation: Conversation = {
  id: "1",
  title: "Test Conversation",
  messages: [mockChatMessage],
  date: new Date().toISOString(),
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export {
  defaultMockState,
  renderWithContext,
  mockDispatch,
  mockChatMessage,
  mockConversation,
  renderWithNoContext,
  mockAppContextStateProvider,
  delay
};
export * from "@testing-library/react";
