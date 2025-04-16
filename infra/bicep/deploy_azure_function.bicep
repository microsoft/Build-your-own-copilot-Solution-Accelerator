@description('Specifies the location for resources.')
param solutionName string 
param solutionLocation string
@secure()
param azureOpenAIApiKey string
param azureOpenAIApiVersion string
param azureOpenAIEndpoint string
@secure()
param azureSearchAdminKey string
param azureSearchServiceEndpoint string
param azureSearchIndex string
param sqlServerName string
param sqlDbName string
param sqlDbUser string
@secure()
param sqlDbPwd string
param functionAppVersion string
@description('Azure Function App SQL System Prompt')
param sqlSystemPrompt string
@description('Azure Function App CallTranscript System Prompt')
param callTranscriptSystemPrompt string
@description('Azure Function App Stream Text System Prompt')
param streamTextSystemPrompt string
param userassignedIdentityId string
param userassignedIdentityClientId string
param storageAccountName string
param applicationInsightsId string

var functionAppName = '${solutionName}fn'
var azureOpenAIDeploymentModel = 'gpt-4o-mini'
var azureOpenAIEmbeddingDeployment = 'text-embedding-ada-002'
var valueOne = '1'

// resource storageAccount 'Microsoft.Storage/storageAccounts@2021-04-01' = {
//   name: '${solutionName}fnstorage'
//   location: solutionLocation
//   sku: {
//     name: 'Standard_LRS'
//   }
//   kind: 'StorageV2'
//   properties: {
//     allowSharedKeyAccess: false
//   }
// }

// resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
//   name: 'workspace-${solutionName}'
//   location: solutionLocation
// }

// resource ApplicationInsights 'Microsoft.Insights/components@2020-02-02' = {
//   name: functionAppName
//   location: solutionLocation
//   kind: 'web'
//   properties: {
//     Application_Type: 'web'
//     publicNetworkAccessForIngestion: 'Enabled'
//     publicNetworkAccessForQuery: 'Enabled'
//     WorkspaceResourceId: logAnalyticsWorkspace.id
//   }
// }

resource containerAppEnv 'Microsoft.App/managedEnvironments@2022-06-01-preview' = {
  name: '${solutionName}env'
  location: solutionLocation
  sku: {
    name: 'Consumption'
  }
  properties: {
    // appLogsConfiguration: {
    //   destination: 'log-analytics'
    //   logAnalyticsConfiguration: {
    //     customerId: logAnalyticsWorkspace.properties.customerId
    //     sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
    //   }
    // }
  }
}

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppName
  location: solutionLocation
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: {
      '${userassignedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|bycwacontainerreg.azurecr.io/byc-wa-fn:${functionAppVersion}'
      appSettings: [
        {
          name: 'AzureWebJobsStorage__accountname'
          value: storageAccountName
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: reference(applicationInsightsId, '2015-05-01').InstrumentationKey
        }
        {
          name: 'AZURE_OPEN_AI_API_KEY'
          value: azureOpenAIApiKey
        }
        {
          name: 'AZURE_OPEN_AI_DEPLOYMENT_MODEL'
          value: azureOpenAIDeploymentModel
        }
        {
          name: 'AZURE_OPEN_AI_ENDPOINT'
          value: azureOpenAIEndpoint
        }
        {
          name: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT'
          value: azureOpenAIEmbeddingDeployment
        }
        {
          name: 'OPENAI_API_VERSION'
          value: azureOpenAIApiVersion
        }
        {
          name: 'AZURE_AI_SEARCH_API_KEY'
          value: azureSearchAdminKey
        }
        {
          name: 'AZURE_AI_SEARCH_ENDPOINT'
          value: azureSearchServiceEndpoint
        }
        {
          name: 'AZURE_SEARCH_INDEX'
          value: azureSearchIndex
        }
        {
          name: 'PYTHON_ENABLE_INIT_INDEXING'
          value: valueOne
        }
        {
          name: 'PYTHON_ISOLATE_WORKER_DEPENDENCIES'
          value: valueOne
        }
        {
          name: 'SQLDB_CONNECTION_STRING'
          value: 'TBD'
        }
        {
          name: 'SQLDB_SERVER'
          value: sqlServerName
        }
        {
          name: 'SQLDB_DATABASE'
          value: sqlDbName
        }
        {
          name: 'SQLDB_USERNAME'
          value: sqlDbUser
        }
        {
          name: 'SQLDB_PASSWORD'
          value: sqlDbPwd
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
          name: 'SQLDB_USER_MID'
          value: userassignedIdentityClientId
        }
      ]
    }
  }
}
