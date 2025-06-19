// Creates Azure dependent resources for Azure AI studio
param solutionName string
param solutionLocation string
param keyVaultName string
param deploymentType string
param gptModelName string
param azureOpenaiAPIVersion string
param gptDeploymentCapacity int
param embeddingModel string
param embeddingDeploymentCapacity int
param existingLogAnalyticsWorkspaceId string = ''

// Load the abbrevations file required to name the azure resources.
var abbrs = loadJsonContent('./abbreviations.json')

var aiFoundryName = '${abbrs.ai.aiFoundry}${solutionName}'
var applicationInsightsName = '${abbrs.managementGovernance.applicationInsights}${solutionName}'
var keyvaultName = keyVaultName
var location = solutionLocation //'eastus2'
var aiProjectName = '${abbrs.ai.aiFoundryProject}${solutionName}'
var aiProjectFriendlyName = aiProjectName
var aiProjectDescription = 'AI Foundry Project'
var aiSearchName = '${abbrs.ai.aiSearch}${solutionName}'
var workspaceName = '${abbrs.managementGovernance.logAnalyticsWorkspace}${solutionName}'
var aiModelDeployments = [
  {
    name: gptModelName
    model: gptModelName
    sku: {
      name: deploymentType
      capacity: gptDeploymentCapacity
    }
    raiPolicyName: 'Microsoft.Default'
  }
  {
    name: embeddingModel
    model: embeddingModel
    sku: {
      name: 'Standard'
      capacity: embeddingDeploymentCapacity
    }
    raiPolicyName: 'Microsoft.Default'
  }
]

resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = {
  name: keyVaultName
}

var useExisting = !empty(existingLogAnalyticsWorkspaceId)
var existingLawSubscription = useExisting ? split(existingLogAnalyticsWorkspaceId, '/')[2] : ''
var existingLawResourceGroup = useExisting ? split(existingLogAnalyticsWorkspaceId, '/')[4] : ''
var existingLawName = useExisting ? split(existingLogAnalyticsWorkspaceId, '/')[8] : ''

resource existingLogAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = if (useExisting) {
  name: existingLawName
  scope: resourceGroup(existingLawSubscription, existingLawResourceGroup)
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = if (!useExisting) {
  name: workspaceName
  location: location
  tags: {}
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

// resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
//   name: applicationInsightsName
//   location: location
//   kind: 'web'
//   properties: {
//     Application_Type: 'web'
//     DisableIpMasking: false
//     DisableLocalAuth: false
//     Flow_Type: 'Bluefield'
//     ForceCustomerStorageForProfiler: false
//     ImmediatePurgeDataOn30Days: true
//     IngestionMode: 'ApplicationInsights'
//     publicNetworkAccessForIngestion: 'Enabled'
//     publicNetworkAccessForQuery: 'Disabled'
//     Request_Source: 'rest'
//     WorkspaceResourceId: logAnalytics.id
//   }
// }

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    WorkspaceResourceId: useExisting ? existingLogAnalyticsWorkspace.id : logAnalytics.id
  }
}

resource aiFoundry 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' = {
  name: aiFoundryName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'AIServices'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    allowProjectManagement: true
    customSubDomainName: aiFoundryName
    networkAcls: {
      defaultAction: 'Allow'
      virtualNetworkRules: []
      ipRules: []
    }
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
  }
}

resource aiFoundryProject 'Microsoft.CognitiveServices/accounts/projects@2025-04-01-preview' = {
  parent: aiFoundry
  name: aiProjectName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    description: aiProjectDescription
    displayName: aiProjectFriendlyName
  }
}

@batchSize(1)
resource aiFModelDeployments 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = [
  for aiModeldeployment in aiModelDeployments: {
    parent: aiFoundry
    name: aiModeldeployment.name
    properties: {
      model: {
        format: 'OpenAI'
        name: aiModeldeployment.model
      }
      raiPolicyName: aiModeldeployment.raiPolicyName
    }
    sku: {
      name: aiModeldeployment.sku.name
      capacity: aiModeldeployment.sku.capacity
    }
  }
]

resource aiSearch 'Microsoft.Search/searchServices@2025-02-01-preview' = {
  name: aiSearchName
  location: solutionLocation
  sku: {
    name: 'basic'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    publicNetworkAccess: 'enabled'
    networkRuleSet: {
      ipRules: []
    }
    encryptionWithCmk: {
      enforcement: 'Unspecified'
    }
    disableLocalAuth: false
    authOptions: {
      aadOrApiKey: {
        aadAuthFailureMode: 'http403'
      }
    }
    semanticSearch: 'free'
  }
}

resource aiSearchFoundryConnection 'Microsoft.CognitiveServices/accounts/connections@2025-04-01-preview' ={
  name: 'foundry-search-connection'
  parent: aiFoundry
  properties: {
    category: 'CognitiveSearch'
    target: aiSearch.properties.endpoint
    authType: 'AAD'
    isSharedToAll: true
    metadata: {
      ApiType: 'Azure'
      ResourceId: aiSearch.id
      location: aiSearch.location
    }
  }
}

@description('This is the built-in Search Index Data Reader role.')
resource searchIndexDataReaderRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  scope: aiSearch
  name: '1407120a-92aa-4202-b7e9-c0e197c71c8f'
}

resource searchIndexDataReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(aiSearch.id, aiFoundry.id, searchIndexDataReaderRoleDefinition.id)
  scope: aiSearch
  properties: {
    roleDefinitionId: searchIndexDataReaderRoleDefinition.id
    principalId: aiFoundry.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

@description('This is the built-in Search Service Contributor role.')
resource searchServiceContributorRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  scope: aiSearch
  name: '7ca78c08-252a-4471-8644-bb5ff32d4ba0'
}

resource searchServiceContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(aiSearch.id, aiFoundry.id, searchServiceContributorRoleDefinition.id)
  scope: aiSearch
  properties: {
    roleDefinitionId: searchServiceContributorRoleDefinition.id
    principalId: aiFoundry.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource appInsightsFoundryConnection 'Microsoft.CognitiveServices/accounts/connections@2025-04-01-preview' = {
  name: 'foundry-app-insights-connection'
  parent: aiFoundry
  properties: {
    category: 'AppInsights'
    target: applicationInsights.id
    authType: 'ApiKey'
    isSharedToAll: true
    credentials: {
      key: applicationInsights.properties.ConnectionString
    }
    metadata: {
      ApiType: 'Azure'
      ResourceId: applicationInsights.id
    }
  }
}

// resource azureOpenAIApiKeyEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
//   parent: keyVault
//   name: 'AZURE-OPENAI-KEY'
//   properties: {
//     value: aiFoundry.listKeys().key1 //aiServices_m.listKeys().key1
//   }
// }

resource azureOpenAIApiVersionEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  parent: keyVault
  name: 'AZURE-OPENAI-PREVIEW-API-VERSION'
  properties: {
    value: azureOpenaiAPIVersion //'2024-07-18'
  }
}

resource azureOpenAIEndpointEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  parent: keyVault
  name: 'AZURE-OPENAI-ENDPOINT'
  properties: {
    value: aiFoundry.properties.endpoints['OpenAI Language Model Instance API'] //aiServices_m.properties.endpoint
  }
}

resource azureOpenAIEmbeddingModelEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  parent: keyVault
  name: 'AZURE-OPENAI-EMBEDDING-MODEL'
  properties: {
    value: embeddingModel
  }
}

// resource azureSearchAdminKeyEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
//   parent: keyVault
//   name: 'AZURE-SEARCH-KEY'
//   properties: {
//     value: aiSearch.listAdminKeys().primaryKey
//   }
// }

resource azureSearchServiceEndpointEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  parent: keyVault
  name: 'AZURE-SEARCH-ENDPOINT'
  properties: {
    value: 'https://${aiSearch.name}.search.windows.net'
  }
}

resource azureSearchIndexEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  parent: keyVault
  name: 'AZURE-SEARCH-INDEX'
  properties: {
    value: 'transcripts_index'
  }
}

output keyvaultName string = keyvaultName
output keyvaultId string = keyVault.id

output aiFoundryProjectEndpoint string = aiFoundryProject.properties.endpoints['AI Foundry API']
output aiServicesTarget string = aiFoundry.properties.endpoint //aiServices_m.properties.endpoint
output aoaiEndpoint string = aiFoundry.properties.endpoints['OpenAI Language Model Instance API'] //aiServices_m.properties.endpoint
output aiFoundryName string = aiFoundryName //aiServicesName_m
output aiFoundryId string = aiFoundry.id //aiServices_m.id

output aiSearchName string = aiSearchName
output aiSearchId string = aiSearch.id
output aiSearchTarget string = 'https://${aiSearch.name}.search.windows.net'
output aiSearchService string = aiSearch.name
output aiFoundryProjectName string = aiFoundryProject.name

output applicationInsightsId string = applicationInsights.id
output logAnalyticsWorkspaceResourceName string = useExisting ? existingLogAnalyticsWorkspace.name : logAnalytics.name
output logAnalyticsWorkspaceResourceGroup string = useExisting ? existingLawResourceGroup : resourceGroup().name


output applicationInsightsConnectionString string = applicationInsights.properties.ConnectionString
