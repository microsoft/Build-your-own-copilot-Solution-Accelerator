import React, { useContext } from 'react'
import { Stack, StackItem, Text } from '@fluentui/react'

import { Conversation } from '../../api/models'
import { AppStateContext } from '../../state/AppProvider'

import { ChatHistoryListItemGroups } from './ChatHistoryListItem'

interface ChatHistoryListProps {}

export interface GroupedChatHistory {
  month: string
  entries: Conversation[]
}

export interface GroupedChatHistory2 {
  title: string
  entries: Conversation[]
}

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

 

  let chatDummyHistory : Item[] = [
    {
        "_attachments": "attachments/",
        "_etag": "\"9800d3e1-0000-0200-0000-66cec93b0000\"",
        "_rid": "5rNvAN7i5u7nAgAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u7nAgAAAAAAAA==/",
        "_ts": 1724827963,
        "createdAt": "2024-08-29T05:07:55.997563",
        "id": "566c4d8d-1b70-4019-8098-658dc61f29c0",
        "title": "Clarifying Client Name",
        "type": "conversation",
        "updatedAt": "2024-08-29T06:52:40.719985",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"9800f68e-0000-0200-0000-66cec4880000\"",
        "_rid": "5rNvAN7i5u4xAwAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u4xAwAAAAAAAA==/",
        "_ts": 1724826760,
        "createdAt": "2024-08-28T06:32:24.237104",
        "id": "b66f9202-1dbf-401a-a789-47dc73ae13b4",
        "title": "Tracking Chat Sessions",
        "type": "conversation",
        "updatedAt": "2024-08-28T06:32:37.435755",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"9800e28a-0000-0200-0000-66cec44b0000\"",
        "_rid": "5rNvAN7i5u4uAwAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u4uAwAAAAAAAA==/",
        "_ts": 1724826699,
        "createdAt": "2024-08-28T06:31:24.324159",
        "id": "5b6cde0b-2bb8-43f4-89a9-e632fab22a51",
        "title": "Karen Berg Chat Sessions",
        "type": "conversation",
        "updatedAt": "2024-08-28T06:31:36.486839",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"9800c782-0000-0200-0000-66cec3d50000\"",
        "_rid": "5rNvAN7i5u4DAwAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u4DAwAAAAAAAA==/",
        "_ts": 1724826581,
        "createdAt": "2024-08-29T05:15:12.977283",
        "id": "b088d3e2-92fa-4b7a-a41d-96b2fb14bc75",
        "title": "Chat Session Inquiry",
        "type": "conversation",
        "updatedAt": "2024-08-29T06:29:37.678874",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"970090f0-0000-0200-0000-66cebbc60000\"",
        "_rid": "5rNvAN7i5u4lAwAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u4lAwAAAAAAAA==/",
        "_ts": 1724824518,
        "createdAt": "2024-08-28T05:55:04.840079",
        "id": "651403f7-0da8-40ba-91ee-ae2ea07b85ed",
        "title": "Evaluating Top Discussion Trends",
        "type": "conversation",
        "updatedAt": "2024-08-28T05:55:15.084444",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"9700c7e0-0000-0200-0000-66cebadd0000\"",
        "_rid": "5rNvAN7i5u4KAwAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u4KAwAAAAAAAA==/",
        "_ts": 1724824285,
        "createdAt": "2024-08-28T05:22:10.304581",
        "id": "1deb6e29-f830-4e05-bdea-89eb7ddabd66",
        "title": "Top Discussion Trends",
        "type": "conversation",
        "updatedAt": "2024-08-28T05:51:22.709756",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"9700ba9e-0000-0200-0000-66ceb7130000\"",
        "_rid": "5rNvAN7i5u4aAwAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u4aAwAAAAAAAA==/",
        "_ts": 1724823315,
        "createdAt": "2024-08-29T05:33:05.448111",
        "id": "30298a6a-1ee0-455e-81e9-c87f39f891e0",
        "title": "Top Discussion Trends",
        "type": "conversation",
        "updatedAt": "2024-08-29T05:35:12.499191",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"97004088-0000-0200-0000-66ceb5cb0000\"",
        "_rid": "5rNvAN7i5u4TAwAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u4TAwAAAAAAAA==/",
        "_ts": 1724822987,
        "createdAt": "2024-08-28T05:28:35.454546",
        "id": "73d6379f-0c63-44f0-82b4-24d897970e29",
        "title": "Summarize Discussion Trends",
        "type": "conversation",
        "updatedAt": "2024-08-28T05:29:44.314547",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"97007249-0000-0200-0000-66ceb2190000\"",
        "_rid": "5rNvAN7i5u7+AgAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u7+AgAAAAAAAA==/",
        "_ts": 1724822041,
        "createdAt": "2024-08-29T05:12:43.879637",
        "id": "8c7d6d9b-054f-4bd2-a542-c71873a9e90a",
        "title": "Question Count Inquiry",
        "type": "conversation",
        "updatedAt": "2024-08-29T05:13:59.049084",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"97002b43-0000-0200-0000-66ceb1b80000\"",
        "_rid": "5rNvAN7i5u72AgAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u72AgAAAAAAAA==/",
        "_ts": 1724821944,
        "createdAt": "2024-08-28T05:11:02.613382",
        "id": "3a6a0dce-8215-4e74-a9b1-4efad5ea0f00",
        "title": "Querying Chat Session History",
        "type": "conversation",
        "updatedAt": "2024-08-28T05:12:22.137266",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"9800df10-0000-0200-0000-66cebda40000\"",
        "_rid": "5rNvAN7i5u7zAgAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u7zAgAAAAAAAA==/",
        "_ts": 1724824996,
        "createdAt": "2024-08-23T05:10:28.811686",
        "id": "ff44124c-ca3d-495a-b4fa-f28f4d04d0af",
        "title": "Client address",
        "type": "conversation",
        "updatedAt": "2024-08-23T05:10:43.992035",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"97008437-0000-0200-0000-66ceb1150000\"",
        "_rid": "5rNvAN7i5u7wAgAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u7wAgAAAAAAAA==/",
        "_ts": 1724821781,
        "createdAt": "2024-08-26T05:09:15.110387",
        "id": "3143c664-3581-4b87-8b60-6f0fb8b43a46",
        "title": "Inquiry on Client Details",
        "type": "conversation",
        "updatedAt": "2024-08-26T05:09:38.850652",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"9700a335-0000-0200-0000-66ceb0fa0000\"",
        "_rid": "5rNvAN7i5u7tAgAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u7tAgAAAAAAAA==/",
        "_ts": 1724821754,
        "createdAt": "2024-08-27T05:09:03.667731",
        "id": "c85fbeac-7092-4eef-aade-78c23cb2b676",
        "title": "Exploring Top Discussion Trends",
        "type": "conversation",
        "updatedAt": "2024-08-27T05:09:10.983119",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"9700ec32-0000-0200-0000-66ceb0d60000\"",
        "_rid": "5rNvAN7i5u7qAgAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u7qAgAAAAAAAA==/",
        "_ts": 1724821718,
        "createdAt": "2024-08-25T05:08:27.941058",
        "id": "3a7e970c-6f9a-4bbf-ab23-d82c71bc12a7",
        "title": "Identifying the Client Name",
        "type": "conversation",
        "updatedAt": "2024-08-25T05:08:35.198527",
        "userId": "00000000-0000-0000-0000-000000000000"
    },
    {
        "_attachments": "attachments/",
        "_etag": "\"9700232e-0000-0200-0000-66ceb0990000\"",
        "_rid": "5rNvAN7i5u7kAgAAAAAAAA==",
        "_self": "dbs/5rNvAA==/colls/5rNvAN7i5u4=/docs/5rNvAN7i5u7kAgAAAAAAAA==/",
        "_ts": 1724821657,
        "createdAt": "2024-08-28T05:07:28.185204",
        "id": "0d2553c6-9a26-44b2-9747-13663eb341c0",
        "title": "Clarifying Client Name",
        "type": "conversation",
        "updatedAt": "2024-08-28T05:07:34.646881",
        "userId": "00000000-0000-0000-0000-000000000000"
    }
]
  let groupedChatHistory,groupedChatHistory2
  if (chatHistory && chatHistory.length > 0) {
    //console.log("chatHistory",chatHistory);
    const chatHistory1 : Conversation[]  = [
      {
          "id": "3bee2161-b130-4845-a2c6-7061f68bb5d3",
          "title": "Summarize Discussion Trends",
          "date": "2024-08-29T06:45:57.090670",
          "messages": [
              {
                  "id": "ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af",
                  "role": "user",
                  "date": "2024-08-29T06:45:59.749179",
                  "content": "Top discussion trends",
                  "feedback": ""
              },
              {
                  "id": "8c814906-f4a5-41ec-8802-4ed73de1aebc",
                  "role": "assistant",
                  "date": "2024-08-29T06:46:46.857296",
                  "content": "I cannot answer this question from the data available. Please rephrase or add more details.",
                  "feedback": ""
              },
              {
                  "id": "65a3428f-4d93-4b12-870d-e2b8fd7eea36",
                  "role": "user",
                  "date": "2024-08-29T06:46:50.466645",
                  "content": "Top discussion trends",
                  "feedback": ""
              },
              {
                  "id": "caa853cf-5bfd-414e-ae7a-f33469e02747",
                  "role": "assistant",
                  "date": "2024-08-29T06:46:59.030133",
                  "content": "I cannot answer this question from the data available. Please rephrase or add more details.",
                  "feedback": ""
              }
          ],
          "updatedAt": "2024-08-29T06:46:59.030133"
      },
      {
          "id": "e1e8876e-9b68-4af0-87df-df625a7b5d33",
          "title": "Meeting Summary Discussed",
          "date": "2024-08-29T06:01:33.058111",
          "messages": [
              {
                  "id": "57d40ad8-4d5f-40b1-9a3a-5a9f350c6c10",
                  "role": "user",
                  "date": "2024-08-29T06:01:35.486154",
                  "content": "Previous meeting summary",
                  "feedback": ""
              },
              {
                  "id": "4dbff0fa-e548-48fa-9089-19c8dc001a47",
                  "role": "assistant",
                  "date": "2024-08-29T06:01:43.016600",
                  "content": "I cannot answer this question from the data available. Please rephrase or add more details.",
                  "feedback": ""
              },
              {
                  "id": "ccf59384-95e5-4a72-a70a-b49ab6703474",
                  "role": "user",
                  "date": "2024-08-29T06:01:47.329845",
                  "content": "Previous meeting summary",
                  "feedback": ""
              },
              {
                  "id": "9f72d11a-d83a-4b2d-afa1-d223f6cbc2d5",
                  "role": "assistant",
                  "date": "2024-08-29T06:02:08.486476",
                  "content": "I cannot answer this question from the data available. Please rephrase or add more details.",
                  "feedback": ""
              },
              {
                  "id": "709afb92-895f-471b-a86c-2ce8ea0de019",
                  "role": "user",
                  "date": "2024-08-29T06:02:10.633236",
                  "content": "Top discussion trends",
                  "feedback": ""
              },
              {
                  "id": "b1ecefad-ef05-44eb-b813-94f2e71b071c",
                  "role": "assistant",
                  "date": "2024-08-29T06:02:39.604703",
                  "content": "I cannot answer this question from the data available. Please rephrase or add more details.",
                  "feedback": ""
              },
              {
                  "id": "7613339f-3d50-4b4e-b6d3-28f0444618e3",
                  "role": "user",
                  "date": "2024-08-29T06:03:32.492492",
                  "content": "Investment summary",
                  "feedback": ""
              },
              {
                  "id": "b8024913-ca95-4ea5-aedb-7b095b288367",
                  "role": "assistant",
                  "date": "2024-08-29T06:03:41.401992",
                  "content": "Please only ask questions about the selected client or select another client to inquire about their details.",
                  "feedback": ""
              },
              {
                  "id": "c9588187-a1cf-41d5-98e5-355706a66a97",
                  "role": "user",
                  "date": "2024-08-29T06:33:19.828581",
                  "content": "Investment summary",
                  "feedback": ""
              },
              {
                  "id": "a682fbb4-1419-4132-b1a6-6be63780beaf",
                  "role": "assistant",
                  "date": "2024-08-29T06:34:10.047201",
                  "content": "Arun Sharma's investment summary as of July 1, 2024, is as follows:\n\n- Bonds: $2,375,518.00\n- Cash: $2,692,330.00\n- Equities: $2,123,818.00\n- Others: $2,237,664.00",
                  "feedback": ""
              }
          ],
          "updatedAt": "2024-08-29T06:34:10.047201"
      },
     {
          "id": "3bee2161-b130-4845-a2c6-7061f68bb5d3",
          "title": "Summarize Discussion Trends",
          "date": "2024-08-29T06:45:57.090670",
          "messages": [
              {
                  "id": "ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af",
                  "role": "user",
                  "date": "2024-08-29T06:45:59.749179",
                  "content": "Top discussion trends",
                  "feedback": ""
              },
              {
                  "id": "8c814906-f4a5-41ec-8802-4ed73de1aebc",
                  "role": "assistant",
                  "date": "2024-08-29T06:46:46.857296",
                  "content": "I cannot answer this question from the data available. Please rephrase or add more details.",
                  "feedback": ""
              },
              {
                  "id": "65a3428f-4d93-4b12-870d-e2b8fd7eea36",
                  "role": "user",
                  "date": "2024-08-29T06:46:50.466645",
                  "content": "Top discussion trends",
                  "feedback": ""
              },
              {
                  "id": "caa853cf-5bfd-414e-ae7a-f33469e02747",
                  "role": "assistant",
                  "date": "2024-08-29T06:46:59.030133",
                  "content": "I cannot answer this question from the data available. Please rephrase or add more details.",
                  "feedback": ""
              }
          ],
          "updatedAt": "2024-08-28T06:46:59.030133"
      },
    {
          "id": "3bee2161-b130-4845-a2c6-7061f68bb5d3",
          "title": "Summarize Discussion Trends 1",
          "date": "2024-08-29T06:45:57.090670",
          "messages": [
              {
                  "id": "ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af",
                  "role": "user",
                  "date": "2024-08-29T06:45:59.749179",
                  "content": "Top discussion trends",
                  "feedback": ""
              },
            
          ],
          "updatedAt": "2024-08-28T07:46:59.030133"
      },
  
     {
          "id": "3bee2161-b130-4845-a2c6-7061f68bb5d3",
          "title": "Summarize Discussion Trends",
          "date": "2024-08-29T06:45:57.090670",
          "messages": [
              {
                  "id": "ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af",
                  "role": "user",
                  "date": "2024-08-29T06:45:59.749179",
                  "content": "Top discussion trends",
                  "feedback": ""
              },
            
          ],
          "updatedAt": "2024-08-27T06:46:59.030133"
      },
     {
          "id": "3bee2161-b130-4845-a2c6-7061f68bb5d3",
          "title": "Summarize Discussion Trends",
          "date": "2024-08-29T06:45:57.090670",
          "messages": [
              {
                  "id": "ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af",
                  "role": "user",
                  "date": "2024-08-29T06:45:59.749179",
                  "content": "Top discussion trends",
                  "feedback": ""
              }
            
          ],
          "updatedAt": "2024-08-26T06:46:59.030133"
      },
     {
          "id": "3bee2161-b130-4845-a2c6-7061f68bb5d3",
          "title": "Summarize Discussion Trends",
          "date": "2024-08-29T06:45:57.090670",
          "messages": [
              {
                  "id": "ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af",
                  "role": "user",
                  "date": "2024-08-29T06:45:59.749179",
                  "content": "Top discussion trends",
                  "feedback": ""
              },
            
          ],
          "updatedAt": "2024-08-25T06:46:59.030133"
      },
  ]


   
const chatHistory3 : Conversation[]  = [
  {
    id: '3bee2161-b130-4845-a2c6-7061f68bb5d3',
    title: 'Summarize Discussion Trends',
    date: '2024-08-29T06:45:57.090670',
    messages: [
      {
        id: 'ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af',
        role: 'user',
        date: '2024-08-29T06:45:59.749179',
        content: 'Top discussion trends',
        feedback: '',
      },
      {
        id: '8c814906-f4a5-41ec-8802-4ed73de1aebc',
        role: 'assistant',
        date: '2024-08-29T06:46:46.857296',
        content:
          'I cannot answer this question from the data available. Please rephrase or add more details.',
        feedback: '',
      },
      {
        id: '65a3428f-4d93-4b12-870d-e2b8fd7eea36',
        role: 'user',
        date: '2024-08-29T06:46:50.466645',
        content: 'Top discussion trends',
        feedback: '',
      },
      {
        id: 'caa853cf-5bfd-414e-ae7a-f33469e02747',
        role: 'assistant',
        date: '2024-08-29T06:46:59.030133',
        content:
          'I cannot answer this question from the data available. Please rephrase or add more details.',
        feedback: '',
      },
    ],
    updatedAt: '2024-08-29T06:46:59.030133',
  },
  {
    id: 'e1e8876e-9b68-4af0-87df-df625a7b5d33',
    title: 'Meeting Summary Discussed',
    date: '2024-08-29T06:01:33.058111',
    messages: [
      {
        id: '57d40ad8-4d5f-40b1-9a3a-5a9f350c6c10',
        role: 'user',
        date: '2024-08-29T06:01:35.486154',
        content: 'Previous meeting summary',
        feedback: '',
      },
      {
        id: '4dbff0fa-e548-48fa-9089-19c8dc001a47',
        role: 'assistant',
        date: '2024-08-29T06:01:43.016600',
        content:
          'I cannot answer this question from the data available. Please rephrase or add more details.',
        feedback: '',
      },
      {
        id: 'ccf59384-95e5-4a72-a70a-b49ab6703474',
        role: 'user',
        date: '2024-08-29T06:01:47.329845',
        content: 'Previous meeting summary',
        feedback: '',
      },
      {
        id: '9f72d11a-d83a-4b2d-afa1-d223f6cbc2d5',
        role: 'assistant',
        date: '2024-08-29T06:02:08.486476',
        content:
          'I cannot answer this question from the data available. Please rephrase or add more details.',
        feedback: '',
      },
      {
        id: '709afb92-895f-471b-a86c-2ce8ea0de019',
        role: 'user',
        date: '2024-08-29T06:02:10.633236',
        content: 'Top discussion trends',
        feedback: '',
      },
      {
        id: 'b1ecefad-ef05-44eb-b813-94f2e71b071c',
        role: 'assistant',
        date: '2024-08-29T06:02:39.604703',
        content:
          'I cannot answer this question from the data available. Please rephrase or add more details.',
        feedback: '',
      },
      {
        id: '7613339f-3d50-4b4e-b6d3-28f0444618e3',
        role: 'user',
        date: '2024-08-29T06:03:32.492492',
        content: 'Investment summary',
        feedback: '',
      },
      {
        id: 'b8024913-ca95-4ea5-aedb-7b095b288367',
        role: 'assistant',
        date: '2024-08-29T06:03:41.401992',
        content:
          'Please only ask questions about the selected client or select another client to inquire about their details.',
        feedback: '',
      },
      {
        id: 'c9588187-a1cf-41d5-98e5-355706a66a97',
        role: 'user',
        date: '2024-08-29T06:33:19.828581',
        content: 'Investment summary',
        feedback: '',
      },
      {
        id: 'a682fbb4-1419-4132-b1a6-6be63780beaf',
        role: 'assistant',
        date: '2024-08-29T06:34:10.047201',
        content:
          "Arun Sharma's investment summary as of July 1, 2024, is as follows:\n\n- Bonds: $2,375,518.00\n- Cash: $2,692,330.00\n- Equities: $2,123,818.00\n- Others: $2,237,664.00",
        feedback: '',
      },
    ],
    updatedAt: '2024-08-29T06:34:10.047201',
  },
  {
    id: '3bee2161-b130-4845-a2c6-7061f68bb5d3',
    title: 'Summarize Discussion Trends',
    date: '2024-08-29T06:45:57.090670',
    messages: [
      {
        id: 'ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af',
        role: 'user',
        date: '2024-08-29T06:45:59.749179',
        content: 'Top discussion trends',
        feedback: '',
      },
      {
        id: '8c814906-f4a5-41ec-8802-4ed73de1aebc',
        role: 'assistant',
        date: '2024-08-29T06:46:46.857296',
        content:
          'I cannot answer this question from the data available. Please rephrase or add more details.',
        feedback: '',
      },
      {
        id: '65a3428f-4d93-4b12-870d-e2b8fd7eea36',
        role: 'user',
        date: '2024-08-29T06:46:50.466645',
        content: 'Top discussion trends',
        feedback: '',
      },
      {
        id: 'caa853cf-5bfd-414e-ae7a-f33469e02747',
        role: 'assistant',
        date: '2024-08-29T06:46:59.030133',
        content:
          'I cannot answer this question from the data available. Please rephrase or add more details.',
        feedback: '',
      },
    ],
    updatedAt: '2024-08-28T06:46:59.030133',
  },
  {
    id: '3bee2161-b130-4845-a2c6-7061f68bb5d3',
    title: 'Summarize Discussion Trends 1',
    date: '2024-08-29T06:45:57.090670',
    messages: [
      {
        id: 'ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af',
        role: 'user',
        date: '2024-08-29T06:45:59.749179',
        content: 'Top discussion trends',
        feedback: '',
      },
    ],
    updatedAt: '2024-08-28T07:46:59.030133',
  },
  {
    id: '3bee2161-b130-4845-a2c6-7061f68bb5d3',
    title: 'Summarize Discussion Trends',
    date: '2024-08-29T06:45:57.090670',
    messages: [
      {
        id: 'ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af',
        role: 'user',
        date: '2024-08-29T06:45:59.749179',
        content: 'Top discussion trends',
        feedback: '',
      },
    ],
    updatedAt: '2024-08-27T06:46:59.030133',
  },
  {
    id: '3bee2161-b130-4845-a2c6-7061f68bb5d3',
    title: 'Summarize Discussion Trends',
    date: '2024-08-29T06:45:57.090670',
    messages: [
      {
        id: 'ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af',
        role: 'user',
        date: '2024-08-29T06:45:59.749179',
        content: 'Top discussion trends',
        feedback: '',
      },
    ],
    updatedAt: '2024-08-26T06:46:59.030133',
  },
  {
    id: '3bee2161-b130-4845-a2c6-7061f68bb5d3',
    title: 'Summarize Discussion Trends',
    date: '2024-08-29T06:45:57.090670',
    messages: [
      {
        id: 'ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af',
        role: 'user',
        date: '2024-08-29T06:45:59.749179',
        content: 'Top discussion trends',
        feedback: '',
      },
    ],
    updatedAt: '2024-08-25T06:46:59.030133',
  },
  /* old */
  {
    id: '3bee2161-b130-4845-a2c6-7061f68bb5d3',
    title: 'Old  Discussion Trends',
    date: '2024-08-20T06:45:57.090670',
    messages: [
      {
        id: 'ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af',
        role: 'user',
        date: '2024-08-29T06:45:59.749179',
        content: 'Top discussion trends',
        feedback: '',
      },
    ],
    updatedAt: '2024-08-20T06:46:59.030133',
  },
  
    {
    id: '3bee2161-b130-4845-a2c6-7061f68bb5d3',
    title: 'Old  Discussion Trends',
    date: '2024-08-13T06:45:57.090670',
    messages: [
      {
        id: 'ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af',
        role: 'user',
        date: '2024-08-29T06:45:59.749179',
        content: 'Top discussion trends',
        feedback: '',
      },
    ],
    updatedAt: '2024-08-13T06:46:59.030133',
  },
  
    {
    id: '3bee2161-b130-4845-a2c6-7061f68bb5d3',
    title: 'Old  Discussion Trends',
    date: '2024-07-20T06:45:57.090670',
    messages: [
      {
        id: 'ba60ce3b-b31c-4c2c-b025-3a97fcf7e6af',
        role: 'user',
        date: '2024-08-29T06:45:59.749179',
        content: 'Top discussion trends',
        feedback: '',
      },
    ],
    updatedAt: '2024-07-20T06:46:59.030133',
  },
];
 
    groupedChatHistory = groupByMonth(chatHistory)
    //console.log("groupedChatHistory",groupedChatHistory);
    groupedChatHistory2  = segregateItems(chatHistory)
    console.log("groupedChatHistory2",groupedChatHistory2)
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

  return <ChatHistoryListItemGroups groupedChatHistory={groupedChatHistory} groupedChatHistory2 = {groupedChatHistory2}/>
}

export default ChatHistoryList
