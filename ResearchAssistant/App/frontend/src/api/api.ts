import { type UserInfo, type ConversationRequest, type DocumentSection } from './models'

export async function conversationApi (options: ConversationRequest, abortSignal: AbortSignal): Promise<Response> {
  const response = await fetch('/conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: options.messages,
      index_name: options.index_name
    }),
    signal: abortSignal
  })

  return response
}

export async function getUserInfo (): Promise<UserInfo[]> {
  const response = await fetch('/.auth/me')
  if (!response.ok) {
    console.log('No identity provider found. Access to chat will be blocked.')
    return []
  }

  const payload = await response.json()
  return payload
}

export const frontendSettings = async (): Promise<Response | null> => {
  const response = await fetch('/frontend_settings', {
    method: 'GET'
  }).then((res) => {
    return res.json()
  }).catch((err) => {
    console.error('There was an issue fetching your data.')
    return null
  })

  return response
}

export const documentSectionGenerate = async (researchTopic: string, documentSection: DocumentSection): Promise<Response | null> => {
  const response = await fetch('/draft_document/generate_section', {
    method: 'POST',
    body: JSON.stringify({
      grantTopic: researchTopic,
      sectionTitle: documentSection.title,
      sectionContext: documentSection.metaPrompt
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  })

  // check for errors
  if (!response.ok) {
    console.error('There was an issue fetching your data.')
    return null
  }

  return response
}
