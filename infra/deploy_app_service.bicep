// ========== Key Vault ========== //
targetScope = 'resourceGroup'

@description('Solution Location')
 param solutionLocation string

@description('The pricing tier for the App Service plan')
@allowed(
  ['F1', 'D1', 'B1', 'B2', 'B3', 'S1', 'S2', 'S3', 'P1', 'P2', 'P3', 'P4','P0v3']
)
param HostingPlanSku string = 'B2'

param HostingPlanName string
param WebsiteName string

// @description('Name of Application Insights')
// param ApplicationInsightsName string = '${ solutionName }-app-insights'

@description('Name of Azure Search Service')
param AzureSearchService string = ''

@description('Name of Azure Search Index')
param AzureSearchIndex string = ''

@description('Azure Search Admin Key')
@secure()
param AzureSearchKey string = ''

@description('Use semantic search')
param AzureSearchUseSemanticSearch string = 'False'

@description('Semantic search config')
param AzureSearchSemanticSearchConfig string = 'default'

@description('Top K results')
param AzureSearchTopK string = '5'

@description('Enable in domain')
param AzureSearchEnableInDomain string = 'False'

@description('Content columns')
param AzureSearchContentColumns string = 'content'

@description('Filename column')
param AzureSearchFilenameColumn string = 'filename'

@description('Title column')
param AzureSearchTitleColumn string = 'client_id'

@description('Url column')
param AzureSearchUrlColumn string = 'sourceurl'

@description('Name of Azure OpenAI Resource')
param AzureOpenAIResource string

@description('Azure OpenAI Model Deployment Name')
param AzureOpenAIModel string

@description('Azure Open AI Endpoint')
param AzureOpenAIEndpoint string = ''

@description('Azure OpenAI Key')
@secure()
param AzureOpenAIKey string

@description('Azure OpenAI Temperature')
param AzureOpenAITemperature string = '0'

@description('Azure OpenAI Top P')
param AzureOpenAITopP string = '1'

@description('Azure OpenAI Max Tokens')
param AzureOpenAIMaxTokens string = '1000'

@description('Azure OpenAI Stop Sequence')
param AzureOpenAIStopSequence string = '\n'

@description('Azure OpenAI System Message')
param AzureOpenAISystemMessage string = 'You are an AI assistant that helps people find information.'

@description('Azure OpenAI Api Version')
param AzureOpenAIApiVersion string = '2024-02-15-preview'

@description('Whether or not to stream responses from Azure OpenAI')
param AzureOpenAIStream string = 'True'

@description('Azure Search Query Type')
@allowed(
  ['simple', 'semantic', 'vector', 'vectorSimpleHybrid', 'vectorSemanticHybrid']
)
param AzureSearchQueryType string = 'simple'

@description('Azure Search Vector Fields')
param AzureSearchVectorFields string = 'contentVector'

@description('Azure Search Permitted Groups Field')
param AzureSearchPermittedGroupsField string = ''

@description('Azure Search Strictness')
@allowed(['1', '2', '3', '4', '5'])
param AzureSearchStrictness string = '3'

@description('Azure OpenAI Embedding Deployment Name')
param AzureOpenAIEmbeddingName string = ''

@description('Azure Open AI Embedding Key')
@secure()
param AzureOpenAIEmbeddingkey string = ''

@description('Azure Open AI Embedding Endpoint')
param AzureOpenAIEmbeddingEndpoint string = ''

@description('Use Azure Function')
param USE_INTERNAL_STREAM string = 'True'

@description('SQL Database Server Name')
param SQLDB_SERVER string = ''

@description('SQL Database Name')
param SQLDB_DATABASE string = ''

@description('SQL Database Username')
param SQLDB_USERNAME string = ''

@description('SQL Database Password')
@secure()
param SQLDB_PASSWORD string = ''

@description('Azure Cosmos DB Account')
param AZURE_COSMOSDB_ACCOUNT string = ''

// @description('Azure Cosmos DB Account Key')
// @secure()
// param AZURE_COSMOSDB_ACCOUNT_KEY string = ''

@description('Azure Cosmos DB Conversations Container')
param AZURE_COSMOSDB_CONVERSATIONS_CONTAINER string = ''

@description('Azure Cosmos DB Database')
param AZURE_COSMOSDB_DATABASE string = ''

@description('Enable feedback in Cosmos DB')
param AZURE_COSMOSDB_ENABLE_FEEDBACK string = 'True'

//@description('Power BI Embed URL')
//param VITE_POWERBI_EMBED_URL string = ''

param imageTag string

param userassignedIdentityId string
param userassignedIdentityClientId string
param applicationInsightsId string

param azureSearchServiceEndpoint string

@description('Azure Function App SQL System Prompt')
param sqlSystemPrompt string
@description('Azure Function App CallTranscript System Prompt')
param callTranscriptSystemPrompt string
@description('Azure Function App Stream Text System Prompt')
param streamTextSystemPrompt string

@secure()
param aiProjectConnectionString string
param useAIProjectClientFlag string = 'false'
param aiProjectName string
param applicationInsightsConnectionString string

// var WebAppImageName = 'DOCKER|byoaiacontainer.azurecr.io/byoaia-app:latest'

// var WebAppImageName = 'DOCKER|ncwaappcontainerreg1.azurecr.io/ncqaappimage:v1.0.0'

var WebAppImageName = 'DOCKER|bycwacontainerreg.azurecr.io/byc-wa-app:${imageTag}'

resource HostingPlan 'Microsoft.Web/serverfarms@2020-06-01' = {
  name: HostingPlanName
  location: solutionLocation
  sku: {
    name: HostingPlanSku
  }
  properties: {
    name: HostingPlanName
    reserved: true
  }
  kind: 'linux'
}

resource Website 'Microsoft.Web/sites@2020-06-01' = {
  name: WebsiteName
  location: solutionLocation
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: {
      '${userassignedIdentityId}': {}
    }
  }
  properties: {
    serverFarmId: HostingPlanName
    siteConfig: {
      appSettings: [
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
          value: AzureSearchService
        }
        {
          name: 'AZURE_SEARCH_INDEX'
          value: AzureSearchIndex
        }
        {
          name: 'AZURE_SEARCH_KEY'
          value: AzureSearchKey
        }
        {
          name: 'AZURE_SEARCH_USE_SEMANTIC_SEARCH'
          value: AzureSearchUseSemanticSearch
        }
        {
          name: 'AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG'
          value: AzureSearchSemanticSearchConfig
        }
        {
          name: 'AZURE_SEARCH_TOP_K'
          value: AzureSearchTopK
        }
        {
          name: 'AZURE_SEARCH_ENABLE_IN_DOMAIN'
          value: AzureSearchEnableInDomain
        }
        {
          name: 'AZURE_SEARCH_CONTENT_COLUMNS'
          value: AzureSearchContentColumns
        }
        {
          name: 'AZURE_SEARCH_FILENAME_COLUMN'
          value: AzureSearchFilenameColumn
        }
        {
          name: 'AZURE_SEARCH_TITLE_COLUMN'
          value: AzureSearchTitleColumn
        }
        {
          name: 'AZURE_SEARCH_URL_COLUMN'
          value: AzureSearchUrlColumn
        }
        {
          name: 'AZURE_OPENAI_RESOURCE'
          value: AzureOpenAIResource
        }
        {
          name: 'AZURE_OPENAI_MODEL'
          value: AzureOpenAIModel
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: AzureOpenAIEndpoint
        }
        {
          name: 'AZURE_OPENAI_KEY'
          value: AzureOpenAIKey
        }
        {
          name: 'AZURE_OPENAI_TEMPERATURE'
          value: AzureOpenAITemperature
        }
        {
          name: 'AZURE_OPENAI_TOP_P'
          value: AzureOpenAITopP
        }
        {
          name: 'AZURE_OPENAI_MAX_TOKENS'
          value: AzureOpenAIMaxTokens
        }
        {
          name: 'AZURE_OPENAI_STOP_SEQUENCE'
          value: AzureOpenAIStopSequence
        }
        {
          name: 'AZURE_OPENAI_SYSTEM_MESSAGE'
          value: AzureOpenAISystemMessage
        }
        {
          name: 'AZURE_OPENAI_PREVIEW_API_VERSION'
          value: AzureOpenAIApiVersion
        }
        {
          name: 'AZURE_OPENAI_STREAM'
          value: AzureOpenAIStream
        }
        {
          name: 'AZURE_SEARCH_QUERY_TYPE'
          value: AzureSearchQueryType
        }
        {
          name: 'AZURE_SEARCH_VECTOR_COLUMNS'
          value: AzureSearchVectorFields
        }
        {
          name: 'AZURE_SEARCH_PERMITTED_GROUPS_COLUMN'
          value: AzureSearchPermittedGroupsField
        }
        {
          name: 'AZURE_SEARCH_STRICTNESS'
          value: AzureSearchStrictness
        }
        {
          name: 'AZURE_OPENAI_EMBEDDING_NAME'
          value: AzureOpenAIEmbeddingName
        }

        {
          name: 'AZURE_OPENAI_EMBEDDING_KEY'
          value: AzureOpenAIEmbeddingkey
        }

        {
          name: 'AZURE_OPENAI_EMBEDDING_ENDPOINT'
          value: AzureOpenAIEmbeddingEndpoint
        }

        {name: 'SQLDB_SERVER'
          value: SQLDB_SERVER
        }

        {name: 'SQLDB_DATABASE'
          value: SQLDB_DATABASE
        }

        {name: 'SQLDB_USERNAME'
          value: SQLDB_USERNAME
        }

        {name: 'SQLDB_PASSWORD'
          value: SQLDB_PASSWORD
        }

        {name: 'USE_INTERNAL_STREAM'
          value: USE_INTERNAL_STREAM
        }

        {name: 'AZURE_COSMOSDB_ACCOUNT'
          value: AZURE_COSMOSDB_ACCOUNT
        }
        {name: 'AZURE_COSMOSDB_CONVERSATIONS_CONTAINER'
          value: AZURE_COSMOSDB_CONVERSATIONS_CONTAINER
        }
        {name: 'AZURE_COSMOSDB_DATABASE'
          value: AZURE_COSMOSDB_DATABASE
        }
        {name: 'AZURE_COSMOSDB_ENABLE_FEEDBACK'
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
          name: 'SQLDB_CONNECTION_STRING'
          value: 'TBD'
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
          name: 'AZURE_AI_PROJECT_CONN_STRING'
          value: aiProjectConnectionString
        }
        {
          name: 'USE_AI_PROJECT_CLIENT'
          value: useAIProjectClientFlag
        }
      ]
      linuxFxVersion: WebAppImageName
    }
  }
  dependsOn: [HostingPlan]
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
  name: 'cosmos-sql-user-role-${WebsiteName}'
  params: {
    accountName: AZURE_COSMOSDB_ACCOUNT
    roleDefinitionId: contributorRoleDefinition.id
    principalId: Website.identity.principalId
  }
  dependsOn: [
    Website
  ]
}

resource aiHubProject 'Microsoft.MachineLearningServices/workspaces@2024-01-01-preview' existing = {
  name: aiProjectName
}

resource aiDeveloper 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  name: '64702f94-c441-49e6-a78b-ef80e0188fee'
}

resource aiDeveloperAccessProj 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(Website.name, aiHubProject.id, aiDeveloper.id)
  scope: aiHubProject
  properties: {
    roleDefinitionId: aiDeveloper.id
    principalId: Website.identity.principalId
  }
}

output webAppUrl string = 'https://${WebsiteName}.azurewebsites.net'
