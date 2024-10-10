import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { SidebarOptions } from "../../components/SidebarView/SidebarView";
import Chat from "./Chat";
import { mockDispatch, renderWithContext } from "../../test/test.utils";
import { act } from "react-dom/test-utils";

import * as api from "../../api";
import {
  citationObj,
  conversationResponseWithExceptionFromAI,
  enterKeyCodes,
  escapeKeyCodes,
  simpleConversationResponse,
  simpleConversationResponseWithCitations,
  simpleConversationResponseWithEmptyChunk,
  spaceKeyCodes,
} from "../../../__mocks__/SampleData";

jest.mock("../../api", () => ({
  conversationApi: jest.fn(),
  // getAssistantTypeApi: jest.fn(),
  // getFrontEndSettings: jest.fn(),
  // historyList: jest.fn(),
  // historyUpdate: jest.fn(),
}));

const mockConversationApi = api.conversationApi as jest.Mock;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createMockConversationAPI = () => {
  mockConversationApi.mockResolvedValueOnce({
    body: {
      getReader: jest.fn().mockReturnValue({
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify(simpleConversationResponseWithCitations)
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify(simpleConversationResponseWithEmptyChunk)
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify(simpleConversationResponse)
            ),
          })
          .mockResolvedValueOnce({ done: true }), // Mark the stream as done
      }),
    },
  });
};

const createMockConversationWithDelay = () => {
  mockConversationApi.mockResolvedValueOnce({
    body: {
      getReader: jest.fn().mockReturnValue({
        read: jest
          .fn()
          .mockResolvedValueOnce(
            delay(5000).then(() => ({
              done: false,
              value: new TextEncoder().encode(
                JSON.stringify(simpleConversationResponseWithCitations)
              ),
            }))
          )
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify(simpleConversationResponseWithEmptyChunk)
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify(simpleConversationResponse)
            ),
          })
          .mockResolvedValueOnce({ done: true }), // Mark the stream as done
      }),
    },
  });
};

const createMockConversationAPIWithError = () => {
  mockConversationApi.mockResolvedValueOnce({
    body: {
      getReader: jest.fn().mockReturnValue({
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify(conversationResponseWithExceptionFromAI)
            ),
          })
          .mockResolvedValueOnce({ done: true }), // Mark the stream as done
      }),
    },
  });
};

const createMockConversationAPIWithErrorInReader = () => {
  mockConversationApi.mockResolvedValueOnce({
    body: {
      getReader: jest.fn().mockReturnValue({}),
    },
  });
};

jest.mock("../../components/SidebarView/SidebarView", () => ({
  SidebarView: () => <div>Mocked SidebarView</div>,
  SidebarOptions: {
    DraftDocuments: "DraftDocuments",
    Grant: "Grant",
    Article: "Article",
  },
}));

jest.mock(
  "../../components/CitationPanel/CitationPanel",
  () => (props: any) => {
    const { onClickAddFavorite } = props;
    return (
      <div>
        <div data-testid="citation-panel-component">
          Citation Panel Component
        </div>
        <div data-testid="add-favorite" onClick={() => onClickAddFavorite()}>
          Add Citation to Favorite
        </div>
      </div>
    );
  }
);

jest.mock(
  "../../components/ChatMessageContainer/ChatMessageContainer",
  () =>
    (props: {
      messages: any;
      onShowCitation: any;
      showLoadingMessage: any;
    }) => {
      console.log("ChatMessageContainer", props);
      const [ASSISTANT, TOOL, ERROR, USER] = [
        "assistant",
        "tool",
        "error",
        "user",
      ];
      const { messages, onShowCitation, showLoadingMessage } = props;

      return (
        <div>
          <div>ChatMessage Container Component</div>
          {messages.map((answer: any, index: number) => (
            <div data-testid="chat-message-item">
              {answer.role === USER ? (
                <div data-testid="user-content">{answer.content}</div>
              ) : answer.role === ASSISTANT ? (
                <div data-testid="assistant-content">
                  <div>{answer.content}</div>
                </div>
              ) : answer.role === ERROR ? (
                <div data-testid="error-content">
                  <span>Error</span>
                  <span>{answer.content}</span>
                </div>
              ) : null}
            </div>
          ))}
          <button
            data-testid="show-citation-btn"
            onClick={() => onShowCitation(citationObj)}
          >
            Show Citation
          </button>
        </div>
      );
    }
);

const firstQuestion = "Hi";

jest.mock("../../components/QuestionInput", () => ({
  QuestionInput: (props: any) => {
    // console.log("Question input props", props);
    return (
      <div>
        <div>Question Input Component</div>
        <div
          data-testid="submit-first-question"
          onClick={() => props.onSend(firstQuestion)}
        >
          submit-first-question
        </div>
        <div
          data-testid="submit-second-question"
          onClick={() => props.onSend("Hi", "convId")}
        >
          submit-second-question
        </div>
      </div>
    );
  },
}));

const renderComponent = (
  props: { chatType: SidebarOptions | null | undefined },
  contextData = {}
) => {
  return renderWithContext(<Chat chatType={props.chatType} />, contextData);
};

const expectedMessages = expect.arrayContaining([
  expect.objectContaining({
    id: expect.any(String),
    role: "user",
    content: firstQuestion,
    date: expect.any(String),
  }),
]);

const expectedPayload = expect.objectContaining({
  id: expect.any(String),
  title: firstQuestion,
  messages: expectedMessages,
  date: expect.any(String),
});

describe("Chat Component", () => {
  const consoleErrorMock = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should show 'Explore scientific journals header' for Articles", () => {
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByRole } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const h2Element = getByRole("heading", { level: 2 });
    expect(h2Element).toHaveTextContent("Explore scientific journals");
  });

  test("should show 'Explore grant documents' header for Articles", () => {
    const contextData = { sidebarSelection: SidebarOptions?.Grant };
    const { getByRole } = renderComponent(
      { chatType: SidebarOptions.Grant },
      contextData
    );
    const h2Element = getByRole("heading", { level: 2 });
    expect(h2Element).toHaveTextContent("Explore grant documents");
  });

  test("Should be able to stop the generation by clicking Stop Generating btn", async () => {
    createMockConversationWithDelay();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-first-question");
    act(() => {
      fireEvent.click(submitQuestionElement);
    });

    expect(await screen.findByText("Stop generating")).toBeInTheDocument();
    const stopGeneratingBtn = screen.getByRole("button", {
      name: "Stop generating",
    });
    expect(stopGeneratingBtn).toBeInTheDocument();

    screen.debug();
    await act(async () => {
      fireEvent.click(stopGeneratingBtn);
    });
    const stopGeneratingBtnAfterClick = screen.queryByRole("button", {
      name: "Stop generating",
    });
    expect(stopGeneratingBtnAfterClick).not.toBeInTheDocument();
  });

  test.only("Should be able to stop the generation by Focus and Triggering  Enter in Keyboard", async () => {
    createMockConversationWithDelay();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-first-question");
    act(() => {
      fireEvent.click(submitQuestionElement);
    });

    expect(await screen.findByText("Stop generating")).toBeInTheDocument();
    const stopGeneratingBtn = screen.getByRole("button", {
      name: "Stop generating",
    });
    expect(stopGeneratingBtn).toBeInTheDocument();

    await act(async () => {
      stopGeneratingBtn.focus();
      // Trigger the Enter key
      fireEvent.keyDown(stopGeneratingBtn, enterKeyCodes);
    });
    const stopGeneratingBtnAfterClick = screen.queryByRole("button", {
      name: "Stop generating",
    });
    expect(stopGeneratingBtnAfterClick).not.toBeInTheDocument();
  });

  test.only("Should be able to stop the generation by Focus and Triggering Space in Keyboard", async () => {
    createMockConversationWithDelay();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-first-question");
    act(() => {
      fireEvent.click(submitQuestionElement);
    });

    expect(await screen.findByText("Stop generating")).toBeInTheDocument();
    const stopGeneratingBtn = screen.getByRole("button", {
      name: "Stop generating",
    });
    expect(stopGeneratingBtn).toBeInTheDocument();

    await act(async () => {
      stopGeneratingBtn.focus();
      fireEvent.keyDown(stopGeneratingBtn, spaceKeyCodes);
    });
    const stopGeneratingBtnAfterClick = screen.queryByRole("button", {
      name: "Stop generating",
    });
    expect(stopGeneratingBtnAfterClick).not.toBeInTheDocument();
  });

  test.only("Focus on Stop generating btn and Triggering Any key other than Enter/Space should not hide the Stop Generating btn", async () => {
    createMockConversationWithDelay();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-first-question");
    act(() => {
      fireEvent.click(submitQuestionElement);
    });

    expect(await screen.findByText("Stop generating")).toBeInTheDocument();
    const stopGeneratingBtn = screen.getByRole("button", {
      name: "Stop generating",
    });
    expect(stopGeneratingBtn).toBeInTheDocument();

    await act(async () => {
      stopGeneratingBtn.focus();
      fireEvent.keyDown(stopGeneratingBtn, escapeKeyCodes);
    });
    const stopGeneratingBtnAfterClick = screen.queryByRole("button", {
      name: "Stop generating",
    });
    expect(stopGeneratingBtnAfterClick).not.toBeInTheDocument();
  });

  test.skip("on user sends first question should handle conversation API call", async () => {
    createMockConversationAPI();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );

    const submitQuestionElement = getByTestId("submit-first-question");
    await act(async () => {
      fireEvent.click(submitQuestionElement);
    });

    // expect(mockDispatch).toHaveBeenCalledWith({
    //   type: "UPDATE_CURRENT_CHAT",
    //   payload: expectedPayload,
    // });
  });

  test.skip("on user sends second question but conversation chat not exist should handle", async () => {
    createMockConversationAPI();

    const contextData = { sidebarSelection: SidebarOptions?.Article };

    const { getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-second-question");

    await act(async () => {
      fireEvent.click(submitQuestionElement);
    });

    expect(consoleErrorMock).toHaveBeenCalled();
  });

  test("should handle API call when sends question conv Id exists and previous conversation chat exists ", async () => {
    createMockConversationAPI();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-first-question");
    await act(async () => {
      fireEvent.click(submitQuestionElement);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "UPDATE_CURRENT_CHAT",
      payload: expectedPayload,
    });
  });

  test("on Click Clear button messages should be empty", async () => {
    createMockConversationAPI();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByRole, getByTestId, queryAllByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-first-question");
    await act(async () => {
      fireEvent.click(submitQuestionElement);
    });
    const chatElementsBeforeClear = queryAllByTestId("chat-message-item");
    expect(chatElementsBeforeClear.length).toBeGreaterThan(0);

    const clearChatButton = getByRole("button", { name: "clear chat button" });
    expect(clearChatButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(clearChatButton);
    });
    const chatElementsAfterClear = queryAllByTestId("chat-message-item");
    expect(chatElementsAfterClear.length).toEqual(0);
  });

  test("Exception in AI response should handle properly", async () => {
    createMockConversationAPIWithError();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-first-question");
    await act(async () => {
      fireEvent.click(submitQuestionElement);
    });
    const errorContent = getByTestId("error-content");
    expect(errorContent).toBeInTheDocument();
  });

  test("If Error in response body or reader not available should handle properly with error message", async () => {
    createMockConversationAPIWithErrorInReader();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByText, getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-first-question");
    await act(async () => {
      fireEvent.click(submitQuestionElement);
    });
    const errorTextElement = getByText(
      "An error occurred. Please try again. If the problem persists, please contact the site administrator."
    );
    expect(errorTextElement).toBeInTheDocument();
  });
  test.skip("On Click citation should show citation panel", async () => {
    createMockConversationAPI();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-first-question");
    act(() => {
      fireEvent.click(submitQuestionElement);
    });

    const showCitationButton = getByTestId("show-citation-btn");
    await act(async () => {
      fireEvent.click(showCitationButton);
    });

    expect(
      await screen.findByTestId("citation-panel-component")
    ).toBeInTheDocument();
    // expect(citationPanelComponent).toBeInTheDocument();
  });

  test.only("After view Citation Should be able to add to Facourite ", async () => {
    createMockConversationAPI();
    const contextData = { sidebarSelection: SidebarOptions?.Article };
    const { getByTestId } = renderComponent(
      { chatType: SidebarOptions.Article },
      contextData
    );
    const submitQuestionElement = getByTestId("submit-first-question");
    act(() => {
      fireEvent.click(submitQuestionElement);
    });

    const showCitationButton = getByTestId("show-citation-btn");
    await act(async () => {
      fireEvent.click(showCitationButton);
    });

    expect(
      await screen.findByTestId("citation-panel-component")
    ).toBeInTheDocument();

    const addFavoriteBtn = getByTestId("add-favorite");
    await act(async () => {
      fireEvent.click(addFavoriteBtn);
    });

    // expect(mockDispatch).toHaveBeenCalledWith({ type: "UPDATE_ARTICLES_CHAT" });
    // expect(mockDispatch).toHaveBeenCalledWith({ type: "TOGGLE_SIDEBAR" });
    // expect(mockDispatch).toHaveBeenCalledWith({ type: "TOGGLE_SIDEBAR" });
    // // expect(mockDispatch).toHaveBeenCalledWith({ type: "TOGGLE_SIDEBAR" });
  });
});
