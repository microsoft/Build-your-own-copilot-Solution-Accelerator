// ========== main.bicep ========== //
targetScope = 'resourceGroup'

@minLength(3)
@maxLength(6)
@description('Prefix Name')
param solutionPrefix string

@description('CosmosDB Location')
param cosmosLocation string

// @description('Fabric Workspace Id if you have one, else leave it empty. ')
// param fabricWorkspaceId string

//restricting to these regions because assistants api for gpt-4o-mini is available only in these regions
// @allowed(['eastus', 'eastus2', 'westus', 'westus3', 'swedencentral'])
// @description('Azure OpenAI Location')
// param AzureOpenAILocation string

var resourceGroupLocation = resourceGroup().location
// var subscriptionId  = subscription().subscriptionId

var solutionLocation = resourceGroupLocation
var baseUrl = 'https://raw.githubusercontent.com/microsoft/Build-your-own-copilot-Solution-Accelerator/main/'
var appversion = 'latest'

var functionAppSqlPrompt ='''Generate a valid T-SQL query to find {query} for tables and columns provided below:
   1. Table: Clients
   Columns: ClientId, Client, Email, Occupation, MaritalStatus, Dependents
   2. Table: InvestmentGoals
   Columns: ClientId, InvestmentGoal
   3. Table: Assets
   Columns: ClientId, AssetDate, Investment, ROI, Revenue, AssetType
   4. Table: ClientSummaries
   Columns: ClientId, ClientSummary
   5. Table: InvestmentGoalsDetails
   Columns: ClientId, InvestmentGoal, TargetAmount, Contribution
   6. Table: Retirement
   Columns: ClientId, StatusDate, RetirementGoalProgress, EducationGoalProgress
   7. Table: ClientMeetings
   Columns: ClientId, ConversationId, Title, StartTime, EndTime, Advisor, ClientEmail
   Always use the Investment column from the Assets table as the value.
   Assets table has snapshots of values by date. Do not add numbers across different dates for total values.
   Do not use client name in filters.
   Do not include assets values unless asked for.
   ALWAYS use ClientId = {clientid} in the query filter.
   ALWAYS select Client Name (Column: Client) in the query.
   Query filters are IMPORTANT. Add filters like AssetType, AssetDate, etc. if needed.
   If the result might return more than 100 rows, include TOP 100 to limit the row count.
   Only return the generated SQL query. Do not return anything else.'''
   
var functionAppCallTranscriptSystemPrompt = '''You are an assistant who supports wealth advisors in preparing for client meetings. 
  You have access to the client’s past meeting call transcripts. 
  When answering questions, especially summary requests, provide a detailed and structured response that includes key topics, concerns, decisions, and trends. 
  If no data is available, state 'No relevant data found for previous meetings.'''

var functionAppStreamTextSystemPrompt = '''You are a helpful assistant to a Wealth Advisor. 
  The currently selected client's name is '{SelectedClientName}' (in any variation: ignoring punctuation, apostrophes, and case). 
  If the user mentions no name, assume they are asking about '{SelectedClientName}'. 
  If the user references a name that clearly differs from '{SelectedClientName}', respond only with: 'Please only ask questions about the selected client or select another client.' Otherwise, provide thorough answers for every question using only data from SQL or call transcripts. 
  If no data is found, respond with 'No data found for that client.' Remove any client identifiers from the final response.'''

// ========== Managed Identity ========== //
module managedIdentityModule 'deploy_managed_identity.bicep' = {
  name: 'deploy_managed_identity'
  params: {
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
  }
  scope: resourceGroup(resourceGroup().name)
}

module cosmosDBModule 'core/database/cosmos/deploy_cosmos_db.bicep' = {
  name: 'deploy_cosmos_db'
  params: {
    solutionName: solutionPrefix
    solutionLocation: cosmosLocation
  }
  scope: resourceGroup(resourceGroup().name)
}


// ========== Storage Account Module ========== //
module storageAccountModule 'deploy_storage_account.bicep' = {
  name: 'deploy_storage_account'
  params: {
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
  }
  scope: resourceGroup(resourceGroup().name)
}

//========== SQL DB Module ========== //
module sqlDBModule 'deploy_sql_db.bicep' = {
  name: 'deploy_sql_db'
  params: {
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
    managedIdentityName:managedIdentityModule.outputs.managedIdentityOutput.name
  }
  scope: resourceGroup(resourceGroup().name)
}

// ========== Azure AI services multi-service account ========== //
module azAIMultiServiceAccount 'deploy_azure_ai_service.bicep' = {
  name: 'deploy_azure_ai_service'
  params: {
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
  }
} 

// ========== Search service ========== //
module azSearchService 'deploy_ai_search_service.bicep' = {
  name: 'deploy_ai_search_service'
  params: {
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
  }
} 

// ========== Azure OpenAI ========== //
module azOpenAI 'deploy_azure_open_ai.bicep' = {
  name: 'deploy_azure_open_ai'
  params: {
    solutionName: solutionPrefix
    solutionLocation: resourceGroupLocation
  }
}

//========== Deployment script to upload sample data ========== //
module uploadFiles 'deploy_post_deployment_scripts.bicep' = {
  name : 'deploy_post_deployment_scripts'
  params:{
    solutionName: solutionPrefix
    solutionLocation: resourceGroupLocation
    baseUrl: baseUrl
    storageAccountName: storageAccountModule.outputs.storageAccountOutput.storageAccountName
    containerName: storageAccountModule.outputs.storageAccountOutput.dataContainer
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.id
    managedIdentityClientId:managedIdentityModule.outputs.managedIdentityOutput.clientId
    keyVaultName:keyvaultModule.outputs.keyvaultOutput.name
    logAnalyticsWorkspaceResourceName: azureFunctions.outputs.logAnalyticsWorkspaceName
    sqlServerName: sqlDBModule.outputs.sqlDbOutput.sqlServerName
    sqlDbName: sqlDBModule.outputs.sqlDbOutput.sqlDbName
    sqlUsers: [
      {
        principalId: managedIdentityModule.outputs.managedIdentityFnAppOutput.clientId  // Replace with actual Principal ID
        principalName: managedIdentityModule.outputs.managedIdentityFnAppOutput.name    // Replace with actual user email or name
        databaseRoles: ['db_datareader']
      }
      {
        principalId: managedIdentityModule.outputs.managedIdentityWebAppOutput.clientId  // Replace with actual Principal ID
        principalName: managedIdentityModule.outputs.managedIdentityWebAppOutput.name    // Replace with actual user email or name
        databaseRoles: ['db_datareader', 'db_datawriter']
      }
    ]
  }
}

module azureFunctions 'deploy_azure_function.bicep' = {
  name : 'deploy_azure_function'
  params:{
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
    azureOpenAIApiKey:azOpenAI.outputs.openAIOutput.openAPIKey
    azureOpenAIApiVersion:'2024-02-15-preview'
    azureOpenAIEndpoint:azOpenAI.outputs.openAIOutput.openAPIEndpoint
    azureSearchAdminKey:azSearchService.outputs.searchServiceOutput.searchServiceAdminKey
    azureSearchServiceEndpoint:azSearchService.outputs.searchServiceOutput.searchServiceEndpoint
    azureSearchIndex:'transcripts_index'
    sqlServerName:sqlDBModule.outputs.sqlDbOutput.sqlServerName
    sqlDbName:sqlDBModule.outputs.sqlDbOutput.sqlDbName
    sqlDbUser:sqlDBModule.outputs.sqlDbOutput.sqlDbUser
    sqlDbPwd:sqlDBModule.outputs.sqlDbOutput.sqlDbPwd
    functionAppVersion: appversion  
    sqlSystemPrompt: functionAppSqlPrompt
    callTranscriptSystemPrompt: functionAppCallTranscriptSystemPrompt
    streamTextSystemPrompt: functionAppStreamTextSystemPrompt
    userassignedIdentityClientId:managedIdentityModule.outputs.managedIdentityFnAppOutput.clientId
    userassignedIdentityId:managedIdentityModule.outputs.managedIdentityFnAppOutput.id
  }
  dependsOn:[storageAccountModule]
}

module azureFunctionURL 'deploy_azure_function_script_url.bicep' = {
  name : 'deploy_azure_function_script_url'
  params:{
    solutionName: solutionPrefix
    identity:managedIdentityModule.outputs.managedIdentityOutput.id
  }
  dependsOn:[azureFunctions]
}


// ========== Key Vault ========== //

module keyvaultModule 'deploy_keyvault.bicep' = {
  name: 'deploy_keyvault'
  params: {
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
    objectId: managedIdentityModule.outputs.managedIdentityOutput.objectId
    tenantId: subscription().tenantId
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
    adlsAccountName:storageAccountModule.outputs.storageAccountOutput.storageAccountName
    azureOpenAIApiKey:azOpenAI.outputs.openAIOutput.openAPIKey
    azureOpenAIApiVersion:'2024-02-15-preview'
    azureOpenAIEndpoint:azOpenAI.outputs.openAIOutput.openAPIEndpoint
    azureSearchAdminKey:azSearchService.outputs.searchServiceOutput.searchServiceAdminKey
    azureSearchServiceEndpoint:azSearchService.outputs.searchServiceOutput.searchServiceEndpoint
    azureSearchServiceName:azSearchService.outputs.searchServiceOutput.searchServiceName
    azureSearchIndex:'transcripts_index'
    cogServiceEndpoint:azAIMultiServiceAccount.outputs.cogSearchOutput.cogServiceEndpoint
    cogServiceName:azAIMultiServiceAccount.outputs.cogSearchOutput.cogServiceName
    cogServiceKey:azAIMultiServiceAccount.outputs.cogSearchOutput.cogServiceKey
    sqlServerName:sqlDBModule.outputs.sqlDbOutput.sqlServerName
    sqlDbName:sqlDBModule.outputs.sqlDbOutput.sqlDbName
    sqlDbUser:sqlDBModule.outputs.sqlDbOutput.sqlDbUser
    sqlDbPwd:sqlDBModule.outputs.sqlDbOutput.sqlDbPwd
    enableSoftDelete:false
  }
  scope: resourceGroup(resourceGroup().name)
  dependsOn:[storageAccountModule,azOpenAI,azSearchService,sqlDBModule]
}

// module createIndex 'deploy_index_scripts.bicep' = {
//   name : 'deploy_index_scripts'
//   params:{
//     solutionLocation: solutionLocation
//     identity:managedIdentityModule.outputs.managedIdentityOutput.id
//     baseUrl:baseUrl
//     keyVaultName:keyvaultModule.outputs.keyvaultOutput.name
//   }
//   dependsOn:[keyvaultModule]
// }

// module createaihub 'deploy_aihub_scripts.bicep' = {
//   name : 'deploy_aihub_scripts'
//   params:{
//     solutionLocation: solutionLocation
//     identity:managedIdentityModule.outputs.managedIdentityOutput.id
//     baseUrl:baseUrl
//     keyVaultName:keyvaultModule.outputs.keyvaultOutput.name
//     solutionName: solutionPrefix
//     resourceGroupName:resourceGroupName
//     subscriptionId:subscriptionId
//   }
//   dependsOn:[keyvaultModule]
// }


module appserviceModule 'deploy_app_service.bicep' = {
  name: 'deploy_app_service'
  params: {
    solutionName: solutionPrefix
    AzureSearchService:azSearchService.outputs.searchServiceOutput.searchServiceName
    AzureSearchIndex:'transcripts_index'
    AzureSearchKey:azSearchService.outputs.searchServiceOutput.searchServiceAdminKey
    AzureSearchUseSemanticSearch:'True'
    AzureSearchSemanticSearchConfig:'my-semantic-config'
    AzureSearchIndexIsPrechunked:'False'
    AzureSearchTopK:'5'
    AzureSearchContentColumns:'content'
    AzureSearchFilenameColumn:'chunk_id'
    AzureSearchTitleColumn:'client_id'
    AzureSearchUrlColumn:'sourceurl'
    AzureOpenAIResource:azOpenAI.outputs.openAIOutput.openAPIEndpoint
    AzureOpenAIEndpoint:azOpenAI.outputs.openAIOutput.openAPIEndpoint
    AzureOpenAIModel:'gpt-4o-mini'
    AzureOpenAIKey:azOpenAI.outputs.openAIOutput.openAPIKey
    AzureOpenAIModelName:'gpt-4o-mini'
    AzureOpenAITemperature:'0'
    AzureOpenAITopP:'1'
    AzureOpenAIMaxTokens:'1000'
    AzureOpenAIStopSequence:''
    AzureOpenAISystemMessage:'''You are a helpful Wealth Advisor assistant''' 
    AzureOpenAIApiVersion:'2024-02-15-preview'
    AzureOpenAIStream:'True'
    AzureSearchQueryType:'simple'
    AzureSearchVectorFields:'contentVector'
    AzureSearchPermittedGroupsField:''
    AzureSearchStrictness:'3'
    AzureOpenAIEmbeddingName:'text-embedding-ada-002'
    AzureOpenAIEmbeddingkey:azOpenAI.outputs.openAIOutput.openAPIKey
    AzureOpenAIEmbeddingEndpoint:azOpenAI.outputs.openAIOutput.openAPIEndpoint
    USE_AZUREFUNCTION:'True'
    STREAMING_AZUREFUNCTION_ENDPOINT: azureFunctionURL.outputs.functionAppUrl
    SQLDB_SERVER:sqlDBModule.outputs.sqlDbOutput.sqlServerName
    SQLDB_DATABASE:sqlDBModule.outputs.sqlDbOutput.sqlDbName
    SQLDB_USERNAME:sqlDBModule.outputs.sqlDbOutput.sqlDbUser
    SQLDB_PASSWORD:sqlDBModule.outputs.sqlDbOutput.sqlDbPwd
    AZURE_COSMOSDB_ACCOUNT: cosmosDBModule.outputs.cosmosOutput.cosmosAccountName
    AZURE_COSMOSDB_CONVERSATIONS_CONTAINER: cosmosDBModule.outputs.cosmosOutput.cosmosContainerName
    AZURE_COSMOSDB_DATABASE: cosmosDBModule.outputs.cosmosOutput.cosmosDatabaseName
    AZURE_COSMOSDB_ENABLE_FEEDBACK: 'True'
    //VITE_POWERBI_EMBED_URL: 'TBD'
    Appversion: appversion
    userassignedIdentityClientId:managedIdentityModule.outputs.managedIdentityWebAppOutput.clientId
    userassignedIdentityId:managedIdentityModule.outputs.managedIdentityWebAppOutput.id
  }
  scope: resourceGroup(resourceGroup().name)
  dependsOn:[azOpenAI,azAIMultiServiceAccount,azSearchService,sqlDBModule,azureFunctionURL,cosmosDBModule]
}
