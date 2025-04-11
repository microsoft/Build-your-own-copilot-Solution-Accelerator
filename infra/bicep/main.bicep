// ========== main.bicep ========== //
targetScope = 'resourceGroup'

@minLength(3)
@maxLength(6)
@description('Prefix Name')
param solutionPrefix string

@description('CosmosDB Location')
param cosmosLocation string

@minLength(1)
@description('GPT model deployment type:')
@allowed([
  'Standard'
  'GlobalStandard'
])
param deploymentType string = 'GlobalStandard'

@minLength(1)
@description('Name of the GPT model to deploy:')
@allowed([
  'gpt-4o-mini'
  'gpt-4'
])
param gptModelName string = 'gpt-4o-mini'

param azureOpenaiAPIVersion string = '2024-07-18'

@minValue(10)
@description('Capacity of the GPT deployment:')
// You can increase this, but capacity is limited per model/region, so you will get errors if you go over
// https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits
param gptDeploymentCapacity int = 30

@minLength(1)
@description('Name of the Text Embedding model to deploy:')
@allowed([
  'text-embedding-ada-002'
])
param embeddingModel string = 'text-embedding-ada-002'


@minValue(10)
@description('Capacity of the Embedding Model deployment')
param embeddingDeploymentCapacity int = 80

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

// ========== Key Vault ========== //
module keyvaultModule 'deploy_keyvault.bicep' = {
  name: 'deploy_keyvault'
  params: {
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
    adlsAccountName:storageAccountModule.outputs.storageAccountOutput.storageAccountName
  }
  scope: resourceGroup(resourceGroup().name)
}

// ==========AI Foundry and related resources ========== //
module aifoundry 'deploy_ai_foundry.bicep' = {
  name: 'deploy_ai_foundry'
  params: {
    solutionName: solutionPrefix
    solutionLocation: resourceGroupLocation
    keyVaultName: keyvaultModule.outputs.keyvaultName
    deploymentType: deploymentType
    gptModelName: gptModelName
    gptModelVersion: azureOpenaiAPIVersion
    gptDeploymentCapacity: gptDeploymentCapacity
    embeddingModel: embeddingModel
    embeddingDeploymentCapacity: embeddingDeploymentCapacity
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
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
    keyVaultName:keyvaultModule.outputs.keyvaultName
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
    managedIdentityName:managedIdentityModule.outputs.managedIdentityOutput.name
  }
  scope: resourceGroup(resourceGroup().name)
}

//========== Updates to Key Vault ========== //
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = {
  name: aifoundry.outputs.keyvaultName
  scope: resourceGroup(resourceGroup().name)
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
    keyVaultName:aifoundry.outputs.keyvaultName
    logAnalyticsWorkspaceResourceName: aifoundry.outputs.logAnalyticsWorkspaceResourceName
    sqlServerName: sqlDBModule.outputs.sqlServerName
    sqlDbName: sqlDBModule.outputs.sqlDbName
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
    azureOpenAIApiKey:keyVault.getSecret('AZURE-OPENAI-KEY')
    azureOpenAIApiVersion:azureOpenaiAPIVersion
    azureOpenAIEndpoint:aifoundry.outputs.aiServicesTarget
    azureSearchAdminKey:keyVault.getSecret('AZURE-SEARCH-KEY')
    azureSearchServiceEndpoint:aifoundry.outputs.aiSearchTarget
    azureSearchIndex:'transcripts_index'
    sqlServerName:sqlDBModule.outputs.sqlServerName
    sqlDbName:sqlDBModule.outputs.sqlDbName
    sqlDbUser:sqlDBModule.outputs.sqlDbUser
    sqlDbPwd:keyVault.getSecret('SQLDB-PASSWORD')
    functionAppVersion: appversion  
    sqlSystemPrompt: functionAppSqlPrompt
    callTranscriptSystemPrompt: functionAppCallTranscriptSystemPrompt
    streamTextSystemPrompt: functionAppStreamTextSystemPrompt
    userassignedIdentityClientId:managedIdentityModule.outputs.managedIdentityFnAppOutput.clientId
    userassignedIdentityId:managedIdentityModule.outputs.managedIdentityFnAppOutput.id
  }
  dependsOn:[keyVault]
}

module azureFunctionURL 'deploy_azure_function_script_url.bicep' = {
  name : 'deploy_azure_function_script_url'
  params:{
    solutionName: solutionPrefix
    identity:managedIdentityModule.outputs.managedIdentityOutput.id
  }
  dependsOn:[azureFunctions]
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
    AzureSearchService:aifoundry.outputs.aiSearchService
    AzureSearchIndex:'transcripts_index'
    AzureSearchKey:keyVault.getSecret('AZURE-SEARCH-KEY')
    AzureSearchUseSemanticSearch:'True'
    AzureSearchSemanticSearchConfig:'my-semantic-config'
    AzureSearchIndexIsPrechunked:'False'
    AzureSearchTopK:'5'
    AzureSearchContentColumns:'content'
    AzureSearchFilenameColumn:'chunk_id'
    AzureSearchTitleColumn:'client_id'
    AzureSearchUrlColumn:'sourceurl'
    AzureOpenAIResource:aifoundry.outputs.aiServicesTarget
    AzureOpenAIEndpoint:aifoundry.outputs.aiServicesTarget
    AzureOpenAIModel:gptModelName
    AzureOpenAIKey:keyVault.getSecret('AZURE-OPENAI-KEY')
    AzureOpenAIModelName:gptModelName
    AzureOpenAITemperature:'0'
    AzureOpenAITopP:'1'
    AzureOpenAIMaxTokens:'1000'
    AzureOpenAIStopSequence:''
    AzureOpenAISystemMessage:'''You are a helpful Wealth Advisor assistant''' 
    AzureOpenAIApiVersion:azureOpenaiAPIVersion
    AzureOpenAIStream:'True'
    AzureSearchQueryType:'simple'
    AzureSearchVectorFields:'contentVector'
    AzureSearchPermittedGroupsField:''
    AzureSearchStrictness:'3'
    AzureOpenAIEmbeddingName:embeddingModel
    AzureOpenAIEmbeddingkey:keyVault.getSecret('AZURE-OPENAI-KEY')
    AzureOpenAIEmbeddingEndpoint:aifoundry.outputs.aiServicesTarget
    USE_AZUREFUNCTION:'True'
    STREAMING_AZUREFUNCTION_ENDPOINT: azureFunctionURL.outputs.functionAppUrl
    SQLDB_SERVER:sqlDBModule.outputs.sqlServerName
    SQLDB_DATABASE:sqlDBModule.outputs.sqlDbName
    SQLDB_USERNAME:sqlDBModule.outputs.sqlDbUser
    SQLDB_PASSWORD:keyVault.getSecret('SQLDB-PASSWORD')
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
}
