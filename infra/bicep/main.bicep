// ========== main.bicep ========== //
targetScope = 'resourceGroup'

@minLength(3)
@maxLength(20)
@description('A unique prefix for all resources in this deployment. This should be 3-20 characters long:')
param environmentName string

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
  'gpt-4o'
  'gpt-4'
])
param gptModelName string = 'gpt-4o-mini'

param azureOpenaiAPIVersion string = '2025-01-01-preview'

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

param imageTag string = 'latest'

var uniqueId = toLower(uniqueString(environmentName, subscription().id, resourceGroup().location))
var solutionPrefix = 'ca${padLeft(take(uniqueId, 12), 12, '0')}'

// Load the abbrevations file required to name the azure resources.
var abbrs = loadJsonContent('./abbreviations.json')

// var ApplicationInsightsName = '${abbrs.managementGovernance.applicationInsights}${solutionPrefix}-main'
// var WorkspaceName = '${abbrs.managementGovernance.logAnalyticsWorkspace}${solutionPrefix}-main'

var resourceGroupLocation = resourceGroup().location
var solutionLocation = resourceGroupLocation
// var baseUrl = 'https://raw.githubusercontent.com/microsoft/Build-your-own-copilot-Solution-Accelerator/main/'

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
   Only return the generated SQL query. Do not return anything else.'''
   
var functionAppCallTranscriptSystemPrompt = '''You are an assistant who supports wealth advisors in preparing for client meetings. 
  You have access to the client’s past meeting call transcripts. 
  When answering questions, especially summary requests, provide a detailed and structured response that includes key topics, concerns, decisions, and trends. 
  If no data is available, state 'No relevant data found for previous meetings.'''

var functionAppStreamTextSystemPrompt = '''You are a helpful assistant to a Wealth Advisor. 
  The currently selected client's name is '{SelectedClientName}', and any case-insensitive or partial mention should be understood as referring to this client.
  If no name is provided, assume the question is about '{SelectedClientName}'.
  If the query references a different client or includes comparative terms like 'compare' or 'other client', please respond with: 'Please only ask questions about the selected client or select another client.'
  Otherwise, provide thorough answers using only data from SQL or call transcripts. 
  If no data is found, please respond with 'No data found for that client.' Remove any client identifiers from the final response.'''

// ========== Managed Identity ========== //
module managedIdentityModule 'deploy_managed_identity.bicep' = {
  name: 'deploy_managed_identity'
  params: {
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
    miName: '${abbrs.security.managedIdentity}${solutionPrefix}'
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
    kvName: '${abbrs.security.keyVault}${solutionPrefix}'
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
    azureOpenaiAPIVersion: azureOpenaiAPIVersion
    gptDeploymentCapacity: gptDeploymentCapacity
    embeddingModel: embeddingModel
    embeddingDeploymentCapacity: embeddingDeploymentCapacity
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
  }
  scope: resourceGroup(resourceGroup().name)
}

// ========== CosmosDB ========== //
module cosmosDBModule 'deploy_cosmos_db.bicep' = {
  name: 'deploy_cosmos_db'
  params: {
    solutionLocation: cosmosLocation
    cosmosDBName:'${abbrs.databases.cosmosDBDatabase}${solutionPrefix}'
    kvName: keyvaultModule.outputs.keyvaultName
  }
  scope: resourceGroup(resourceGroup().name)
}


// ========== Storage Account Module ========== //
module storageAccountModule 'deploy_storage_account.bicep' = {
  name: 'deploy_storage_account'
  params: {
    solutionLocation: solutionLocation
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
    saName: '${abbrs.storage.storageAccount}${solutionPrefix}'
    keyVaultName:keyvaultModule.outputs.keyvaultName
  }
  scope: resourceGroup(resourceGroup().name)
}

//========== SQL DB Module ========== //
module sqlDBModule 'deploy_sql_db.bicep' = {
  name: 'deploy_sql_db'
  params: {
    solutionLocation: solutionLocation
    keyVaultName:keyvaultModule.outputs.keyvaultName
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
    managedIdentityName:managedIdentityModule.outputs.managedIdentityOutput.name
    serverName: '${abbrs.databases.sqlDatabaseServer}${solutionPrefix}'
    sqlDBName: '${abbrs.databases.sqlDatabase}${solutionPrefix}'
  }
  scope: resourceGroup(resourceGroup().name)
}

//========== Updates to Key Vault ========== //
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = {
  name: aifoundry.outputs.keyvaultName
  scope: resourceGroup(resourceGroup().name)
}

//========== Deployment script to upload sample data ========== //
// module uploadFiles 'deploy_post_deployment_scripts.bicep' = {
//   name : 'deploy_post_deployment_scripts'
//   params:{
//     solutionName: solutionPrefix
//     solutionLocation: resourceGroupLocation
//     baseUrl: baseUrl
//     storageAccountName: storageAccountModule.outputs.storageName
//     containerName: storageAccountModule.outputs.storageContainer
//     managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.id
//     managedIdentityClientId:managedIdentityModule.outputs.managedIdentityOutput.clientId
//     keyVaultName:aifoundry.outputs.keyvaultName
//     logAnalyticsWorkspaceResourceName: aifoundry.outputs.logAnalyticsWorkspaceResourceName
//     sqlServerName: sqlDBModule.outputs.sqlServerName
//     sqlDbName: sqlDBModule.outputs.sqlDbName
//     sqlUsers: [
//       {
//         principalId: managedIdentityModule.outputs.managedIdentityFnAppOutput.clientId  // Replace with actual Principal ID
//         principalName: managedIdentityModule.outputs.managedIdentityFnAppOutput.name    // Replace with actual user email or name
//         databaseRoles: ['db_datareader']
//       }
//       {
//         principalId: managedIdentityModule.outputs.managedIdentityWebAppOutput.clientId  // Replace with actual Principal ID
//         principalName: managedIdentityModule.outputs.managedIdentityWebAppOutput.name    // Replace with actual user email or name
//         databaseRoles: ['db_datareader', 'db_datawriter']
//       }
//     ]
//   }
// }

// resource Workspace 'Microsoft.OperationalInsights/workspaces@2020-08-01' = {
//   name: WorkspaceName
//   location: resourceGroup().location
//   properties: {
//     sku: {
//       name: 'PerGB2018'
//     }
//     retentionInDays: 30
//   }
// }

// resource ApplicationInsights 'Microsoft.Insights/components@2020-02-02' = {
//   name: ApplicationInsightsName
//   location: resourceGroup().location
//   tags: {
//     'hidden-link:${resourceId('Microsoft.Web/sites',ApplicationInsightsName)}': 'Resource'
//   }
//   properties: {
//     Application_Type: 'web'
//     WorkspaceResourceId: Workspace.id
//   }
//   kind: 'web'
// }

// ========== Azure Functions Module ========== //
module azureFunctions 'deploy_azure_function.bicep' = {
  name : 'deploy_azure_function'
  params:{
    solutionLocation: solutionLocation
    functionAppName:'${abbrs.compute.functionApp}${solutionPrefix}'
    containerAppEnvame:'${abbrs.containers.containerAppsEnvironment}${solutionPrefix}'
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
    imageTag: imageTag  
    sqlSystemPrompt: functionAppSqlPrompt
    callTranscriptSystemPrompt: functionAppCallTranscriptSystemPrompt
    streamTextSystemPrompt: functionAppStreamTextSystemPrompt
    userassignedIdentityClientId:managedIdentityModule.outputs.managedIdentityFnAppOutput.clientId
    userassignedIdentityId:managedIdentityModule.outputs.managedIdentityFnAppOutput.id
    applicationInsightsId: aifoundry.outputs.applicationInsightsId
    storageAccountName:aifoundry.outputs.storageAccountName
    logAnalyticsWorkspaceName: aifoundry.outputs.logAnalyticsWorkspaceResourceName
  }
  dependsOn:[keyVault]
}

module azureFunctionURL 'deploy_azure_function_script_url.bicep' = {
  name : 'deploy_azure_function_script_url'
  params:{
    functionAppName: azureFunctions.outputs.functionAppName
  }
}

// ========== App Service Module ========== //
module appserviceModule 'deploy_app_service.bicep' = {
  name: 'deploy_app_service'
  params: {
    HostingPlanName: '${abbrs.compute.appServicePlan}${solutionPrefix}'
    WebsiteName: '${abbrs.compute.webApp}${solutionPrefix}'
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
    AZURE_COSMOSDB_ACCOUNT: cosmosDBModule.outputs.cosmosAccountName
    AZURE_COSMOSDB_CONVERSATIONS_CONTAINER: cosmosDBModule.outputs.cosmosContainerName
    AZURE_COSMOSDB_DATABASE: cosmosDBModule.outputs.cosmosDatabaseName
    AZURE_COSMOSDB_ENABLE_FEEDBACK: 'True'
    //VITE_POWERBI_EMBED_URL: 'TBD'
    imageTag: imageTag
    userassignedIdentityClientId:managedIdentityModule.outputs.managedIdentityWebAppOutput.clientId
    userassignedIdentityId:managedIdentityModule.outputs.managedIdentityWebAppOutput.id
    applicationInsightsId: aifoundry.outputs.applicationInsightsId
  }
  scope: resourceGroup(resourceGroup().name)
}

output WEB_APP_URL string = appserviceModule.outputs.webAppUrl
output STORAGE_ACCOUNT_NAME string = storageAccountModule.outputs.storageName
output STORAGE_CONTAINER_NAME string = storageAccountModule.outputs.storageContainer
output KEY_VAULT_NAME string = keyvaultModule.outputs.keyvaultName
output COSMOSDB_ACCOUNT_NAME string = cosmosDBModule.outputs.cosmosAccountName
output RESOURCE_GROUP_NAME string = resourceGroup().name
output SQLDB_SERVER string = sqlDBModule.outputs.sqlServerName
output SQLDB_DATABASE string = sqlDBModule.outputs.sqlDbName
output MANAGEDINDENTITY_FNAPP_NAME string = managedIdentityModule.outputs.managedIdentityFnAppOutput.name
output MANAGEDINDENTITY_FNAPP_CLIENTID string = managedIdentityModule.outputs.managedIdentityFnAppOutput.clientId
output MANAGEDINDENTITY_WEBAPP_NAME string = managedIdentityModule.outputs.managedIdentityWebAppOutput.name
output MANAGEDINDENTITY_WEBAPP_CLIENTID string = managedIdentityModule.outputs.managedIdentityWebAppOutput.clientId
