// ========== main.bicep ========== //
targetScope = 'resourceGroup'

@minLength(3)
@maxLength(20)
@description('Required. A unique prefix for all resources in this deployment. This should be 3-20 characters long:')
param solutionName  string = 'clientadvisor'

@description('Optional. Existing Log Analytics Workspace Resource ID')
param existingLogAnalyticsWorkspaceId string = ''

@description('Optional. Use this parameter to use an existing AI project resource ID')
param azureExistingAIProjectResourceId string = ''

@description('Optional. CosmosDB Location')
param cosmosLocation string = 'eastus2'

@minLength(1)
@description('Optional. GPT model deployment type:')
@allowed([
  'Standard'
  'GlobalStandard'
])
param deploymentType string = 'GlobalStandard'

@minLength(1)
@description('Optional. Name of the GPT model to deploy:')
@allowed([
  'gpt-4o-mini'
])
param gptModelName string = 'gpt-4o-mini'

@description('Optional. API version for the Azure OpenAI service.')
param azureOpenaiAPIVersion string = '2025-04-01-preview'

@minValue(10)
@description('Optional. Capacity of the GPT deployment:')
// You can increase this, but capacity is limited per model/region, so you will get errors if you go over
// https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits
param gptDeploymentCapacity int = 200

@minLength(1)
@description('Name of the Text Embedding model to deploy:')
@allowed([
  'text-embedding-ada-002'
])
param embeddingModel string = 'text-embedding-ada-002'

@minValue(10)
@description('Optional. Capacity of the Embedding Model deployment')
param embeddingDeploymentCapacity int = 80

// @description('Fabric Workspace Id if you have one, else leave it empty. ')
// param fabricWorkspaceId string
param imageTag string = 'latest'

//restricting to these regions because assistants api for gpt-4o-mini is available only in these regions
@allowed(['australiaeast','eastus', 'eastus2','francecentral','japaneast','swedencentral','uksouth', 'westus', 'westus3'])
// @description('Azure OpenAI Location')
// param AzureOpenAILocation string = 'eastus2'

@metadata({
  azd:{
    type: 'location'
    usageName: [
      'OpenAI.GlobalStandard.gpt-4o-mini,200'
      'OpenAI.GlobalStandard.text-embedding-ada-002,80'
    ]
  }
})
@description('Location for AI Foundry deployment. This is the location where the AI Foundry resources will be deployed.')
param aiDeploymentsLocation string

@description('Optional. Set this if you want to deploy to a different region than the resource group. Otherwise, it will use the resource group location by default.')
param AZURE_LOCATION string = ''
var solutionLocation = empty(AZURE_LOCATION) ? resourceGroup().location : AZURE_LOCATION

//var uniqueId = toLower(uniqueString(solutionName , subscription().id, solutionLocation, resourceGroup().name))
//var solutionSuffix = 'ca${padLeft(take(uniqueId, 12), 12, '0')}'
 
@maxLength(5)
@description('Optional. A unique token for the solution. This is used to ensure resource names are unique for global resources. Defaults to a 5-character substring of the unique string generated from the subscription ID, resource group name, and solution name.')
param solutionUniqueToken string = substring(uniqueString(subscription().id, resourceGroup().name, solutionName), 0, 5)
 
var solutionSuffix= toLower(trim(replace(
  replace(
    replace(replace(replace(replace('${solutionName}${solutionUniqueToken}', '-', ''), '_', ''), '.', ''), '/', ''),
    ' ',
    ''
  ),
  '*',
  ''
)))

// Load the abbrevations file required to name the azure resources.
//var abbrs = loadJsonContent('./abbreviations.json')

//var resourceGroupLocation = resourceGroup().location
//var solutionLocation = resourceGroupLocation
// var baseUrl = 'https://raw.githubusercontent.com/microsoft/Build-your-own-copilot-Solution-Accelerator/main/'

var functionAppSqlPrompt = '''Generate a valid T-SQL query to find {query} for tables and columns provided below:
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
   When answering scheduling or time-based meeting questions, always use the StartTime column from ClientMeetings table. Use correct logic to return the most recent past meeting (last/previous) or the nearest future meeting (next/upcoming), and ensure only StartTime column is used for meeting timing comparisons.
   Only return the generated SQL query. Do not return anything else.'''

var functionAppCallTranscriptSystemPrompt = '''You are an assistant who supports wealth advisors in preparing for client meetings. 
  You have access to the client’s past meeting call transcripts. 
  When answering questions, especially summary requests, provide a detailed and structured response that includes key topics, concerns, decisions, and trends. 
  If no data is available, state 'No relevant data found for previous meetings.'''

var functionAppStreamTextSystemPrompt = '''The currently selected client's name is '{SelectedClientName}'. Treat any case-insensitive or partial mention as referring to this client.
  If the user mentions no name, assume they are asking about '{SelectedClientName}'.
  If the user references a name that clearly differs from '{SelectedClientName}' or comparing with other clients, respond only with: 'Please only ask questions about the selected client or select another client.' Otherwise, provide thorough answers for every question using only data from SQL or call transcripts.'
  If no data is found, respond with 'No data found for that client.' Remove any client identifiers from the final response.
  Always send clientId as '{client_id}'.'''

@description('Optional. The tags to apply to all deployed Azure resources.')
param tags resourceInput<'Microsoft.Resources/resourceGroups@2025-04-01'>.tags = {}

// ========== Resource Group Tag ========== //
resource resourceGroupTags 'Microsoft.Resources/tags@2021-04-01' = {
  name: 'default'
  properties: {
    tags: {
      ...tags
      TemplateName: 'Client Advisor'
    }
  }
}

// ========== Managed Identity ========== //
module managedIdentityModule 'deploy_managed_identity.bicep' = {
  name: 'deploy_managed_identity'
  params: {
    solutionName: solutionSuffix
    solutionLocation: solutionLocation
    miName: 'id-${solutionSuffix}'
    tags: tags
  }
  scope: resourceGroup(resourceGroup().name)
}

// ========== Key Vault ========== //
module keyvaultModule 'deploy_keyvault.bicep' = {
  name: 'deploy_keyvault'
  params: {
    solutionName: solutionSuffix
    solutionLocation: solutionLocation
    managedIdentityObjectId: managedIdentityModule.outputs.managedIdentityOutput.objectId
    kvName: 'kv-${solutionSuffix}'
    tags: tags
  }
  scope: resourceGroup(resourceGroup().name)
}

// ==========AI Foundry and related resources ========== //
module aifoundry 'deploy_ai_foundry.bicep' = {
  name: 'deploy_ai_foundry'
  params: {
    solutionName: solutionSuffix
    solutionLocation: aiDeploymentsLocation
    keyVaultName: keyvaultModule.outputs.keyvaultName
    deploymentType: deploymentType
    gptModelName: gptModelName
    azureOpenaiAPIVersion: azureOpenaiAPIVersion
    gptDeploymentCapacity: gptDeploymentCapacity
    embeddingModel: embeddingModel
    embeddingDeploymentCapacity: embeddingDeploymentCapacity
    existingLogAnalyticsWorkspaceId: existingLogAnalyticsWorkspaceId
    azureExistingAIProjectResourceId: azureExistingAIProjectResourceId
    tags: tags
  }
  scope: resourceGroup(resourceGroup().name)
}

// ========== CosmosDB ========== //
module cosmosDBModule 'deploy_cosmos_db.bicep' = {
  name: 'deploy_cosmos_db'
  params: {
    solutionLocation: cosmosLocation
    cosmosDBName: 'cosmos-${solutionSuffix}'
    tags: tags
  }
  scope: resourceGroup(resourceGroup().name)
}

// ========== Storage Account Module ========== //
module storageAccountModule 'deploy_storage_account.bicep' = {
  name: 'deploy_storage_account'
  params: {
    solutionLocation: solutionLocation
    managedIdentityObjectId: managedIdentityModule.outputs.managedIdentityOutput.objectId
    saName: 'st${solutionSuffix}'
    keyVaultName: keyvaultModule.outputs.keyvaultName
    tags: tags
  }
  scope: resourceGroup(resourceGroup().name)
}

//========== SQL DB Module ========== //
module sqlDBModule 'deploy_sql_db.bicep' = {
  name: 'deploy_sql_db'
  params: {
    solutionLocation: solutionLocation
    keyVaultName: keyvaultModule.outputs.keyvaultName
    managedIdentityObjectId: managedIdentityModule.outputs.managedIdentityOutput.objectId
    managedIdentityName: managedIdentityModule.outputs.managedIdentityOutput.name
    serverName: 'sql-${solutionSuffix}'
    sqlDBName: 'sqldb-${solutionSuffix}'
    tags: tags
  }
  scope: resourceGroup(resourceGroup().name)
}

//========== Updates to Key Vault ========== //
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = {
  name: aifoundry.outputs.keyvaultName
  scope: resourceGroup(resourceGroup().name)
}

// ========== App Service Module ========== //
module appserviceModule 'deploy_app_service.bicep' = {
  name: 'deploy_app_service'
  params: {
    solutionLocation: solutionLocation
    hostingPlanName: 'asp-${solutionSuffix}'
    websiteName: 'app-${solutionSuffix}'
    azureSearchService: aifoundry.outputs.aiSearchService
    azureSearchIndex: 'transcripts_index'
    azureSearchUseSemanticSearch: 'True'
    azureSearchSemanticSearchConfig: 'my-semantic-config'
    azureSearchTopK: '5'
    azureSearchContentColumns: 'content'
    azureSearchFilenameColumn: 'chunk_id'
    azureSearchTitleColumn: 'client_id'
    azureSearchUrlColumn: 'sourceurl'
    azureOpenAIResource: aifoundry.outputs.aiFoundryName
    azureOpenAIEndpoint: aifoundry.outputs.aoaiEndpoint
    azureOpenAIModel: gptModelName
    azureOpenAITemperature: '0'
    azureOpenAITopP: '1'
    azureOpenAIMaxTokens: '1000'
    azureOpenAIStopSequence: ''
    azureOpenAISystemMessage: '''You are a helpful Wealth Advisor assistant'''
    azureOpenAIApiVersion: azureOpenaiAPIVersion
    azureOpenAIStream: 'True'
    azureSearchQueryType: 'simple'
    azureSearchVectorFields: 'contentVector'
    azureSearchPermittedGroupsField: ''
    azureSearchStrictness: '3'
    azureOpenAIEmbeddingName: embeddingModel
    azureOpenAIEmbeddingEndpoint: aifoundry.outputs.aoaiEndpoint
    USE_INTERNAL_STREAM: 'True'
    SQLDB_SERVER: '${sqlDBModule.outputs.sqlServerName}.database.windows.net'
    SQLDB_DATABASE: sqlDBModule.outputs.sqlDbName
    AZURE_COSMOSDB_ACCOUNT: cosmosDBModule.outputs.cosmosAccountName
    AZURE_COSMOSDB_CONVERSATIONS_CONTAINER: cosmosDBModule.outputs.cosmosContainerName
    AZURE_COSMOSDB_DATABASE: cosmosDBModule.outputs.cosmosDatabaseName
    AZURE_COSMOSDB_ENABLE_FEEDBACK: 'True'
    //VITE_POWERBI_EMBED_URL: 'TBD'
    imageTag: imageTag
    userassignedIdentityClientId: managedIdentityModule.outputs.managedIdentityWebAppOutput.clientId
    userassignedIdentityId: managedIdentityModule.outputs.managedIdentityWebAppOutput.id
    applicationInsightsId: aifoundry.outputs.applicationInsightsId
    azureSearchServiceEndpoint: aifoundry.outputs.aiSearchTarget
    sqlSystemPrompt: functionAppSqlPrompt
    callTranscriptSystemPrompt: functionAppCallTranscriptSystemPrompt
    streamTextSystemPrompt: functionAppStreamTextSystemPrompt
    //aiFoundryProjectName:aifoundry.outputs.aiFoundryProjectName
    aiFoundryProjectEndpoint: aifoundry.outputs.aiFoundryProjectEndpoint
    aiFoundryName: aifoundry.outputs.aiFoundryName
    applicationInsightsConnectionString: aifoundry.outputs.applicationInsightsConnectionString
    azureExistingAIProjectResourceId: azureExistingAIProjectResourceId
    aiSearchProjectConnectionName: aifoundry.outputs.aiSearchFoundryConnectionName
     tags: tags
  }
  scope: resourceGroup(resourceGroup().name)
}

@description('URL of the deployed web application.')
output WEB_APP_URL string = appserviceModule.outputs.webAppUrl

@description('Name of the storage account.')
output STORAGE_ACCOUNT_NAME string = storageAccountModule.outputs.storageName

@description('Name of the storage container.')
output STORAGE_CONTAINER_NAME string = storageAccountModule.outputs.storageContainer

@description('Name of the Key Vault.')
output KEY_VAULT_NAME string = keyvaultModule.outputs.keyvaultName

@description('Name of the Cosmos DB account.')
output COSMOSDB_ACCOUNT_NAME string = cosmosDBModule.outputs.cosmosAccountName

@description('Name of the resource group.')
output RESOURCE_GROUP_NAME string = resourceGroup().name

@description('Name of the resource group used by AI Foundry.')
output RESOURCE_GROUP_NAME_FOUNDRY string = aifoundry.outputs.resourceGroupNameFoundry

@description('Name of the SQL Database server.')
output SQLDB_SERVER string = sqlDBModule.outputs.sqlServerName

@description('Name of the SQL Database.')
output SQLDB_DATABASE string = sqlDBModule.outputs.sqlDbName

@description('Name of the managed identity used by the web app.')
output MANAGEDIDENTITY_WEBAPP_NAME string = managedIdentityModule.outputs.managedIdentityWebAppOutput.name

@description('Client ID of the managed identity used by the web app.')
output MANAGEDIDENTITY_WEBAPP_CLIENTID string = managedIdentityModule.outputs.managedIdentityWebAppOutput.clientId

@description('Name of the AI Foundry resource.')
output AI_FOUNDRY_NAME string = aifoundry.outputs.aiFoundryName

@description('Name of the AI Search service.')
output AI_SEARCH_SERVICE_NAME string = aifoundry.outputs.aiSearchService

@description('Name of the deployed web application.')
output WEB_APP_NAME string = appserviceModule.outputs.webAppName

