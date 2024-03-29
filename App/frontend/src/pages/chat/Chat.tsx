/* eslint-disable react/react-in-jsx-scope */
import { useRef, useState, useEffect, useContext, useLayoutEffect } from 'react'
import { Text, CommandBarButton, IconButton, Dialog, DialogType, Stack } from '@fluentui/react'
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { SquareRegular, ErrorCircleRegular } from '@fluentui/react-icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import uuid from 'react-uuid'
import { isEmpty } from 'lodash-es'

import styles from './Chat.module.css'

import {
  type ChatMessage,
  type ConversationRequest,
  conversationApi,
  type Citation,
  type ToolMessageContent,
  type ChatResponse,
  getUserInfo,
  type Conversation,
  type ErrorMessage
} from '../../api'
import { Answer } from '../../components/Answer'
import { QuestionInput } from '../../components/QuestionInput'
import { AppStateContext } from '../../state/AppProvider'
import { useBoolean } from '@fluentui/react-hooks'
import { SidebarOptions } from '../../components/SidebarView/SidebarView'

const enum messageStatus {
  NotRunning = 'Not Running',
  Processing = 'Processing',
  Done = 'Done'
}

interface Props {
  chatType: SidebarOptions | null | undefined
}

const Chat = ({ chatType }: Props) => {
  const appStateContext = useContext(AppStateContext)
  const AUTH_ENABLED = appStateContext?.state.frontendSettings?.auth_enabled === 'true'
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false)
  const [activeCitation, setActiveCitation] = useState<Citation>()
  const [isCitationPanelOpen, setIsCitationPanelOpen] = useState<boolean>(false)
  const abortFuncs = useRef([] as AbortController[])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [processMessages, setProcessMessages] = useState<messageStatus>(messageStatus.NotRunning)
  const [clearingChat, setClearingChat] = useState<boolean>(false)
  const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true)
  const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>()
  const [showAuthMessage, setShowAuthMessage] = useState<boolean>(false)

  useEffect(() => {
    // close citations panel when switching sidebar selections
    setIsCitationPanelOpen(false)
  }, [appStateContext?.state.sidebarSelection])

  const errorDialogContentProps = {
    type: DialogType.close,
    title: errorMsg?.title,
    closeButtonAriaLabel: 'Close',
    subText: errorMsg?.subtitle
  }

  const modalProps = {
    titleAriaId: 'labelId',
    subtitleAriaId: 'subTextId',
    isBlocking: true,
    styles: { main: { maxWidth: 450 } }
  }

  const [ASSISTANT, TOOL, ERROR] = ['assistant', 'tool', 'error']

  const handleErrorDialogClose = () => {
    toggleErrorDialog()
    setTimeout(() => {
      setErrorMsg(null)
    }, 500)
  }

  const getUserInfoList = async () => {
    if (!AUTH_ENABLED) {
      setShowAuthMessage(false)
      return
    }

    const userInfoList = await getUserInfo()
    if (userInfoList.length === 0 && window.location.hostname !== '127.0.0.1') {
      setShowAuthMessage(true)
    } else {
      setShowAuthMessage(false)
    }
  }

  let assistantMessage = {} as ChatMessage
  let toolMessage = {} as ChatMessage
  let assistantContent = ''

  const processResultMessage = (resultMessage: ChatMessage, userMessage: ChatMessage, conversationId?: string) => {
    if (resultMessage.role === ASSISTANT) {
      assistantContent += resultMessage.content
      assistantMessage = resultMessage
      assistantMessage.content = assistantContent
    }

    if (resultMessage.role === TOOL) toolMessage = resultMessage

    if (!conversationId) {
      isEmpty(toolMessage) ?
        setMessages([...messages, userMessage, assistantMessage]) :
        setMessages([...messages, userMessage, toolMessage, assistantMessage])
    } else {
      isEmpty(toolMessage) ?
        setMessages([...messages, assistantMessage]) :
        setMessages([...messages, toolMessage, assistantMessage])
    }
  }

  const makeApiRequestWithoutCosmosDB = async (question: string, conversationId?: string) => {
    setIsLoading(true)
    setShowLoadingMessage(true)
    const abortController = new AbortController()
    abortFuncs.current.unshift(abortController)

    const userMessage: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: question,
      date: new Date().toISOString()
    }

    let conversation: Conversation | null | undefined
    if (!conversationId) {
      conversation = {
        id: conversationId ?? uuid(),
        title: question,
        messages: [userMessage],
        date: new Date().toISOString()
      }
    } else {
      conversation = appStateContext?.state?.currentChat
      if(!conversation) {
        console.error('Conversation not found.')
        setIsLoading(false)
        setShowLoadingMessage(false)
        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
        return
      } else {
        conversation.messages.push(userMessage)
      }
    }

    appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
    setMessages(conversation.messages)

    const request: ConversationRequest = {
      messages: [...conversation.messages.filter((answer) => answer.role !== ERROR)],
      index_name: String(appStateContext?.state.sidebarSelection)
    }

    let result = {} as ChatResponse
    try {
      const response = await conversationApi(request, abortController.signal)
      if (response?.body) {
        const reader = response.body.getReader()
        let runningText = ''

        while (true) {
          setProcessMessages(messageStatus.Processing)
          const { done, value } = await reader.read()
          if (done) break

          var text = new TextDecoder('utf-8').decode(value)
          const objects = text.split('\n')
          objects.forEach((obj) => {
            try {
              runningText += obj
              result = JSON.parse(runningText)
              result.choices[0].messages.forEach((obj) => {
                obj.id = uuid()
                obj.date = new Date().toISOString()
              })
              setShowLoadingMessage(false)
              result.choices[0].messages.forEach((resultObj) => {
                processResultMessage(resultObj, userMessage, conversationId)
              })
              runningText = ''
            }
            catch { }
          })
        }
        conversation.messages.push(toolMessage, assistantMessage)
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
        setMessages([...messages, toolMessage, assistantMessage])
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage = 'An error occurred. Please try again. If the problem persists, please contact the site administrator.'
        if (result.error?.message) {
          errorMessage = result.error.message
        }
        else if (typeof result.error === 'string') {
          errorMessage = result.error
        }
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString()
        }
        conversation.messages.push(errorChatMsg)
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
        setMessages([...messages, errorChatMsg])
      } else {
        setMessages([...messages, userMessage])
      }
    } finally {
      setIsLoading(false)
      setShowLoadingMessage(false)
      abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
      setProcessMessages(messageStatus.Done)
    }

    return abortController.abort()
  }

  const newChat = () => {
    setProcessMessages(messageStatus.Processing)
    setMessages([])
    setIsCitationPanelOpen(false)
    setActiveCitation(undefined)
    appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: null })
    setProcessMessages(messageStatus.Done)
  }

  const stopGenerating = () => {
    abortFuncs.current.forEach(a => a.abort())
    setShowLoadingMessage(false)
    setIsLoading(false)
  }

  useEffect(() => {
    if (appStateContext?.state.currentChat) {
      setMessages(appStateContext.state.currentChat.messages)
    } else {
      setMessages([])
    }

    if (appStateContext?.state.sidebarSelection === SidebarOptions.Grant) {
      appStateContext?.dispatch({ type: 'UPDATE_GRANTS_CHAT', payload: appStateContext?.state.currentChat })
    } else if (appStateContext?.state.sidebarSelection === SidebarOptions.Article) {
      appStateContext?.dispatch({ type: 'UPDATE_ARTICLES_CHAT', payload: appStateContext?.state.currentChat })
    }
  }, [appStateContext?.state.currentChat])

  useEffect(() => {
    abortFuncs.current.forEach(a => a.abort())
  }, [appStateContext?.state.sidebarSelection])

  useLayoutEffect(() => {
    if (appStateContext && appStateContext.state.currentChat && processMessages === messageStatus.Done) {
      setMessages(appStateContext.state.currentChat.messages)
      setProcessMessages(messageStatus.NotRunning)
    }
  }, [processMessages])

  useEffect(() => {
    if (AUTH_ENABLED !== undefined) getUserInfoList()
  }, [AUTH_ENABLED])

  useLayoutEffect(() => {
    chatMessageStreamEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [showLoadingMessage, processMessages])

  const onShowCitation = (citation: Citation) => {
    setActiveCitation(citation)
    setIsCitationPanelOpen(true)
  }

  const onViewSource = (citation: Citation) => {
    if (citation.url && !citation.url.includes('blob.core')) {
      window.open(citation.url, '_blank')
    }
  }

  const parseCitationFromMessage = (message: ChatMessage) => {
    if (message?.role && message?.role === 'tool') {
      try {
        const toolMessage = JSON.parse(message.content) as ToolMessageContent
        return toolMessage.citations
      }
      catch {
        return []
      }
    }
    return []
  }

  const disabledButton = () => {
    return isLoading || (messages && messages.length === 0) || clearingChat
  }

  const context = useContext(AppStateContext)

  if (!context) {
    throw new Error('AppStateContext is undefined. Make sure you have wrapped your component tree with AppStateProvider.')
  }

  function handleToggleFavorite (citations: Citation[]): void {
    citations.forEach(citation => {
      const isFavorited = appStateContext?.state.favoritedCitations.some(favCitation => favCitation.id === citation.id)
      if (!isFavorited) {
        // If citation is not already favorited, dispatch action to toggle its favorite status
        appStateContext?.dispatch({ type: 'TOGGLE_FAVORITE_CITATION', payload: { citation } })
      }
    })
  }

  let title = ''
  switch (appStateContext?.state.sidebarSelection) {
    case SidebarOptions.Article:
      title = 'Explore scientific journals'
      break
    case SidebarOptions.Grant:
      title = 'Explore grant documents'
      break
  }

  return (
    <div className={styles.container} role="main">
        <Stack horizontal className={styles.chatRoot}>
            <div className={styles.chatContainer}>
                <Text variant="xLarge"
                    style={{
                      color: '#797775',
                      marginLeft: '15px',
                      marginTop: '25px',
                      alignSelf: 'start'
                    }}
                >
                    {title}
                </Text>
            <div className={styles.chatMessageStream} style={{ marginBottom: isLoading ? '40px' : '0px' }} role="log">
                {messages.map((answer, index) => (
                <>
                    {answer.role === 'user'
                      ? (<div className={styles.chatMessageUser} tabIndex={0}>
                            <div className={styles.chatMessageUserMessage}>{answer.content}</div>
                        </div>
                    ) : (answer.role === 'assistant' ?
                    <div className={styles.chatMessageGpt}>
                        <Answer
                            answer={{
                              answer: answer.content,
                              citations: parseCitationFromMessage(messages[index - 1]),
                            }}
                            onCitationClicked={c => onShowCitation(c)}
                        />
                    </div>
                      : answer.role === ERROR ?
                    <div className={styles.chatMessageError}>
                        <Stack horizontal className={styles.chatMessageErrorContent}>
                            <ErrorCircleRegular className={styles.errorIcon} style={{ color: 'rgba(182, 52, 67, 1)' }} />
                            <span>Error</span>
                        </Stack>
                        <span className={styles.chatMessageErrorContent}>{answer.content}</span>
                    </div>
                        : null)}
                </>
                ))}
                {showLoadingMessage && (
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
                <div ref={chatMessageStreamEnd} />
            </div>

                        <Stack horizontal className={styles.chatInput}>
                            {isLoading && (
                                <Stack 
                                    horizontal
                                    className={styles.stopGeneratingContainer}
                                    role="button"
                                    aria-label="Stop generating"
                                    tabIndex={0}
                                    onClick={stopGenerating}
                                    onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? stopGenerating() : null}
                                    >
                                        <SquareRegular className={styles.stopGeneratingIcon} aria-hidden="true"/>
                                        <span className={styles.stopGeneratingText} aria-hidden="true">Stop generating</span>
                                </Stack>
                            )}
                            <Stack>
                                <CommandBarButton
                                    role="button"
                                    styles={{
                                      icon: {
                                        color: '#FFFFFF'
                                      },
                                      iconDisabled: {
                                        color: '#BDBDBD !important'
                                      },
                                      root: {
                                        color: '#FFFFFF',
                                        background: '#0F6CBD',
                                        borderRadius: '100px'
                                      },
                                      rootDisabled: {
                                        background: '#F0F0F0'
                                      },

                                      // disable hover effect
                                      rootHovered: {
                                        background: '#0F6CBD',
                                        color: '#FFFFFF'
                                      },

                                      iconHovered: {
                                        color: '#FFFFFF'
                                      }
                                    }}
                                    className={styles.clearChatBroomNoCosmos}
                                    iconProps={{ iconName: 'Broom' }}
                                    onClick={newChat}
                                    disabled={disabledButton()}
                                    aria-label="clear chat button"

                                />
                                <Dialog
                                    hidden={hideErrorDialog}
                                    onDismiss={handleErrorDialogClose}
                                    dialogContentProps={errorDialogContentProps}
                                    modalProps={modalProps}
                                >
                                </Dialog>
                            </Stack>
                            <QuestionInput
                                clearOnSend
                                placeholder="Type a new question..."
                                disabled={isLoading}
                                onSend={(question, id) => { makeApiRequestWithoutCosmosDB(question, id) }}
                                conversationId={appStateContext?.state.currentChat?.id ? appStateContext?.state.currentChat?.id : undefined}
                                chatType={chatType}
                            />
                        </Stack>
                    </div>

                    {/* Citation Panel */}
                    {messages && messages.length > 0 && isCitationPanelOpen && activeCitation && (
                    <Stack.Item className={styles.citationPanel} tabIndex={0} role="tabpanel" aria-label="Citations Panel">
                        <Stack aria-label="Citations Panel Header Container" horizontal className={styles.citationPanelHeaderContainer} horizontalAlign="space-between" verticalAlign="center">
                            <Stack horizontal verticalAlign="center">
                                <span aria-label="Citations" className={styles.citationPanelHeader}>References</span>
                            </Stack>
                            <IconButton iconProps={{ iconName: 'Cancel', style: { color: '#424242' } }} aria-label="Close citations panel" onClick={() => setIsCitationPanelOpen(false)} />
                        </Stack>
                        <h5 className={styles.citationPanelTitle} tabIndex={0} title={activeCitation.url && !activeCitation.url.includes('blob.core') ? activeCitation.url : activeCitation.title ?? ''} onClick={() => onViewSource(activeCitation)}>{activeCitation.title}</h5>
                        <PrimaryButton
                            iconProps={{ iconName: 'CirclePlus', style: { color: 'white' } }} // Set icon color to white
                            onClick={() => {
                              if (activeCitation.filepath && activeCitation.url) {
                                const newCitation = {
                                  id: `${activeCitation.filepath}-${activeCitation.url}`, // Convert id to string and provide a default value of 0
                                  title: activeCitation.title,
                                  url: activeCitation.url,
                                  content: activeCitation.content,
                                  filepath: activeCitation.filepath,
                                  metadata: activeCitation.metadata,
                                  chunk_id: activeCitation.chunk_id,
                                  reindex_id: activeCitation.reindex_id,
                                  type: appStateContext?.state.sidebarSelection?.toString() ?? '',
                                }
                                handleToggleFavorite([newCitation])

                                if (!appStateContext?.state.isSidebarExpanded) {
                                  appStateContext?.dispatch({ type: 'TOGGLE_SIDEBAR' });
                                }
                              }
                            }}
                            styles={{
                              root: { borderRadius: '4px', marginTop: '10px', padding: '12px 24px' }
                            }}
                        >
                            Favorite
                        </PrimaryButton>
                        <div tabIndex={0}>
                            <ReactMarkdown
                                linkTarget="_blank"
                                className={styles.citationPanelContent}
                                children={activeCitation.content}
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                            />
                        </div>
                        
                    </Stack.Item>
                    )}
            </Stack>
        </div>
  )
}

export default Chat
