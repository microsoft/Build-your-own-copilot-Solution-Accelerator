import { type Action, type AppState } from './AppProvider'
import { SidebarOptions } from '../components/SidebarView/SidebarView'

// Define the reducer function
export const appStateReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'UPDATE_CURRENT_CHAT':
      return { ...state, currentChat: action.payload }
    case 'UPDATE_GRANTS_CHAT':
      return { ...state, grantsChat: action.payload }
    case 'UPDATE_ARTICLES_CHAT':
      return { ...state, articlesChat: action.payload }
    case 'FETCH_FRONTEND_SETTINGS':
      return { ...state, frontendSettings: action.payload }
    case 'UPDATE_DRAFT_DOCUMENTS_SECTIONS':
      return {
        ...state,
        documentSections: action.payload
      }
    case 'UPDATE_RESEARCH_TOPIC':
      return {
        ...state,
        researchTopic: action.payload
      }
    case 'TOGGLE_FAVORITE_CITATION':
      const { id } = action.payload.citation
      const isFavorited = state.favoritedCitations.some(citation => citation.id === id)
      if (!isFavorited) {
        return {
          ...state,
          favoritedCitations: [
            ...state.favoritedCitations,
            action.payload.citation // Extract the citation property
          ]
        }
      } else {
        return {
          ...state,
          favoritedCitations: state.favoritedCitations.filter(citation => citation.id !== id)
        }
      }
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarExpanded: !state.isSidebarExpanded }
    case 'UPDATE_SIDEBAR_SELECTION':
      const showInitialChatMessage = state.sidebarSelection === null && state.researchTopic !== '' &&
                ((state.grantsChat === null && action.payload === SidebarOptions.Grant) ||
                (state.articlesChat === null && action.payload === SidebarOptions.Article))

      // set current chat to currentChat, grantsChat, or articlesChat
      var currentChat = state.currentChat
      if (action.payload === SidebarOptions.Grant) {
        currentChat = state.grantsChat
      } else if (action.payload === SidebarOptions.Article) {
        currentChat = state.articlesChat
      }

      return { ...state, sidebarSelection: action.payload, showInitialChatMessage, currentChat }
    case 'SET_SHOW_INITIAL_CHAT_MESSAGE_FLAG':
      return { ...state, showInitialChatMessage: action.payload }
    default:
      return state
  }
}
