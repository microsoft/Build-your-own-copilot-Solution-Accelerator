import { useRef, useState, useEffect, useContext, useLayoutEffect } from 'react'
import styles from '../Chat.module.css';
import { Answer } from '../../../components/Answer';
import {parseCitationFromMessage } from '../../../helpers/helpers';
import { Stack } from '@fluentui/react'
import {  ErrorCircleRegular } from '@fluentui/react-icons'
import {Citation , ChatMessage} from '../../../api/models';

interface ChatMessageContainerProps {
    messages: ChatMessage[];
    isLoading: boolean;
    showLoadingMessage: boolean;
    onShowCitation: (citation: Citation) => void;
  }

export const ChatMessageContainer = (props : ChatMessageContainerProps)=>{
    const [ASSISTANT, TOOL, ERROR] = ['assistant', 'tool', 'error']

    return (
        <div id="chatMessagesContainer" className={styles.chatMessageStream} style={{ marginBottom: props.isLoading ? '40px' : '0px' }} role="log">
        {props.messages.map((answer : any, index : number) => (
          <>
            {answer.role === 'user' ? (
              <div className={styles.chatMessageUser} tabIndex={0}>
                <div className={styles.chatMessageUserMessage}>{answer.content}</div>
              </div>
            ) : answer.role === 'assistant' ? (
              <div className={styles.chatMessageGpt}>
                <Answer
                  answer={{
                    answer: answer.content,
                    citations: parseCitationFromMessage(props.messages[index - 1]),
                    message_id: answer.id,
                    feedback: answer.feedback
                  }}
                  onCitationClicked={c => props.onShowCitation(c)}
                />
              </div>
            ) : answer.role === ERROR ? (
              <div className={styles.chatMessageError}>
                <Stack horizontal className={styles.chatMessageErrorContent}>
                  <ErrorCircleRegular className={styles.errorIcon} style={{ color: 'rgba(182, 52, 67, 1)' }} />
                  <span>Error</span>
                </Stack>
                <span className={styles.chatMessageErrorContent}>{answer.content}</span>
              </div>
            ) : null}
          </>
        ))}
        {props.showLoadingMessage && (
          <>
            <div className={styles.chatMessageGpt}>
              <Answer
                answer={{
                  answer: 'Generating answer...',
                  citations: []
                }}
                onCitationClicked={() => null}
              />
            </div>
          </>
        )}
      </div>
    )
}