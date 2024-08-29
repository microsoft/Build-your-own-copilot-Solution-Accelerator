import React, { useContext } from 'react'
import { Stack, StackItem, Text } from '@fluentui/react'

import { Conversation } from '../../api/models'
import { AppStateContext } from '../../state/AppProvider'

import { ChatHistoryListItemGroups } from './ChatHistoryListItem'

interface ChatHistoryListProps {}

// export interface GroupedChatHistory {
//   month: string
//   entries: Conversation[]
// }

export interface GroupedChatHistory {
  title: string
  entries: Conversation[]
}

/*
const groupByMonth = (entries: Conversation[]) => {
  const groups: GroupedChatHistory[] = [{ month: 'Recent', entries: [] }]
  const currentDate = new Date()

  entries.forEach(entry => {
    const date = new Date(entry.date)
    const daysDifference = (currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' })
    const existingGroup = groups.find(group => group.month === monthYear)

    if (daysDifference <= 7) {
      groups[0].entries.push(entry)
    } else {
      if (existingGroup) {
        existingGroup.entries.push(entry)
      } else {
        groups.push({ month: monthYear, entries: [entry] })
      }
    }
  })

  groups.sort((a, b) => {
    // Check if either group has no entries and handle it
    if (a.entries.length === 0 && b.entries.length === 0) {
      return 0 // No change in order
    } else if (a.entries.length === 0) {
      return 1 // Move 'a' to a higher index (bottom)
    } else if (b.entries.length === 0) {
      return -1 // Move 'b' to a higher index (bottom)
    }
    const dateA = new Date(a.entries[0].date)
    const dateB = new Date(b.entries[0].date)
    return dateB.getTime() - dateA.getTime()
  })

  groups.forEach(group => {
    group.entries.sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateB.getTime() - dateA.getTime()
    })
  })

  return groups
}
  */


// Helper function to format dates
const formatDate = (date: Date, includeWeekday = false) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  if (includeWeekday) {
    options.weekday = 'long';
  }
  return date.toLocaleDateString(undefined, options);
};

interface Item {
  _attachments: string;
  _etag: string;
  _rid: string;
  _self: string;
  _ts: number;
  createdAt: string;
  id: string;
  title: string;
  type: string;
  updatedAt: string;
  userId: string;
}

// Helper function to segregate and sort items
const segregateItems1 = (items : Item[]) => {
  console.log("items", items);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Sort items by updatedAt in descending order
  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());


  const groupedItems: {
    Today: Item[];
    Yesterday: Item[];
    Past: { [key: string]: Item[] };
  } = {
    Today: [],
    Yesterday: [],
    Past: {}
  };

  items.forEach((item) => {
    const itemDate = new Date(item.updatedAt);
    const itemDateOnly = itemDate.toDateString();

    if (itemDateOnly === today.toDateString()) {
      groupedItems.Today.push(item);
    } else if (itemDateOnly === yesterday.toDateString()) {
      groupedItems.Yesterday.push(item);
    } else {
      const formattedDate = formatDate(itemDate, true); // Include weekday for past dates
      if (!groupedItems.Past[formattedDate]) {
        groupedItems.Past[formattedDate] = [];
      }
      groupedItems.Past[formattedDate].push(item);
    }
  });

   const finalGroupedItems = [
    { title: `Today, ${formatDate(today)}`, items: groupedItems.Today },
    { title: `Yesterday, ${formatDate(yesterday)}`, items: groupedItems.Yesterday },
    ...Object.keys(groupedItems.Past).map(date => ({
      title: date.split(', ').reverse().join(', '), // Reordering the date
      items: groupedItems.Past[date]
    }))];
    console.log("finalGroupedItems",finalGroupedItems);

  return finalGroupedItems;
};

const segregateItems2 = (items: Conversation[]) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Sort items by updatedAt in descending order
  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const groupedItems: {
    Today: Conversation[];
    Yesterday: Conversation[];
    Past: { [key: string]: Conversation[] };
  } = {
    Today: [],
    Yesterday: [],
    Past: {}
  };

  items.forEach((item) => {
    const itemDate = new Date(item.updatedAt);
    const itemDateOnly = itemDate.toDateString();

    if (itemDateOnly === today.toDateString()) {
      groupedItems.Today.push(item);
    } else if (itemDateOnly === yesterday.toDateString()) {
      groupedItems.Yesterday.push(item);
    } else {
      const formattedDate = formatDate(itemDate, true); // Include weekday for past dates
      if (!groupedItems.Past[formattedDate]) {
        groupedItems.Past[formattedDate] = [];
      }
      groupedItems.Past[formattedDate].push(item);
    }
  });

  const finalResult  = [
    { title: `Today, ${formatDate(today)}`, entries: groupedItems.Today },
    { title: `Yesterday, ${formatDate(yesterday)}`, entries: groupedItems.Yesterday },
    ...Object.keys(groupedItems.Past).map(date => ({
      title: date.split(', ').reverse().join(', '), // Reordering the date
      entries: groupedItems.Past[date]
    }))
  ];

  return finalResult;
};


function isLastSevenDaysRange(dateToCheck) {
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
    Last7Days:Conversation[],
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
		console.log("itemDateOnly", typeof itemDate);
    if (itemDateOnly === today.toDateString()) {
      groupedItems.Today.push(item);
    } else if (itemDateOnly === yesterday.toDateString()) {
      groupedItems.Yesterday.push(item);
    }
    else if(isLastSevenDaysRange(itemDate)){
    groupedItems.Last7Days.push(item);
    }
    else {
    groupedItems.Older.push(item);
/*      const formattedDate = formatDate(itemDate, true); // Include weekday for past dates
      if (!groupedItems.Past[formattedDate]) {
        groupedItems.Past[formattedDate] = [];
      } */
/*       groupedItems.Past[formattedDate].push(item); */
    }
  });
 
  const finalResult = [
    { title: `Today, ${formatDate(today)}`, entries: groupedItems.Today },
    {
      title: `Yesterday, ${formatDate(yesterday)}`,
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

  React.useEffect(() => {}, [appStateContext?.state.chatHistory])

 
  let groupedChatHistory
  if (chatHistory && chatHistory.length > 0) {
   // groupedChatHistory = groupByMonth(chatHistory)
    groupedChatHistory  = segregateItems(chatHistory)
    console.log("groupedChatHistory",groupedChatHistory)
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

  return <ChatHistoryListItemGroups  groupedChatHistory = {groupedChatHistory}/>
}

export default ChatHistoryList
