param existingAIProjectName string
param existingAIFoundryName string
// param aiSearchName string
// param aiSearchResourceId string
// param aiSearchLocation string
param appInsightConnectionName string
param appInsightId string
param appInsightConnectionString string

resource appInsightsFoundryConnection 'Microsoft.CognitiveServices/accounts/projects/connections@2025-04-01-preview' = {
  name: '${existingAIFoundryName}/${existingAIProjectName}/${appInsightConnectionName}'
  properties: {
    category: 'AppInsights'
    target: appInsightId
    authType: 'ApiKey'
    isSharedToAll: true
    credentials: {
      key: appInsightConnectionString
    }
    metadata: {
      ApiType: 'Azure'
      ResourceId: appInsightId
    }
  }
}

// resource projectAISearchConnection 'Microsoft.CognitiveServices/accounts/projects/connections@2025-04-01-preview' = {
//   name: '${existingAIFoundryName}/${existingAIProjectName}/${aiSearchConnectionName}'
//   properties: {
//     category: 'CognitiveSearch'
//     target: 'https://${aiSearchName}.search.windows.net'
//     authType: 'AAD'
//     isSharedToAll: true
//     metadata: {
//       ApiType: 'Azure'
//       ResourceId: aiSearchResourceId
//       location: aiSearchLocation
//     }
//   }
// }

// resource aiSearchFoundryConnection 'Microsoft.CognitiveServices/accounts/connections@2025-04-01-preview' = if (empty(azureExistingAIProjectResourceId)) {
//   name: aiSearchConnectionName
//   parent: aiFoundry
//   properties: {
//     category: 'CognitiveSearch'
//     target: aiSearch.properties.endpoint
//     authType: 'AAD'
//     isSharedToAll: true
//     metadata: {
//       ApiType: 'Azure'
//       ResourceId: aiSearch.id
//       location: aiSearch.location
//     }
//   }
// }
