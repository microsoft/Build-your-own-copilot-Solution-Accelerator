@description('Existing AI Project Name')
param existingAIProjectName string

@description('Existing AI Foundry Name')
param existingAIFoundryName string

@description('AI Search Name')
param aiSearchName string

@description('AI Search Resource ID')
param aiSearchResourceId string

@description('AI Search Location')
param aiSearchLocation string

@description('AI Search Connection Name')
param aiSearchConnectionName string

resource projectAISearchConnection 'Microsoft.CognitiveServices/accounts/projects/connections@2025-04-01-preview' = {
  name: '${existingAIFoundryName}/${existingAIProjectName}/${aiSearchConnectionName}'
  properties: {
    category: 'CognitiveSearch'
    target: 'https://${aiSearchName}.search.windows.net'
    authType: 'AAD'
    isSharedToAll: true
    metadata: {
      ApiType: 'Azure'
      ResourceId: aiSearchResourceId
      location: aiSearchLocation
    }
  }
}
