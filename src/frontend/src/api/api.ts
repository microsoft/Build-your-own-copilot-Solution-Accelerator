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
  try {
    const response = await fetch('/.auth/me');
    if (!response.ok) {
      console.log('No identity provider found. Access to chat will be blocked.');
      return [];
    }
    
    const payload = await response.json();
    
    if (payload && payload.length > 0) {
      const userInfo: UserInfo = {
        access_token: payload[0].access_token || '',
        expires_on: payload[0].expires_on || '',
        id_token: payload[0].id_token || '',
        provider_name: payload[0].provider_name || '',
        user_claims: payload[0].user_claims || [],
        user_id: payload[0].user_claims?.find((claim: any) => 
          claim.typ === 'http://schemas.microsoft.com/identity/claims/objectidentifier'
        )?.val || payload[0].user_id || ''
      };
      return [userInfo];
    }
    
    return payload;
  } catch (e) {
    console.error('Error fetching user info:', e);
    return [];
  }
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
    return response
  }

  return response
}
