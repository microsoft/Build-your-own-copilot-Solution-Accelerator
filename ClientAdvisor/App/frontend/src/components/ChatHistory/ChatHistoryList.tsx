import React, { useContext,useEffect } from 'react'
import { Stack, StackItem, Text } from '@fluentui/react'

import { Conversation , GroupedChatHistory } from '../../api/models'
import {groupByMonth} from '../../helpers/helpers';
import { AppStateContext } from '../../state/AppProvider'

import { ChatHistoryListItemGroups } from './ChatHistoryListItem'

interface ChatHistoryListProps {}



export const ChatHistoryList: React.FC<ChatHistoryListProps> = () => {
  const appStateContext = useContext(AppStateContext)
  const chatHistory = appStateContext?.state.chatHistory

  useEffect(() => {}, [appStateContext?.state.chatHistory])

  let groupedChatHistory
  if (chatHistory && chatHistory.length > 0) {
    groupedChatHistory = groupByMonth(chatHistory)
  } else {
    return (
      <Stack horizontal horizontalAlign="center" verticalAlign="center" style={{ width: '100%', marginTop: 10 }}>
        <StackItem>
          <Text style={{ alignSelf: 'center', fontWeight: '400', fontSize: 14 }}>
            <span>No chat history.</span>
          </Text>
        </StackItem>
      </Stack>
    )
  }

  return <ChatHistoryListItemGroups groupedChatHistory={groupedChatHistory} />
}


