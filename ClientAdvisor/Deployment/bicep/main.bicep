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

var resourceGroupLocation = resourceGroup().location
// var subscriptionId  = subscription().subscriptionId

var solutionLocation = resourceGroupLocation
var baseUrl = 'https://raw.githubusercontent.com/microsoft/Build-your-own-copilot-Solution-Accelerator/main/ClientAdvisor/'
var appversion = 'latest'

var functionAppSqlPrompt = '''A valid T-SQL query to find {query} for tables and columns provided below:
1. Table: Clients
Columns: ClientId,Client,Email,Occupation,MaritalStatus,Dependents
2. Table: InvestmentGoals
Columns: ClientId,InvestmentGoal
3. Table: Assets
Columns: ClientId,AssetDate,Investment,ROI,Revenue,AssetType
4. Table: ClientSummaries
Columns: ClientId,ClientSummary
5. Table: InvestmentGoalsDetails
Columns: ClientId,InvestmentGoal,TargetAmount,Contribution
6. Table: Retirement
Columns: ClientId,StatusDate,RetirementGoalProgress,EducationGoalProgress
7.Table: ClientMeetings
Columns: ClientId,ConversationId,Title,StartTime,EndTime,Advisor,ClientEmail
Use Investement column from Assets table as value always.
Assets table has snapshots of values by date. Do not add numbers across different dates for total values.
Do not use client name in filter.
Do not include assets values unless asked for.
Always use ClientId = {clientid} in the query filter.
Always return client name in the query.
If a question involves date and time, always use FORMAT(YourDateTimeColumn, 'yyyy-MM-dd HH:mm:ss') in the query.
If asked, provide information about client meetings according to the requested timeframe: give details about upcoming meetings if asked for "next" or "upcoming" meetings, and provide details about past meetings if asked for "previous" or "last" meetings including the scheduled time and don't filter with "LIMIT 1"  in the query.
If asked about the number of past meetings with this client, provide the count of records where the ConversationId is neither null nor an empty string and the EndTime is before the current date in the query.
If asked, provide information on the client's portfolio performance in the query.
If asked, provide information about the client's top-performing investments in the query.
If asked, provide information about any recent changes in the client's investment allocations in the query.
If asked about the client's portfolio performance over the last quarter, calculate the total investment by summing the investment amounts where AssetDate is greater than or equal to the date from one quarter ago using DATEADD(QUARTER, -1, GETDATE()) in the query.
If asked about upcoming important dates or deadlines for the client, always ensure that StartTime is greater than the current date. Do not convert the formats of StartTime and EndTime and consistently provide the upcoming dates along with the scheduled times in the query.
To determine the asset value, sum the investment values for the most recent available date.  If asked for the asset types in the portfolio and the present of each, provide a list of each asset type with its most recent investment value.
If the user inquires about asset on a specific date ,sum the investment values for the specific date avoid summing values from all dates prior to the requested date.If asked for the asset types in the portfolio and the value of each for specific date , provide a list of each asset type with specific date investment value avoid summing values from all dates prior to the requested date.
Only return the generated sql query. do not return anything else'''

var functionAppCallTranscriptSystemPrompt = '''You are an assistant who provides wealth advisors with helpful information to prepare for client meetings.
You have access to the client’s meeting call transcripts.
If requested for call transcript(s), the response for each transcript should be summarized separately and Ensure all transcripts for the specified client are retrieved and format **must** follow as First Call Summary,Second Call Summary etc.
if asked related to count of call transcripts,**Always** respond the total number of sourceurid involved for the {ClientId} consistently, Do never change if question is reframed or contains "so far" or if the case is altered or having first name or full name of the client present with so far or case altered with first name of the client or case altered with first name of client and so far.
You can use this information to answer questions about the clients'''

var functionAppStreamTextSystemPrompt = '''
You are an assistant who provides wealth advisors with helpful information to prepare for client meetings. 
You have access to the client’s meeting call transcripts.
If requested for call transcript(s), the response for each transcript should be summarized separately and Ensure all transcripts for the specified client are retrieved and format **must** follow as First Call Summary,Second Call Summary etc.
if asked related to count of call transcripts, **Always** respond the total number of sourceurid involved for the {ClientId} consistently, Do never change if question is reframed or contains "so far" or if the case is altered or having first name or full name of the client present with so far or case altered with first name of the client or case altered with first name of client and so far.
You can use this information to answer questions about the clients
'''

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

module uploadFiles 'deploy_upload_files_script.bicep' = {
  name : 'deploy_upload_files_script'
  params:{
    storageAccountName:storageAccountModule.outputs.storageAccountOutput.name
    solutionLocation: solutionLocation
    containerName:storageAccountModule.outputs.storageAccountOutput.dataContainer
    identity:managedIdentityModule.outputs.managedIdentityOutput.id
    baseUrl:baseUrl
  }
  dependsOn:[storageAccountModule]
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

module createIndex 'deploy_index_scripts.bicep' = {
  name : 'deploy_index_scripts'
  params:{
    solutionLocation: solutionLocation
    identity:managedIdentityModule.outputs.managedIdentityOutput.id
    baseUrl:baseUrl
    keyVaultName:keyvaultModule.outputs.keyvaultOutput.name
  }
  dependsOn:[keyvaultModule]
}

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
    AzureOpenAIModel:'gpt-4'
    AzureOpenAIKey:azOpenAI.outputs.openAIOutput.openAPIKey
    AzureOpenAIModelName:'gpt-4'
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
    VITE_POWERBI_EMBED_URL: 'TBD'
    Appversion: appversion
  }
  scope: resourceGroup(resourceGroup().name)
  dependsOn:[azOpenAI,azAIMultiServiceAccount,azSearchService,sqlDBModule,azureFunctionURL,cosmosDBModule]
}
