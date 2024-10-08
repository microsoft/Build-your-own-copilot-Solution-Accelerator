import { Fragment } from "react";
import { Stack } from "@fluentui/react";
import { ToolMessageContent, type ChatMessage, type Citation } from "../../api";
import styles from "./AnswersList.module.css";
import { Answer } from "../Answer/Answer";
import { ErrorCircleRegular } from "@fluentui/react-icons";

type AnswersListProps = {
  messages: ChatMessage[];
  onShowCitation: (citation: Citation) => void;
};

const parseCitationFromMessage = (message: ChatMessage) => {
  if (message?.role && message?.role === "tool") {
    try {
      const toolMessage = JSON.parse(message.content) as ToolMessageContent;
      return toolMessage.citations;
    } catch {
      return [];
    }
  }
  return [];
};

const AnswersList = (props: AnswersListProps): JSX.Element => {
  const [ASSISTANT, TOOL, ERROR, USER] = ["assistant", "tool", "error", "user"];
  const { messages, onShowCitation } = props;
  return (
    <Fragment>
      {messages.map((answer, index) => (
        <Fragment key={answer.role + index}>
          {answer.role === USER ? (
            <div className={styles.chatMessageUser} tabIndex={0}>
              <div className={styles.chatMessageUserMessage}>
                {answer.content}
              </div>
            </div>
          ) : answer.role === ASSISTANT ? (
            <div className={styles.chatMessageGpt}>
              <Answer
                answer={{
                  answer: answer.content,
                  citations: parseCitationFromMessage(messages[index - 1]),
                }}
                onCitationClicked={(c) => onShowCitation(c)}
              />
            </div>
          ) : answer.role === ERROR ? (
            <div className={styles.chatMessageError}>
              <Stack horizontal className={styles.chatMessageErrorContent}>
                <ErrorCircleRegular
                  className={styles.errorIcon}
                  style={{ color: "rgba(182, 52, 67, 1)" }}
                />
                <span>Error</span>
              </Stack>
              <span className={styles.chatMessageErrorContent}>
                {answer.content}
              </span>
            </div>
          ) : null}
        </Fragment>
      ))}
    </Fragment>
  );
};

export default AnswersList;
