import * as React from 'react'
import { useContext, useEffect, useRef, useState } from 'react'
import {
  DefaultButton,
  Dialog,
  DialogFooter,
  DialogType,
  IconButton,
  ITextField,
  List,
  PrimaryButton,
  Separator,
  Spinner,
  SpinnerSize,
  Stack,
  Text,
  TextField
} from '@fluentui/react'
import { useBoolean } from '@fluentui/react-hooks'

import { historyDelete, historyList, historyRename } from '../../api'
import { Conversation,GroupedChatHistory } from '../../api/models'
import { AppStateContext } from '../../state/AppProvider'
import {formatMonth} from '../../helpers/helpers';

import styles from './ChatHistoryPanel.module.css';
import { ChatHistoryListItemCell } from './ChatHistoryListItemCell'

interface ChatHistoryListItemGroupsProps {
  groupedChatHistory: GroupedChatHistory[]
}

export const ChatHistoryListItemGroups: React.FC<ChatHistoryListItemGroupsProps> = ({ groupedChatHistory }) => {
  const appStateContext = useContext(AppStateContext)
  const observerTarget = useRef(null)
  const [, setSelectedItem] = React.useState<Conversation | null>(null)
  const [offset, setOffset] = useState<number>(25)
  const [observerCounter, setObserverCounter] = useState(0)
  const [showSpinner, setShowSpinner] = useState(false)
  const firstRender = useRef(true)

  const handleSelectHistory = (item?: Conversation) => {
    if (item) {
      setSelectedItem(item)
    }
  }

  const onRenderCell = (item?: Conversation) => {
    return <ChatHistoryListItemCell item={item} onSelect={() => handleSelectHistory(item)} />
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    handleFetchHistory()
    setOffset(offset => (offset += 25))
  }, [observerCounter])

  const handleFetchHistory = async () => {
    const currentChatHistory = appStateContext?.state.chatHistory
    setShowSpinner(true)

    await historyList(offset).then(response => {
      const concatenatedChatHistory = currentChatHistory && response && currentChatHistory.concat(...response)
      if (response) {
        appStateContext?.dispatch({ type: 'FETCH_CHAT_HISTORY', payload: concatenatedChatHistory || response })
      } else {
        appStateContext?.dispatch({ type: 'FETCH_CHAT_HISTORY', payload: null })
      }
      setShowSpinner(false)
      return response
    })
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) setObserverCounter(observerCounter => (observerCounter += 1))
      },
      { threshold: 1 }
    )

    if (observerTarget.current) observer.observe(observerTarget.current)

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current)
    }
  }, [observerTarget])

  return (
    <div className={styles.listContainer} data-is-scrollable>
      {groupedChatHistory.map(
        group =>
          group.entries.length > 0 && (
            <Stack
              horizontalAlign="start"
              verticalAlign="center"
              key={group.month}
              className={styles.chatGroup}
              aria-label={`chat history group: ${group.month}`}>
              <Stack aria-label={group.month} className={styles.chatMonth}>
                {formatMonth(group.month)}
              </Stack>
              <List
                aria-label={`chat history list`}
                items={group.entries}
                onRenderCell={onRenderCell}
                className={styles.chatList}
              />
              <div role="scrollDiv" ref={observerTarget} />
              <Separator
                styles={{
                  root: {
                    width: '100%',
                    position: 'relative',
                    '::before': {
                      backgroundColor: '#d6d6d6'
                    }
                  }
                }}
              />
            </Stack>
          )
      )}
      {showSpinner && (
        <div className={styles.spinnerContainer}>
          <Spinner size={SpinnerSize.small} aria-label="loading more chat history" className={styles.spinner} />
        </div>
      )}
    </div>
  )
}
