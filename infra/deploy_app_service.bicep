// ========== Key Vault ========== //
targetScope = 'resourceGroup'

@description('Required. Solution Location')
param solutionLocation string

@description('Optional. The pricing tier for the App Service plan')
@allowed(['F1', 'D1', 'B1', 'B2', 'B3', 'S1', 'S2', 'S3', 'P1', 'P2', 'P3', 'P4', 'P0v3'])
param hostingPlanSku string = 'B2'

@description('Required. Name of App Service plan')
param hostingPlanName string

@description('Required. Name of Web App')
param websiteName string

@description('Specifies the application environment')
param appEnvironment string

// @description('Name of Application Insights')
// param ApplicationInsightsName string = '${ solutionName }-app-insights'

@description('Optional. Name of Azure Search Service')
param azureSearchService string = ''

@description('Optional. Name of Azure Search Index')
param azureSearchIndex string = ''

@description('Optional. Use semantic search')
param azureSearchUseSemanticSearch string = 'False'

@description('Optional. Semantic search config')
param azureSearchSemanticSearchConfig string = 'default'

@description('Optional. Top K results')
param azureSearchTopK string = '5'

@description('Optional. Enable in domain')
param azureSearchEnableInDomain string = 'False'

@description('Optional. Content columns')
param azureSearchContentColumns string = 'content'

@description('Optional. Filename column')
param azureSearchFilenameColumn string = 'filename'

@description('Optional. Title column')
param azureSearchTitleColumn string = 'client_id'

@description('Optional. Url column')
param azureSearchUrlColumn string = 'sourceurl'

@description('Required. Name of Azure OpenAI Resource')
param azureOpenAIResource string

@description('Optional. Azure OpenAI Model Deployment Name')
param azureOpenAIModel string = 'gpt-4o-mini'

@description('Optional. Azure Open AI Endpoint')
param azureOpenAIEndpoint string = ''

@description('Optional. Azure OpenAI Temperature')
param azureOpenAITemperature string = '0'

@description('Optional. Azure OpenAI Top P')
param azureOpenAITopP string = '1'

@description('Optional. Azure OpenAI Max Tokens')
param azureOpenAIMaxTokens string = '1000'

@description('Optional. Azure OpenAI Stop Sequence')
param azureOpenAIStopSequence string = '\n'

@description('Optional. Azure OpenAI System Message')
param azureOpenAISystemMessage string = 'You are an AI assistant that helps people find information.'

@description('Optional. Azure OpenAI Api Version')
param azureOpenAIApiVersion string = '2024-02-15-preview'

@description('Optional. Whether or not to stream responses from Azure OpenAI')
param azureOpenAIStream string = 'True'

@description('Optional. Azure Search Query Type')
@allowed(['simple', 'semantic', 'vector', 'vectorSimpleHybrid', 'vectorSemanticHybrid'])
param azureSearchQueryType string = 'simple'

@description('Optional. Azure Search Vector Fields')
param azureSearchVectorFields string = 'contentVector'

@description('Optional. Azure Search Permitted Groups Field')
param azureSearchPermittedGroupsField string = ''

@description('Optional. Azure Search Strictness')
@allowed(['1', '2', '3', '4', '5'])
param azureSearchStrictness string = '3'

@description('Optional. Azure OpenAI Embedding Deployment Name')
param azureOpenAIEmbeddingName string = ''

@description('Optional. Azure Open AI Embedding Endpoint')
param azureOpenAIEmbeddingEndpoint string = ''

@description('Optional. Use Azure Function')
param USE_INTERNAL_STREAM string = 'True'

@description('Optional. SQL Database Server Name')
param SQLDB_SERVER string = ''

@description('Optional. SQL Database Name')
param SQLDB_DATABASE string = ''

@description('Optional. Azure Cosmos DB Account')
param AZURE_COSMOSDB_ACCOUNT string = ''

@description('Optional. Azure Cosmos DB Conversations Container')
param AZURE_COSMOSDB_CONVERSATIONS_CONTAINER string = ''

@description('Optional. Azure Cosmos DB Database')
param AZURE_COSMOSDB_DATABASE string = ''

@description('Optional. Enable feedback in Cosmos DB')
param AZURE_COSMOSDB_ENABLE_FEEDBACK string = 'True'

//@description('Power BI Embed URL')
//param VITE_POWERBI_EMBED_URL string = ''

@description('Required. The container image tag to be deployed')
param imageTag string

@description('Required. The resource ID of the user-assigned managed identity to be used by the deployed resources.')
param userassignedIdentityId string

@description('Required. The client ID of the user-assigned managed identity.')
param userassignedIdentityClientId string

@description('Required. The Instrumentation Key or Resource ID of the Application Insights resource used for monitoring.')
param applicationInsightsId string

@description('Required. The endpoint URL of the Azure Cognitive Search service.')
param azureSearchServiceEndpoint string

@description('Required. Azure Function App SQL System Prompt')
param sqlSystemPrompt string

@description('Required. Azure Function App CallTranscript System Prompt')
param callTranscriptSystemPrompt string

@description('Required. Azure Function App Stream Text System Prompt')
param streamTextSystemPrompt string

@description('Required. AI Foundry project endpoint URL.')
param aiFoundryProjectEndpoint string

@description('Optional. Flag to enable AI project client.')
param useAIProjectClientFlag string = 'false'

@description('Required. Name of the AI Foundry project.')
param aiFoundryName string

@description('Required. Application Insights connection string.')
param applicationInsightsConnectionString string

@description('Required. Connection name for Azure Cognitive Search.')
param aiSearchProjectConnectionName string

@description('Optional. Tags to be applied to the resources.')
param tags object = {}

// var webAppImageName = 'DOCKER|byoaiacontainer.azurecr.io/byoaia-app:latest'

// var webAppImageName = 'DOCKER|ncwaappcontainerreg1.azurecr.io/ncqaappimage:v1.0.0'

var webAppImageName = 'DOCKER|bycwacontainerreg.azurecr.io/byc-wa-app:${imageTag}'

@description('Optional. Resource ID of the existing AI Foundry project.')
param azureExistingAIProjectResourceId string = ''

var existingAIServiceSubscription = !empty(azureExistingAIProjectResourceId)
  ? split(azureExistingAIProjectResourceId, '/')[2]
  : subscription().subscriptionId
var existingAIServiceResourceGroup = !empty(azureExistingAIProjectResourceId)
  ? split(azureExistingAIProjectResourceId, '/')[4]
  : resourceGroup().name
var existingAIServicesName = !empty(azureExistingAIProjectResourceId)
  ? split(azureExistingAIProjectResourceId, '/')[8]
  : ''
var existingAIProjectName = !empty(azureExistingAIProjectResourceId) ? split(azureExistingAIProjectResourceId, '/')[10] : ''

resource hostingPlan 'Microsoft.Web/serverfarms@2020-06-01' = {
  name: hostingPlanName
  location: solutionLocation
  sku: {
    name: hostingPlanSku
  }
  properties: {
    name: hostingPlanName
    reserved: true
  }
  kind: 'linux'
  tags: tags
}

resource website 'Microsoft.Web/sites@2020-06-01' = {
  name: websiteName
  location: solutionLocation
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: {
      '${userassignedIdentityId}': {}
    }
  }
  properties: {
    serverFarmId: hostingPlanName
    siteConfig: {
      appSettings: [
        {
          name: 'APP_ENV'
          value: appEnvironment
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: reference(applicationInsightsId, '2015-05-01').InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsightsConnectionString
        }
        {
          name: 'AZURE_SEARCH_SERVICE'
          value: azureSearchService
        }
        {
          name: 'AZURE_SEARCH_INDEX'
          value: azureSearchIndex
        }
        {
          name: 'AZURE_SEARCH_USE_SEMANTIC_SEARCH'
          value: azureSearchUseSemanticSearch
        }
        {
          name: 'AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG'
          value: azureSearchSemanticSearchConfig
        }
        {
          name: 'AZURE_SEARCH_TOP_K'
          value: azureSearchTopK
        }
        {
          name: 'AZURE_SEARCH_ENABLE_IN_DOMAIN'
          value: azureSearchEnableInDomain
        }
        {
          name: 'AZURE_SEARCH_CONTENT_COLUMNS'
          value: azureSearchContentColumns
        }
        {
          name: 'AZURE_SEARCH_FILENAME_COLUMN'
          value: azureSearchFilenameColumn
        }
        {
          name: 'AZURE_SEARCH_TITLE_COLUMN'
          value: azureSearchTitleColumn
        }
        {
          name: 'AZURE_SEARCH_URL_COLUMN'
          value: azureSearchUrlColumn
        }
        {
          name: 'AZURE_OPENAI_RESOURCE'
          value: azureOpenAIResource
        }
        {
          name: 'AZURE_OPENAI_MODEL'
          value: azureOpenAIModel
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: azureOpenAIEndpoint
        }
        {
          name: 'AZURE_OPENAI_TEMPERATURE'
          value: azureOpenAITemperature
        }
        {
          name: 'AZURE_OPENAI_TOP_P'
          value: azureOpenAITopP
        }
        {
          name: 'AZURE_OPENAI_MAX_TOKENS'
          value: azureOpenAIMaxTokens
        }
        {
          name: 'AZURE_OPENAI_STOP_SEQUENCE'
          value: azureOpenAIStopSequence
        }
        {
          name: 'AZURE_OPENAI_SYSTEM_MESSAGE'
          value: azureOpenAISystemMessage
        }
        {
          name: 'AZURE_OPENAI_PREVIEW_API_VERSION'
          value: azureOpenAIApiVersion
        }
        {
          name: 'AZURE_OPENAI_STREAM'
          value: azureOpenAIStream
        }
        {
          name: 'AZURE_SEARCH_QUERY_TYPE'
          value: azureSearchQueryType
        }
        {
          name: 'AZURE_SEARCH_VECTOR_COLUMNS'
          value: azureSearchVectorFields
        }
        {
          name: 'AZURE_SEARCH_PERMITTED_GROUPS_COLUMN'
          value: azureSearchPermittedGroupsField
        }
        {
          name: 'AZURE_SEARCH_STRICTNESS'
          value: azureSearchStrictness
        }
        {
          name: 'AZURE_OPENAI_EMBEDDING_NAME'
          value: azureOpenAIEmbeddingName
        }
        {
          name: 'AZURE_OPENAI_EMBEDDING_ENDPOINT'
          value: azureOpenAIEmbeddingEndpoint
        }
        {
          name: 'SQLDB_SERVER'
          value: SQLDB_SERVER
        }
        {
          name: 'SQLDB_DATABASE'
          value: SQLDB_DATABASE
        }
        {
          name: 'USE_INTERNAL_STREAM'
          value: USE_INTERNAL_STREAM
        }
        {
          name: 'AZURE_COSMOSDB_ACCOUNT'
          value: AZURE_COSMOSDB_ACCOUNT
        }
        {
          name: 'AZURE_COSMOSDB_CONVERSATIONS_CONTAINER'
          value: AZURE_COSMOSDB_CONVERSATIONS_CONTAINER
        }
        {
          name: 'AZURE_COSMOSDB_DATABASE'
          value: AZURE_COSMOSDB_DATABASE
        }
        {
          name: 'AZURE_COSMOSDB_ENABLE_FEEDBACK'
          value: AZURE_COSMOSDB_ENABLE_FEEDBACK
        }
        //{name: 'VITE_POWERBI_EMBED_URL'
        //  value: VITE_POWERBI_EMBED_URL
        //}
        {
          name: 'SQLDB_USER_MID'
          value: userassignedIdentityClientId
        }
        {
          name: 'AZURE_AI_SEARCH_ENDPOINT'
          value: azureSearchServiceEndpoint
        }
        {
          name: 'AZURE_SQL_SYSTEM_PROMPT'
          value: sqlSystemPrompt
        }
        {
          name: 'AZURE_CALL_TRANSCRIPT_SYSTEM_PROMPT'
          value: callTranscriptSystemPrompt
        }
        {
          name: 'AZURE_OPENAI_STREAM_TEXT_SYSTEM_PROMPT'
          value: streamTextSystemPrompt
        }
        {
          name: 'USE_AI_PROJECT_CLIENT'
          value: useAIProjectClientFlag
        }
        {
          name: 'AZURE_AI_AGENT_ENDPOINT'
          value: aiFoundryProjectEndpoint
        }
        {
          name: 'AZURE_AI_AGENT_MODEL_DEPLOYMENT_NAME'
          value: azureOpenAIModel
        }
        {
          name: 'AZURE_AI_AGENT_API_VERSION'
          value: azureOpenAIApiVersion
        }
        {
          name: 'AZURE_SEARCH_CONNECTION_NAME'
          value: aiSearchProjectConnectionName
        }
      ]
      linuxFxVersion: webAppImageName
    }
  }
  tags: tags
  dependsOn: [hostingPlan]
}

// resource ApplicationInsights 'Microsoft.Insights/components@2020-02-02' = {
//   name: ApplicationInsightsName
//   location: resourceGroup().location
//   tags: {
//     'hidden-link:${resourceId('Microsoft.Web/sites',ApplicationInsightsName)}': 'Resource'
//   }
//   properties: {
//     Application_Type: 'web'
//   }
//   kind: 'web'
// }

resource contributorRoleDefinition 'Microsoft.DocumentDB/databaseAccounts/sqlRoleDefinitions@2024-05-15' existing = {
  name: '${AZURE_COSMOSDB_ACCOUNT}/00000000-0000-0000-0000-000000000002'
}

module cosmosUserRole 'core/database/cosmos/cosmos-role-assign.bicep' = {
  name: 'cosmos-sql-user-role-${websiteName}'
  params: {
    accountName: AZURE_COSMOSDB_ACCOUNT
    roleDefinitionId: contributorRoleDefinition.id
    principalId: website.identity.principalId
  }
  dependsOn: [
    website
  ]
}

resource aiFoundry 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' existing = {
  name: aiFoundryName
  scope: resourceGroup(existingAIServiceSubscription, existingAIServiceResourceGroup)
}

@description('This is the built-in Azure AI User role.')
resource aiUserRoleDefinitionFoundry 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  scope: aiFoundry
  name: '53ca6127-db72-4b80-b1b0-d745d6d5456d'
}

resource assignAiUserRoleToAiProject 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (empty(azureExistingAIProjectResourceId))  {
  name: guid(resourceGroup().id, aiFoundry.id, aiUserRoleDefinitionFoundry.id)
  // scope: aiProject
  properties: {
    principalId: website.identity.principalId
    roleDefinitionId: aiUserRoleDefinitionFoundry.id
    principalType: 'ServicePrincipal'
  }
}

module assignAiUserRoleToAiProjectExisting 'deploy_foundry_model_role_assignment.bicep' = if (!empty(azureExistingAIProjectResourceId)) {
  name: 'assignAiUserRoleToAiProjectExisting'
  scope: resourceGroup(existingAIServiceSubscription, existingAIServiceResourceGroup)
  params: {
    principalId: website.identity.principalId
    roleDefinitionId: aiUserRoleDefinitionFoundry.id
    roleAssignmentName: guid(website.name, aiFoundry.id, aiUserRoleDefinitionFoundry.id)
    aiFoundryName: !empty(azureExistingAIProjectResourceId) ? existingAIServicesName : aiFoundryName
    aiProjectName: existingAIProjectName
    tags: tags
  }
}

@description('URL of the deployed web application.')
output webAppUrl string = 'https://${websiteName}.azurewebsites.net'

@description('Name of the deployed web application.')
output webAppName string = websiteName
