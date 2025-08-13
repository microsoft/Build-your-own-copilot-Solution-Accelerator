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
@description('Optional. Name of the Text Embedding model to deploy:')
@allowed([
  'text-embedding-ada-002'
])
param embeddingModel string = 'text-embedding-ada-002'

@minValue(10)
@description('Optional. Capacity of the Embedding Model deployment')
param embeddingDeploymentCapacity int = 80

// @description('Fabric Workspace Id if you have one, else leave it empty. ')
// param fabricWorkspaceId string
@description('The Docker image tag to use for the application deployment.')
param imageTag string = 'latest'

//restricting to these regions because assistants api for gpt-4o-mini is available only in these regions
@allowed([
  'australiaeast'
  'eastus'
  'eastus2'
  'francecentral'
  'japaneast'
  'swedencentral'
  'uksouth'
  'westus'
  'westus3'
])
// @description('Azure OpenAI Location')
// param AzureOpenAILocation string = 'eastus2'
@metadata({
  azd: {
    type: 'location'
    usageName: [
      'OpenAI.GlobalStandard.gpt-4o-mini,200'
      'OpenAI.GlobalStandard.text-embedding-ada-002,80'
    ]
  }
})
@description('Rquired. Location for AI Foundry deployment. This is the location where the AI Foundry resources will be deployed.')
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

var hostingPlanName = 'asp-${solutionSuffix}'
var websiteName = 'app-${solutionSuffix}'
var appEnvironment = 'Prod'
var azureSearchIndex = 'transcripts_index'
var azureSearchUseSemanticSearch = 'True'
var azureSearchSemanticSearchConfig = 'my-semantic-config'
var azureSearchTopK = '5'
var azureSearchContentColumns = 'content'
var azureSearchFilenameColumn = 'chunk_id'
var azureSearchTitleColumn = 'client_id'
var azureSearchUrlColumn = 'sourceurl'
var azureOpenAITemperature = '0'
var azureOpenAITopP = '1'
var azureOpenAIMaxTokens = '1000'
var azureOpenAIStopSequence = '\n'
var azureOpenAISystemMessage = '''You are a helpful Wealth Advisor assistant'''
var azureOpenAIStream = 'True'
var azureSearchQueryType = 'simple'
var azureSearchVectorFields = 'contentVector'
var azureSearchPermittedGroupsField = ''
var azureSearchStrictness = '3'
var azureSearchEnableInDomain = 'False' // Set to 'True' if you want to enable in-domain search
var azureCosmosDbEnableFeedback = 'True'
var useInternalStream = 'True'
var useAIProjectClientFlag = 'False'
var sqlServerFqdn = '${sqlDBModule.outputs.sqlServerName}.database.windows.net'

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

var aiFoundryAiServicesAiProjectResourceName = 'proj-${solutionSuffix}'

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
    aiFoundryAiServicesAiProjectResourceName : aiFoundryAiServicesAiProjectResourceName
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
    hostingPlanName: hostingPlanName
    websiteName: websiteName
    appEnvironment: appEnvironment
    azureSearchService: aifoundry.outputs.aiSearchService
    azureSearchIndex: azureSearchIndex
    azureSearchUseSemanticSearch: azureSearchUseSemanticSearch
    azureSearchSemanticSearchConfig: azureSearchSemanticSearchConfig
    azureSearchTopK: azureSearchTopK
    azureSearchContentColumns: azureSearchContentColumns
    azureSearchFilenameColumn: azureSearchFilenameColumn
    azureSearchTitleColumn: azureSearchTitleColumn
    azureSearchUrlColumn: azureSearchUrlColumn
    azureOpenAIResource: aifoundry.outputs.aiFoundryName
    azureOpenAIEndpoint: aifoundry.outputs.aoaiEndpoint
    azureOpenAIModel: gptModelName
    azureOpenAITemperature: azureOpenAITemperature
    azureOpenAITopP: azureOpenAITopP
    azureOpenAIMaxTokens: azureOpenAIMaxTokens
    azureOpenAIStopSequence: azureOpenAIStopSequence
    azureOpenAISystemMessage: azureOpenAISystemMessage
    azureOpenAIApiVersion: azureOpenaiAPIVersion
    azureOpenAIStream: azureOpenAIStream
    azureSearchQueryType: azureSearchQueryType
    azureSearchVectorFields: azureSearchVectorFields
    azureSearchPermittedGroupsField: azureSearchPermittedGroupsField
    azureSearchStrictness: azureSearchStrictness
    azureOpenAIEmbeddingName: embeddingModel
    azureOpenAIEmbeddingEndpoint: aifoundry.outputs.aoaiEndpoint
    USE_INTERNAL_STREAM: useInternalStream
    SQLDB_SERVER: sqlServerFqdn
    SQLDB_DATABASE: sqlDBModule.outputs.sqlDbName
    AZURE_COSMOSDB_ACCOUNT: cosmosDBModule.outputs.cosmosAccountName
    AZURE_COSMOSDB_CONVERSATIONS_CONTAINER: cosmosDBModule.outputs.cosmosContainerName
    AZURE_COSMOSDB_DATABASE: cosmosDBModule.outputs.cosmosDatabaseName
    AZURE_COSMOSDB_ENABLE_FEEDBACK: azureCosmosDbEnableFeedback
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

@description('The resource ID of the AI Foundry instance.')
output AI_FOUNDRY_RESOURCE_ID string = aifoundry.outputs.aiFoundryId

@description('Name of the SQL Database server.')
output SQLDB_SERVER_NAME string = sqlDBModule.outputs.sqlServerName

@description('Name of the SQL Database.')
output SQLDB_DATABASE string = sqlDBModule.outputs.sqlDbName

@description('Name of the managed identity used by the web app.')
output MANAGEDIDENTITY_WEBAPP_NAME string = managedIdentityModule.outputs.managedIdentityWebAppOutput.name

@description('Client ID of the managed identity used by the web app.')
output MANAGEDIDENTITY_WEBAPP_CLIENTID string = managedIdentityModule.outputs.managedIdentityWebAppOutput.clientId
@description('Name of the AI Search service.')
output AI_SEARCH_SERVICE_NAME string = aifoundry.outputs.aiSearchService

@description('Name of the deployed web application.')
output WEB_APP_NAME string = appserviceModule.outputs.webAppName
@description('Specifies the current application environment.')
output APP_ENV string = appEnvironment

@description('The Application Insights instrumentation key.')
output APPINSIGHTS_INSTRUMENTATIONKEY string = aifoundry.outputs.instrumentationKey

@description('The Application Insights connection string.')
output APPLICATIONINSIGHTS_CONNECTION_STRING string = aifoundry.outputs.applicationInsightsConnectionString

@description('The API version used for the Azure AI Agent service.')
output AZURE_AI_AGENT_API_VERSION string = azureOpenaiAPIVersion

@description('The endpoint URL of the Azure AI Agent project.')
output AZURE_AI_AGENT_ENDPOINT string = aifoundry.outputs.aiFoundryProjectEndpoint

@description('The deployment name of the GPT model for the Azure AI Agent.')
output AZURE_AI_AGENT_MODEL_DEPLOYMENT_NAME string = gptModelName

@description('The endpoint URL of the Azure AI Search service.')
output AZURE_AI_SEARCH_ENDPOINT string = aifoundry.outputs.aiSearchTarget

@description('The system prompt used for call transcript processing in Azure Functions.')
output AZURE_CALL_TRANSCRIPT_SYSTEM_PROMPT string = functionAppCallTranscriptSystemPrompt

@description('The name of the Azure Cosmos DB account.')
output AZURE_COSMOSDB_ACCOUNT string = cosmosDBModule.outputs.cosmosAccountName

@description('The name of the Azure Cosmos DB container for storing conversations.')
output AZURE_COSMOSDB_CONVERSATIONS_CONTAINER string = cosmosDBModule.outputs.cosmosContainerName

@description('The name of the Azure Cosmos DB database.')
output AZURE_COSMOSDB_DATABASE string = cosmosDBModule.outputs.cosmosDatabaseName

@description('Indicates whether feedback is enabled in Azure Cosmos DB.')
output AZURE_COSMOSDB_ENABLE_FEEDBACK string = azureCosmosDbEnableFeedback

@description('The endpoint URL for the Azure OpenAI Embedding model.')
output AZURE_OPENAI_EMBEDDING_ENDPOINT string = aifoundry.outputs.aoaiEndpoint

@description('The name of the Azure OpenAI Embedding model.')
output AZURE_OPENAI_EMBEDDING_NAME string = embeddingModel

@description('The endpoint URL for the Azure OpenAI service.')
output AZURE_OPENAI_ENDPOINT string = aifoundry.outputs.aoaiEndpoint

@description('The maximum number of tokens for Azure OpenAI responses.')
output AZURE_OPENAI_MAX_TOKENS string = azureOpenAIMaxTokens

@description('The name of the Azure OpenAI GPT model.')
output AZURE_OPENAI_MODEL string = gptModelName

@description('The preview API version for Azure OpenAI.')
output AZURE_OPENAI_PREVIEW_API_VERSION string = azureOpenaiAPIVersion

@description('The Azure OpenAI resource name.')
output AZURE_OPENAI_RESOURCE string = aifoundry.outputs.aiFoundryName

@description('The stop sequence(s) for Azure OpenAI responses.')
output AZURE_OPENAI_STOP_SEQUENCE string = azureOpenAIStopSequence

@description('Indicates whether streaming is enabled for Azure OpenAI responses.')
output AZURE_OPENAI_STREAM string = azureOpenAIStream

@description('The system prompt for streaming text responses in Azure Functions.')
output AZURE_OPENAI_STREAM_TEXT_SYSTEM_PROMPT string = functionAppStreamTextSystemPrompt

@description('The system message for Azure OpenAI requests.')
output AZURE_OPENAI_SYSTEM_MESSAGE string = azureOpenAISystemMessage

@description('The temperature setting for Azure OpenAI responses.')
output AZURE_OPENAI_TEMPERATURE string = azureOpenAITemperature

@description('The Top-P setting for Azure OpenAI responses.')
output AZURE_OPENAI_TOP_P string = azureOpenAITopP

@description('The name of the Azure AI Search connection.')
output AZURE_SEARCH_CONNECTION_NAME string = aifoundry.outputs.aiSearchFoundryConnectionName

@description('The columns in Azure AI Search that contain content.')
output AZURE_SEARCH_CONTENT_COLUMNS string = azureSearchContentColumns

@description('Indicates whether in-domain filtering is enabled for Azure AI Search.')
output AZURE_SEARCH_ENABLE_IN_DOMAIN string = azureSearchEnableInDomain

@description('The filename column used in Azure AI Search.')
output AZURE_SEARCH_FILENAME_COLUMN string = azureSearchFilenameColumn

@description('The name of the Azure AI Search index.')
output AZURE_SEARCH_INDEX string = azureSearchIndex

@description('The permitted groups field used in Azure AI Search.')
output AZURE_SEARCH_PERMITTED_GROUPS_COLUMN string = azureSearchPermittedGroupsField

@description('The query type for Azure AI Search.')
output AZURE_SEARCH_QUERY_TYPE string = azureSearchQueryType

@description('The semantic search configuration name in Azure AI Search.')
output AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG string = azureSearchSemanticSearchConfig

@description('The name of the Azure AI Search service.')
output AZURE_SEARCH_SERVICE string = aifoundry.outputs.aiSearchService

@description('The strictness setting for Azure AI Search semantic ranking.')
output AZURE_SEARCH_STRICTNESS string = azureSearchStrictness

@description('The title column used in Azure AI Search.')
output AZURE_SEARCH_TITLE_COLUMN string = azureSearchTitleColumn

@description('The number of top results (K) to return from Azure AI Search.')
output AZURE_SEARCH_TOP_K string = azureSearchTopK

@description('The URL column used in Azure AI Search.')
output AZURE_SEARCH_URL_COLUMN string = azureSearchUrlColumn

@description('Indicates whether semantic search is used in Azure AI Search.')
output AZURE_SEARCH_USE_SEMANTIC_SEARCH string = azureSearchUseSemanticSearch

@description('The vector fields used in Azure AI Search.')
output AZURE_SEARCH_VECTOR_COLUMNS string = azureSearchVectorFields

@description('The system prompt for SQL queries in Azure Functions.')
output AZURE_SQL_SYSTEM_PROMPT string = functionAppSqlPrompt

@description('The fully qualified domain name (FQDN) of the Azure SQL Server.')
output SQLDB_SERVER string = sqlServerFqdn

@description('The client ID of the managed identity for the web application.')
output SQLDB_USER_MID string = managedIdentityModule.outputs.managedIdentityWebAppOutput.clientId

@description('Indicates whether the AI Project Client should be used.')
output USE_AI_PROJECT_CLIENT string = useAIProjectClientFlag

@description('Indicates whether the internal stream should be used.')
output USE_INTERNAL_STREAM string = useInternalStream

