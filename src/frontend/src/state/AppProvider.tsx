import React, { createContext, useReducer, type ReactNode, useEffect } from 'react'
import { appStateReducer } from './AppReducer'
import { type Conversation, frontendSettings, type FrontendSettings, type DocumentSection, type Citation } from '../api'
import documentSectionData from '../../document-sections.json'
import { type SidebarOptions } from '../components/SidebarView/SidebarView'

export interface AppState {
  currentChat: Conversation | null
  articlesChat: Conversation | null
  grantsChat: Conversation | null
  frontendSettings: FrontendSettings | null
  documentSections: DocumentSection[] | null
  researchTopic: string
  favoritedCitations: Citation[]
  isSidebarExpanded: boolean
  isChatViewOpen: boolean
  sidebarSelection: SidebarOptions | null
  showInitialChatMessage: boolean
}

export type Action =
    | { type: 'UPDATE_CURRENT_CHAT', payload: Conversation | null }
    | { type: 'UPDATE_GRANTS_CHAT', payload: Conversation | null }
    | { type: 'UPDATE_ARTICLES_CHAT', payload: Conversation | null }
    | { type: 'FETCH_FRONTEND_SETTINGS', payload: FrontendSettings | null } // API Call
    | { type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS', payload: DocumentSection[] | null }
    | { type: 'UPDATE_RESEARCH_TOPIC', payload: string }
    | { type: 'TOGGLE_FAVORITE_CITATION', payload: { citation: Citation } }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'UPDATE_SIDEBAR_SELECTION', payload: SidebarOptions | null }
    | { type: 'TOGGLE_CHAT_VIEW' }
    | { type: 'SET_SHOW_INITIAL_CHAT_MESSAGE_FLAG', payload: boolean }

const initialState: AppState = {
  currentChat: null,
  articlesChat: null,
  grantsChat: null,
  frontendSettings: null,
  documentSections: JSON.parse(JSON.stringify(documentSectionData)),
  researchTopic: '',
  favoritedCitations: [],
  isSidebarExpanded: false,
  isChatViewOpen: true,
  sidebarSelection: null,
  showInitialChatMessage: true
}

export const AppStateContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<Action>
} | undefined>(undefined)

interface AppStateProviderProps {
  children: ReactNode
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialState)

  useEffect(() => {
    const getFrontendSettings = async () => {
      frontendSettings().then((response) => {
        dispatch({ type: 'FETCH_FRONTEND_SETTINGS', payload: response as FrontendSettings })
      })
      .catch((err) => {
        console.error('There was an issue fetching your data: ', err)
      })
    }

    getFrontendSettings()
  }, [])

  return (
      <AppStateContext.Provider value={{ state, dispatch }}>
        {children}
      </AppStateContext.Provider>
  )
}
