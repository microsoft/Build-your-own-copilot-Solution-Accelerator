import React, { useContext } from 'react'
import { Stack, StackItem, Text } from '@fluentui/react'

import { Conversation } from '../../api/models'
import { AppStateContext } from '../../state/AppProvider'

import { ChatHistoryListItemGroups } from './ChatHistoryListItem'

interface ChatHistoryListProps { }

export interface GroupedChatHistory {
  title: string
  entries: Conversation[]
}

// Helper function to format dates
const formatDate = (date: Date, includeWeekday = false) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  if (includeWeekday) {
    options.weekday = 'long';
  }
  return date.toLocaleDateString(undefined, options);
};


function isLastSevenDaysRange(dateToCheck: any) {
  // Get the current date
  const currentDate = new Date();
  // Calculate the date 2 days ago
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(currentDate.getDate() - 2);
  // Calculate the date 8 days ago
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(currentDate.getDate() - 8);
  // Ensure the comparison dates are in the correct order
  // We need eightDaysAgo to be earlier than twoDaysAgo
  return dateToCheck >= eightDaysAgo && dateToCheck <= twoDaysAgo;
}

const segregateItems = (items: Conversation[]) => {
  const today = new Date();
  const yesterday = new Date(today);
  const last7Days = []
  yesterday.setDate(today.getDate() - 1);

  // Sort items by updatedAt in descending order
  items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const groupedItems: {
    Today: Conversation[],
    Yesterday: Conversation[],
    Last7Days: Conversation[],
    Older: Conversation[],
    Past: { [key: string]: Conversation[] },
  } = {
    Today: [],
    Yesterday: [],
    Last7Days: [],
    Older: [],
    Past: {},
  };

  items.forEach(item => {
    const itemDate = new Date(item.updatedAt);
    const itemDateOnly = itemDate.toDateString();
    if (itemDateOnly === today.toDateString()) {
      groupedItems.Today.push(item);
    } else if (itemDateOnly === yesterday.toDateString()) {
      groupedItems.Yesterday.push(item);
    }
    else if (isLastSevenDaysRange(itemDate)) {
      groupedItems.Last7Days.push(item);
    }
    else {
      groupedItems.Older.push(item);
    }
  });

  const finalResult = [
    { title: `Today`, entries: groupedItems.Today },
    {
      title: `Yesterday`,
      entries: groupedItems.Yesterday,
    },
    {
      title: `Last 7 days`,
      entries: groupedItems.Last7Days,
    },
    {
      title: `Older`,
      entries: groupedItems.Older,
    },
  ];

  return finalResult;
};


const ChatHistoryList: React.FC<ChatHistoryListProps> = () => {
  const appStateContext = useContext(AppStateContext)
  const chatHistory = appStateContext?.state.chatHistory
  React.useEffect(() => { }, [appStateContext?.state.chatHistory])
  let groupedChatHistory
  if (chatHistory && chatHistory.length > 0) {
    groupedChatHistory = segregateItems(chatHistory)
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

export default ChatHistoryList
