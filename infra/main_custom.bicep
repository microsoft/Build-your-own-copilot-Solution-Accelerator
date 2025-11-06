// ========== main_custom.bicep ========== //
// Developer-friendly version with customer ACR and user permissions for local debugging
targetScope = 'resourceGroup'

@minLength(3)
@maxLength(20)
@description('Required. A unique prefix for all resources in this deployment. This should be 3-20 characters long:')
param solutionName string = 'clientadvisor'

@description('Optional. Existing Log Analytics Workspace Resource ID')
param existingLogAnalyticsWorkspaceId string = ''

@description('Optional. CosmosDB Location')
param cosmosLocation string = 'eastus2'

@minLength(1)
@description('Optional. GPT model deployment type:')
@allowed([
  'Standard'
  'GlobalStandard'
])
param gptModelDeploymentType string = 'GlobalStandard'

@minLength(1)
@description('Optional. Name of the GPT model to deploy:')
@allowed([
  'gpt-4o-mini'
])
param gptModelName string = 'gpt-4o-mini'

@description('Optional. Version of the GPT model to deploy.')
param gptModelVersion string = '2024-07-18'

@description('Optional. Version of the GPT model to deploy.')
param embeddingModelVersion string = '2'

@description('Optional. API version for the Azure OpenAI service.')
param azureOpenaiAPIVersion string = '2025-04-01-preview'

@minValue(10)
@description('Optional. Capacity of the GPT deployment:')
param gptModelCapacity int = 200

@minLength(1)
@description('Optional. Name of the Text Embedding model to deploy:')
@allowed([
  'text-embedding-ada-002'
])
param embeddingModel string = 'text-embedding-ada-002'

@minValue(10)
@description('Optional. Capacity of the Embedding Model deployment')
param embeddingDeploymentCapacity int = 80

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
@metadata({
  azd: {
    type: 'location'
    usageName: [
      'OpenAI.GlobalStandard.gpt-4o-mini,200'
      'OpenAI.GlobalStandard.text-embedding-ada-002,80'
    ]
  }
})
@description('Required. Location for AI Foundry deployment. This is the location where the AI Foundry resources will be deployed.')
param azureAiServiceLocation string

@allowed([
  'australiaeast'
  'centralus'
  'eastasia'
  'eastus2'
  'japaneast'
  'northeurope'
  'southeastasia'
  'uksouth'
])
@metadata({ azd: { type: 'location' } })
@description('Required. Azure region for all services. Regions are restricted to guarantee compatibility with paired regions and replica locations for data redundancy and failover scenarios.')
param location string
var solutionLocation = empty(location) ? resourceGroup().location : location

@maxLength(5)
@description('Optional. A unique token for the solution. This is used to ensure resource names are unique for global resources.')
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

@description('Optional. Enable private networking for applicable resources, aligned with the Well Architected Framework recommendations. Defaults to false.')
param enablePrivateNetworking bool = false

@description('Optional. Enable monitoring applicable resources, aligned with the Well Architected Framework recommendations.')
param enableMonitoring bool = false

@description('Optional. Enable scalability for applicable resources, aligned with the Well Architected Framework recommendations.')
param enableScalability bool = false

@description('Optional. Enable/Disable usage telemetry for module.')
param enableTelemetry bool = true

@description('Optional. Enable redundancy for applicable resources, aligned with the Well Architected Framework recommendations.')
param enableRedundancy bool = false

// ========== DEVELOPER EXPERIENCE: Customer ACR Configuration ========== //
var acrName = 'acr${solutionSuffix}'
var containerRegistryHostnameActual = empty(containerRegistryHostname) ? '${acrName}.azurecr.io' : containerRegistryHostname
@description('Customer Container Registry hostname where the docker images are located.')
param containerRegistryHostname string = ''

@description('Optional. The Container Image Name to deploy on the webapp.')
param containerImageName string = 'byc-wa-app'

@description('Optional. The Container Image Tag to deploy on the webapp.')
param imageTag string = 'latest'

@description('Optional. Resource ID of an existing Foundry project')
param existingFoundryProjectResourceId string = ''

@description('Optional. Enable purge protection for the Key Vault')
param enablePurgeProtection bool = false

// Application configuration variables
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
var azureSearchEnableInDomain = 'False'
var azureCosmosDbEnableFeedback = 'True'
var useInternalStream = 'True'
var useAIProjectClientFlag = 'False'
var sqlServerFqdn = 'sql-${solutionSuffix}${environment().suffixes.sqlServerHostname}'

@description('Optional. Size of the Jumpbox Virtual Machine when created.')
param vmSize string?

@description('Optional. Admin username for the Jumpbox Virtual Machine.')
@secure()
param vmAdminUsername string?

@description('Optional. Admin password for the Jumpbox Virtual Machine.')
@secure()
param vmAdminPassword string?

// System prompts
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
   When answering scheduling or time-based meeting questions, always use the StartTime column from ClientMeetings table.
   Only return the generated SQL query. Do not return anything else.'''

var functionAppCallTranscriptSystemPrompt = '''You are an assistant who supports wealth advisors in preparing for client meetings. 
  You have access to the client's past meeting call transcripts. 
  When answering questions, especially summary requests, provide a detailed and structured response that includes key topics, concerns, decisions, and trends. 
  If no data is available, state 'No relevant data found for previous meetings.'''

var functionAppStreamTextSystemPrompt = '''The currently selected client's name is '{SelectedClientName}'. Treat any case-insensitive or partial mention as referring to this client.
  If the user mentions no name, assume they are asking about '{SelectedClientName}'.
  If the user references a name that clearly differs from '{SelectedClientName}' or comparing with other clients, respond only with: 'Please only ask questions about the selected client or select another client.' Otherwise, provide thorough answers for every question using only data from SQL or call transcripts.'
  If no data is found, respond with 'No data found for that client.' Remove any client identifiers from the final response.
  Always send clientId as '{client_id}'.'''

// Region configuration
var replicaRegionPairs = {
  australiaeast: 'australiasoutheast'
  centralus: 'westus'
  eastasia: 'japaneast'
  eastus: 'centralus'
  eastus2: 'centralus'
  japaneast: 'eastasia'
  northeurope: 'westeurope'
  southeastasia: 'eastasia'
  uksouth: 'westeurope'
  westeurope: 'northeurope'
}
var replicaLocation = replicaRegionPairs[resourceGroup().location]

@description('Optional. The tags to apply to all deployed Azure resources.')
param tags resourceInput<'Microsoft.Resources/resourceGroups@2025-04-01'>.tags = {}

var cosmosDbZoneRedundantHaRegionPairs = {
  australiaeast: 'uksouth'
  centralus: 'eastus2'
  eastasia: 'southeastasia'
  eastus: 'centralus'
  eastus2: 'centralus'
  japaneast: 'australiaeast'
  northeurope: 'westeurope'
  southeastasia: 'eastasia'
  uksouth: 'westeurope'
  westeurope: 'northeurope'
}

var allTags = union(
  {
    'azd-env-name': solutionName
  },
  tags
)

var cosmosDbHaLocation = cosmosDbZoneRedundantHaRegionPairs[resourceGroup().location]
var useExistingLogAnalytics = !empty(existingLogAnalyticsWorkspaceId)
var logAnalyticsWorkspaceResourceId = useExistingLogAnalytics ? existingLogAnalyticsWorkspaceId : logAnalyticsWorkspace!.outputs.resourceId

@description('Tag, Created by user name')
param createdBy string = contains(deployer(), 'userPrincipalName')? split(deployer().userPrincipalName, '@')[0]: deployer().objectId

// ========== Resource Group Tag ========== //
resource resourceGroupTags 'Microsoft.Resources/tags@2021-04-01' = {
  name: 'default'
  properties: {
    tags: {
      ...resourceGroup().tags
      ...tags
      TemplateName: 'Client Advisor - Developer Experience'
      Type: enablePrivateNetworking ? 'WAF' : 'Non-WAF'
      CreatedBy: createdBy
      DeploymentName: deployment().name
    }
  }
}

// ========== Log Analytics Workspace ========== //
var logAnalyticsWorkspaceResourceName = 'log-${solutionSuffix}'
module logAnalyticsWorkspace 'br/public:avm/res/operational-insights/workspace:0.12.0' = if (enableMonitoring && !useExistingLogAnalytics) {
  name: take('avm.res.operational-insights.workspace.${logAnalyticsWorkspaceResourceName}', 64)
  params: {
    name: logAnalyticsWorkspaceResourceName
    tags: tags
    location: solutionLocation
    enableTelemetry: enableTelemetry
    skuName: 'PerGB2018'
    dataRetention: 365
    features: { enableLogAccessUsingOnlyResourcePermissions: true }
    diagnosticSettings: [{ useThisWorkspace: true }]
    dailyQuotaGb: enableRedundancy ? 10 : null
    replication: enableRedundancy
      ? {
          enabled: true
          location: replicaLocation
        }
      : null
    publicNetworkAccessForIngestion: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    publicNetworkAccessForQuery: enablePrivateNetworking ? 'Disabled' : 'Enabled'
  }
}

// ========== Application Insights ========== //
var applicationInsightsResourceName = 'appi-${solutionSuffix}'
module applicationInsights 'br/public:avm/res/insights/component:0.6.0' = if (enableMonitoring) {
  name: take('avm.res.insights.component.${applicationInsightsResourceName}', 64)
  params: {
    name: applicationInsightsResourceName
    tags: tags
    location: solutionLocation
    enableTelemetry: enableTelemetry
    retentionInDays: 365
    kind: 'web'
    disableIpMasking: false
    flowType: 'Bluefield'
    workspaceResourceId: enableMonitoring ? logAnalyticsWorkspaceResourceId : ''
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspaceResourceId }] : null
  }
}

// ========== User Assigned Identity ========== //
var userAssignedIdentityResourceName = 'id-${solutionSuffix}'
module userAssignedIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.4.1' = {
  name: take('avm.res.managed-identity.user-assigned-identity.${userAssignedIdentityResourceName}', 64)
  params: {
    name: userAssignedIdentityResourceName
    location: solutionLocation
    tags: tags
    enableTelemetry: enableTelemetry
  }
}

// ========== SQL Operations User Assigned Identity ========== //
var sqlUserAssignedIdentityResourceName = 'id-sql-${solutionSuffix}'
module sqlUserAssignedIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.4.1' = {
  name: take('avm.res.managed-identity.user-assigned-identity.${sqlUserAssignedIdentityResourceName}', 64)
  params: {
    name: sqlUserAssignedIdentityResourceName
    location: solutionLocation
    tags: tags
    enableTelemetry: enableTelemetry
  }
}

// ========== DEVELOPER EXPERIENCE: Azure Container Registry ========== //
module containerRegistry 'br/public:avm/res/container-registry/registry:0.5.0' = {
  name: take('avm.res.container-registry.registry.${acrName}', 64)
  params: {
    name: acrName
    location: solutionLocation
    tags: tags
    enableTelemetry: enableTelemetry
    acrSku: 'Basic'
    acrAdminUserEnabled: false
    publicNetworkAccess: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    roleAssignments: [
      {
        principalId: userAssignedIdentity.outputs.principalId
        roleDefinitionIdOrName: 'AcrPush'
        principalType: 'ServicePrincipal'
      }
      {
        principalId: userAssignedIdentity.outputs.principalId
        roleDefinitionIdOrName: 'AcrPull'
        principalType: 'ServicePrincipal'
      }
      {
        principalId: deployer().objectId
        roleDefinitionIdOrName: 'AcrPush'
        principalType: 'User'
      }
      {
        principalId: deployer().objectId
        roleDefinitionIdOrName: 'AcrPull'
        principalType: 'User'
      }
    ]
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspaceResourceId }] : null
  }
}

// ========== Virtual Network and Networking Components ========== //
module virtualNetwork 'modules/virtualNetwork.bicep' = if (enablePrivateNetworking) {
  name: take('module.virtualNetwork.${solutionSuffix}', 64)
  params: {
    name: 'vnet-${solutionSuffix}'
    addressPrefixes: ['10.0.0.0/20']
    location: solutionLocation
    tags: allTags
    logAnalyticsWorkspaceId: logAnalyticsWorkspaceResourceId
    resourceSuffix: solutionSuffix
    enableTelemetry: enableTelemetry
  }
}

// ========== Private DNS Zones ========== //
var privateDnsZones = [
  'privatelink.cognitiveservices.azure.com'
  'privatelink.openai.azure.com'
  'privatelink.services.ai.azure.com'
  'privatelink.azurewebsites.net'
  'privatelink.blob.${environment().suffixes.storage}'
  'privatelink.queue.${environment().suffixes.storage}'
  'privatelink.file.${environment().suffixes.storage}'
  'privatelink.documents.azure.com'
  'privatelink.vaultcore.azure.net'
  'privatelink${environment().suffixes.sqlServerHostname}'
  'privatelink.search.windows.net'
  'privatelink.azurecr.io'
]

var dnsZoneIndex = {
  cognitiveServices: 0
  openAI: 1
  aiServices: 2
  appService: 3
  storageBlob: 4
  storageQueue: 5
  storageFile: 6
  cosmosDB: 7
  keyVault: 8
  sqlServer: 9
  searchService: 10
  containerRegistry: 11
}

var aiRelatedDnsZoneIndices = [
  dnsZoneIndex.cognitiveServices
  dnsZoneIndex.openAI
  dnsZoneIndex.aiServices
]

@batchSize(5)
module avmPrivateDnsZones 'br/public:avm/res/network/private-dns-zone:0.7.1' = [
  for (zone, i) in privateDnsZones: if (enablePrivateNetworking && (empty(existingFoundryProjectResourceId) || !contains(aiRelatedDnsZoneIndices, i))) {
    name: 'avm.res.network.private-dns-zone.${split(zone, '.')[1]}'
    params: {
      name: zone
      tags: tags
      enableTelemetry: enableTelemetry
      virtualNetworkLinks: [
        {
          name: take('vnetlink-${virtualNetwork!.outputs.name}-${split(zone, '.')[1]}', 80)
          virtualNetworkResourceId: virtualNetwork!.outputs.resourceId
        }
      ]
    }
  }
]

// ========== Key Vault Module ========== //
var keyVaultName = 'kv-${solutionSuffix}'
module keyvault 'br/public:avm/res/key-vault/vault:0.12.1' = {
  name: take('avm.res.key-vault.vault.${keyVaultName}', 64)
  params: {
    name: keyVaultName
    location: solutionLocation
    tags: tags
    sku: 'standard'
    publicNetworkAccess: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
    enableVaultForDeployment: true
    enableVaultForDiskEncryption: true
    enableVaultForTemplateDeployment: true
    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: enablePurgeProtection
    softDeleteRetentionInDays: 7
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspaceResourceId }] : []
    privateEndpoints: enablePrivateNetworking
      ? [
          {
            name: 'pep-${keyVaultName}'
            customNetworkInterfaceName: 'nic-${keyVaultName}'
            privateDnsZoneGroup: {
              privateDnsZoneGroupConfigs: [
                { privateDnsZoneResourceId: avmPrivateDnsZones[dnsZoneIndex.keyVault]!.outputs.resourceId }
              ]
            }
            service: 'vault'
            subnetResourceId: virtualNetwork!.outputs.pepsSubnetResourceId
          }
        ]
      : []
    roleAssignments: [
      {
        principalId: userAssignedIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
        roleDefinitionIdOrName: 'Key Vault Administrator'
      }
      {
        principalId: sqlUserAssignedIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
        roleDefinitionIdOrName: 'Key Vault Secrets User'
      }
      // DEVELOPER EXPERIENCE: Add deployer permissions
      {
        principalId: deployer().objectId
        principalType: 'User'
        roleDefinitionIdOrName: 'Key Vault Administrator'
      }
    ]
    secrets: [
      {
        name: 'SQLDB-SERVER'
        value: sqlServerFqdn
      }
      {
        name: 'SQLDB-DATABASE'
        value: sqlDbName
      }
      {
        name: 'AZURE-OPENAI-PREVIEW-API-VERSION'
        value: azureOpenaiAPIVersion
      }
    ]
    enableTelemetry: enableTelemetry
  }
}

// ========== AI Foundry: AI Services ========== //
var useExistingAiFoundryAiProject = !empty(existingFoundryProjectResourceId)

var aiFoundryAiServicesSubscriptionId = useExistingAiFoundryAiProject
  ? split(existingFoundryProjectResourceId, '/')[2]
  : subscription().id
var aiFoundryAiServicesResourceGroupName = useExistingAiFoundryAiProject
  ? split(existingFoundryProjectResourceId, '/')[4]
  : 'rg-${solutionSuffix}'
var aiFoundryAiServicesResourceName = useExistingAiFoundryAiProject
  ? split(existingFoundryProjectResourceId, '/')[8]
  : 'aif-${solutionSuffix}'
var aiFoundryAiProjectResourceName = useExistingAiFoundryAiProject
  ? split(existingFoundryProjectResourceId, '/')[10]
  : 'proj-${solutionSuffix}' 

var aiFoundryAiServicesAiProjectResourceName = 'proj-${solutionSuffix}'
var aiFoundryAIservicesEnabled = true
var aiFoundryAiServicesModelDeployment = {
  format: 'OpenAI'
  name: gptModelName
  version: gptModelVersion
  sku: {
    name: gptModelDeploymentType
    capacity: gptModelCapacity
  }
  raiPolicyName: 'Microsoft.Default'
}

var aiFoundryAiServicesEmbeddingModel = {
  name: embeddingModel
  version: embeddingModelVersion
  sku: {
    name: 'GlobalStandard'
    capacity: embeddingDeploymentCapacity
  }
  raiPolicyName: 'Microsoft.Default'
}

module aiFoundryAiServices 'modules/ai-services.bicep' = if (aiFoundryAIservicesEnabled) {
  name: take('avm.res.cognitive-services.account.${aiFoundryAiServicesResourceName}', 64)
  params: {
    name: aiFoundryAiServicesResourceName
    location: azureAiServiceLocation
    tags: tags
    existingFoundryProjectResourceId: existingFoundryProjectResourceId
    projectName: aiFoundryAiServicesAiProjectResourceName
    projectDescription: 'AI Foundry Project'
    sku: 'S0'
    kind: 'AIServices'
    disableLocalAuth: true
    customSubDomainName: aiFoundryAiServicesResourceName
    apiProperties: {}
    networkAcls: {
      defaultAction: 'Allow'
      virtualNetworkRules: []
      ipRules: []
    }
    managedIdentities: { userAssignedResourceIds: [userAssignedIdentity!.outputs.resourceId] }
    roleAssignments: [
      {
        roleDefinitionIdOrName: '53ca6127-db72-4b80-b1b0-d745d6d5456d' // Azure AI User
        principalId: userAssignedIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
      }
      {
        roleDefinitionIdOrName: '64702f94-c441-49e6-a78b-ef80e0188fee' // Azure AI Developer
        principalId: userAssignedIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
      }
      {
        roleDefinitionIdOrName: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd' // Cognitive Services OpenAI User
        principalId: userAssignedIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
      }
      // DEVELOPER EXPERIENCE: Add deployer permissions for local debugging
      {
        roleDefinitionIdOrName: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd' // Cognitive Services OpenAI User
        principalId: deployer().objectId
        principalType: 'User'
      }
      {
        roleDefinitionIdOrName: '64702f94-c441-49e6-a78b-ef80e0188fee' // Azure AI Developer
        principalId: deployer().objectId
        principalType: 'User'
      }
      {
        roleDefinitionIdOrName: '53ca6127-db72-4b80-b1b0-d745d6d5456d' // Azure AI User
        principalId: deployer().objectId
        principalType: 'User'
      }
    ]
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspaceResourceId }] : null
    publicNetworkAccess: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    privateEndpoints: (enablePrivateNetworking && empty(existingFoundryProjectResourceId))
      ? ([
          {
            name: 'pep-${aiFoundryAiServicesResourceName}'
            customNetworkInterfaceName: 'nic-${aiFoundryAiServicesResourceName}'
            subnetResourceId: virtualNetwork!.outputs.pepsSubnetResourceId
            privateDnsZoneGroup: {
              privateDnsZoneGroupConfigs: [
                {
                  name: 'ai-services-dns-zone-cognitiveservices'
                  privateDnsZoneResourceId: avmPrivateDnsZones[dnsZoneIndex.cognitiveServices]!.outputs.resourceId
                }
                {
                  name: 'ai-services-dns-zone-openai'
                  privateDnsZoneResourceId: avmPrivateDnsZones[dnsZoneIndex.openAI]!.outputs.resourceId
                }
                {
                  name: 'ai-services-dns-zone-aiservices'
                  privateDnsZoneResourceId: avmPrivateDnsZones[dnsZoneIndex.aiServices]!.outputs.resourceId
                }
              ]
            }
          }
        ])
      : []
    deployments: [
      {
        name: aiFoundryAiServicesModelDeployment.name
        model: {
          format: aiFoundryAiServicesModelDeployment.format
          name: aiFoundryAiServicesModelDeployment.name
          version: aiFoundryAiServicesModelDeployment.version
        }
        raiPolicyName: aiFoundryAiServicesModelDeployment.raiPolicyName
        sku: {
          name: aiFoundryAiServicesModelDeployment.sku.name
          capacity: aiFoundryAiServicesModelDeployment.sku.capacity
        }
      }
      {
        name: aiFoundryAiServicesEmbeddingModel.name
        model: {
          format: 'OpenAI'
          name: aiFoundryAiServicesEmbeddingModel.name
          version: aiFoundryAiServicesEmbeddingModel.version
        }
        raiPolicyName: aiFoundryAiServicesEmbeddingModel.raiPolicyName
        sku: {
          name: aiFoundryAiServicesEmbeddingModel.sku.name
          capacity: aiFoundryAiServicesEmbeddingModel.sku.capacity
        }
      }
    ]
  }
}

// ========== DEVELOPER EXPERIENCE: Cosmos DB with User Permissions ========== //
var cosmosDbResourceName = 'cosmos-${solutionSuffix}'
var cosmosDbDatabaseName = 'db_conversation_history'
var collectionName = 'conversations'
module cosmosDb 'br/public:avm/res/document-db/database-account:0.15.0' = {
  name: take('avm.res.document-db.database-account.${cosmosDbResourceName}', 64)
  params: {
    name: cosmosDbResourceName
    location: cosmosLocation
    tags: tags
    enableTelemetry: enableTelemetry
    sqlDatabases: [
      {
        name: cosmosDbDatabaseName
        containers: [
          {
            name: collectionName
            paths: [
              '/userId'
            ]
          }
        ]
      }
    ]
    dataPlaneRoleDefinitions: [
      {
        roleName: 'Cosmos DB SQL Data Contributor'
        dataActions: [
          'Microsoft.DocumentDB/databaseAccounts/readMetadata'
          'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/*'
          'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/*'
        ]
        assignments: [
          { principalId: userAssignedIdentity.outputs.principalId }
          // DEVELOPER EXPERIENCE: Add deployer permissions for local debugging
          { principalId: deployer().objectId }
        ]
      }
    ]
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspaceResourceId }] : null
    networkRestrictions: {
      networkAclBypass: 'None'
      publicNetworkAccess: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    }
    privateEndpoints: enablePrivateNetworking
      ? [
          {
            name: 'pep-${cosmosDbResourceName}'
            customNetworkInterfaceName: 'nic-${cosmosDbResourceName}'
            privateDnsZoneGroup: {
              privateDnsZoneGroupConfigs: [
                { privateDnsZoneResourceId: avmPrivateDnsZones[dnsZoneIndex.cosmosDB]!.outputs.resourceId }
              ]
            }
            service: 'Sql'
            subnetResourceId: virtualNetwork!.outputs.pepsSubnetResourceId
          }
        ]
      : []
    zoneRedundant: enableRedundancy ? true : false
    capabilitiesToAdd: enableRedundancy ? null : ['EnableServerless']
    automaticFailover: enableRedundancy ? true : false
    failoverLocations: enableRedundancy
      ? [
          {
            failoverPriority: 0
            isZoneRedundant: true
            locationName: solutionLocation
          }
          {
            failoverPriority: 1
            isZoneRedundant: true
            locationName: cosmosDbHaLocation
          }
        ]
      : [
          {
            locationName: solutionLocation
            failoverPriority: 0
            isZoneRedundant: enableRedundancy
          }
        ]
  }
  dependsOn: [keyvault, avmStorageAccount]
}

// ========== Storage account module ========== //
var storageAccountName = 'st${solutionSuffix}'
module avmStorageAccount 'br/public:avm/res/storage/storage-account:0.20.0' = {
  name: take('avm.res.storage.storage-account.${storageAccountName}', 64)
  params: {
    name: storageAccountName
    location: solutionLocation
    managedIdentities: { systemAssigned: true }
    minimumTlsVersion: 'TLS1_2'
    enableTelemetry: enableTelemetry
    tags: tags
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    roleAssignments: [
      {
        principalId: userAssignedIdentity.outputs.principalId
        roleDefinitionIdOrName: 'Storage Blob Data Contributor'
        principalType: 'ServicePrincipal'
      }
      // DEVELOPER EXPERIENCE: Add deployer permissions
      {
        principalId: deployer().objectId
        roleDefinitionIdOrName: 'Storage Blob Data Contributor'
        principalType: 'User'
      }
    ]
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: enablePrivateNetworking ? 'Deny' : 'Allow'
    }
    allowBlobPublicAccess: enablePrivateNetworking ? true : false
    publicNetworkAccess: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    privateEndpoints: enablePrivateNetworking
      ? [
          {
            name: 'pep-blob-${solutionSuffix}'
            privateDnsZoneGroup: {
              privateDnsZoneGroupConfigs: [
                {
                  name: 'storage-dns-zone-group-blob'
                  privateDnsZoneResourceId: avmPrivateDnsZones[dnsZoneIndex.storageBlob]!.outputs.resourceId
                }
              ]
            }
            subnetResourceId: virtualNetwork!.outputs.pepsSubnetResourceId
            service: 'blob'
          }
          {
            name: 'pep-queue-${solutionSuffix}'
            privateDnsZoneGroup: {
              privateDnsZoneGroupConfigs: [
                {
                  name: 'storage-dns-zone-group-queue'
                  privateDnsZoneResourceId: avmPrivateDnsZones[dnsZoneIndex.storageQueue]!.outputs.resourceId
                }
              ]
            }
            subnetResourceId: virtualNetwork!.outputs.pepsSubnetResourceId
            service: 'queue'
          }
        ]
      : []
    blobServices: {
      corsRules: []
      deleteRetentionPolicyEnabled: false
      containers: [
        {
          name: 'data'
          publicAccess: 'None'
          denyEncryptionScopeOverride: false
          defaultEncryptionScope: '$account-encryption-key'
        }
      ]
    }
  }
  dependsOn: [keyvault]
}

// ========== SQL module ========== //
var sqlDbName = 'sqldb-${solutionSuffix}'
module sqlDBModule 'br/public:avm/res/sql/server:0.20.1' = {
  name: take('avm.res.sql.server.${sqlDbName}', 64)
  params: {
    name: 'sql-${solutionSuffix}'
    administrators: {
      azureADOnlyAuthentication: true
      login: userAssignedIdentity.outputs.name
      principalType: 'Application'
      sid: userAssignedIdentity.outputs.principalId
      tenantId: subscription().tenantId
    }
    connectionPolicy: 'Redirect'
    databases: [
      {
        zoneRedundant: enableRedundancy
        availabilityZone: -1
        collation: 'SQL_Latin1_General_CP1_CI_AS'
        diagnosticSettings: enableMonitoring
          ? [{ workspaceResourceId: logAnalyticsWorkspaceResourceId }]
          : null
        licenseType: 'LicenseIncluded'
        maxSizeBytes: 34359738368
        name: 'sqldb-${solutionSuffix}'
        minCapacity: '1'
        sku: {
          name: 'GP_S_Gen5'
          tier: 'GeneralPurpose'
          family: 'Gen5'
          capacity: 2
        }
      }
    ]
    location: solutionLocation
    managedIdentities: {
      systemAssigned: true
      userAssignedResourceIds: [
        userAssignedIdentity.outputs.resourceId
      ]
    }
    primaryUserAssignedIdentityResourceId: userAssignedIdentity.outputs.resourceId
    privateEndpoints: enablePrivateNetworking
      ? [
          {
            privateDnsZoneGroup: {
              privateDnsZoneGroupConfigs: [
                {
                  privateDnsZoneResourceId: avmPrivateDnsZones[dnsZoneIndex.sqlServer]!.outputs.resourceId
                }
              ]
            }
            service: 'sqlServer'
            subnetResourceId: virtualNetwork!.outputs.pepsSubnetResourceId
            tags: tags
          }
        ]
      : []
    firewallRules: (!enablePrivateNetworking) ? [
      {
        endIpAddress: '255.255.255.255'
        name: 'AllowSpecificRange'
        startIpAddress: '0.0.0.0'
      }
      {
        endIpAddress: '0.0.0.0'
        name: 'AllowAllWindowsAzureIps'
        startIpAddress: '0.0.0.0'
      }
    ] : []
    tags: tags
  }
}

// ========== Frontend server farm ========== //
var webServerFarmResourceName = 'asp-${solutionSuffix}'
module webServerFarm 'br/public:avm/res/web/serverfarm:0.5.0' = {
  name: take('avm.res.web.serverfarm.${webServerFarmResourceName}', 64)
  params: {
    name: webServerFarmResourceName
    tags: tags
    enableTelemetry: enableTelemetry
    location: solutionLocation
    reserved: true
    kind: 'linux'
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspaceResourceId }] : null
    skuName: enableScalability || enableRedundancy ? 'P1v3' : 'B3'
    skuCapacity: enableScalability ? 3 : 1
    zoneRedundant: enableRedundancy ? true : false
  }
}

// ========== Frontend web site ========== //
var webSiteResourceName = 'app-${solutionSuffix}'
module webSite 'modules/web-sites.bicep' = {
  name: take('module.web-sites.${webSiteResourceName}', 64)
  params: {
    name: webSiteResourceName
    tags: tags
    location: solutionLocation
    managedIdentities: { userAssignedResourceIds: [userAssignedIdentity!.outputs.resourceId, sqlUserAssignedIdentity!.outputs.resourceId] }
    kind: 'app,linux,container'
    serverFarmResourceId: webServerFarm.?outputs.resourceId
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerRegistryHostnameActual}/${containerImageName}:${imageTag}'
      minTlsVersion: '1.2'
    }
    configs: [
      {
        name: 'appsettings'
        properties: {
          APP_ENV: appEnvironment
          APPINSIGHTS_INSTRUMENTATIONKEY: enableMonitoring ? applicationInsights!.outputs.instrumentationKey : ''
          APPLICATIONINSIGHTS_CONNECTION_STRING: enableMonitoring ? applicationInsights!.outputs.connectionString : ''
          AZURE_SEARCH_SERVICE: aiSearchName
          AZURE_SEARCH_INDEX: azureSearchIndex
          AZURE_SEARCH_USE_SEMANTIC_SEARCH: azureSearchUseSemanticSearch
          AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG: azureSearchSemanticSearchConfig
          AZURE_SEARCH_TOP_K: azureSearchTopK
          AZURE_SEARCH_ENABLE_IN_DOMAIN: azureSearchEnableInDomain
          AZURE_SEARCH_CONTENT_COLUMNS: azureSearchContentColumns
          AZURE_SEARCH_FILENAME_COLUMN: azureSearchFilenameColumn
          AZURE_SEARCH_TITLE_COLUMN: azureSearchTitleColumn
          AZURE_SEARCH_URL_COLUMN: azureSearchUrlColumn
          AZURE_OPENAI_RESOURCE: aiFoundryAiServices.outputs.name
          AZURE_OPENAI_MODEL: gptModelName
          AZURE_OPENAI_ENDPOINT: aiFoundryAiServices.outputs.endpoints['OpenAI Language Model Instance API']
          AZURE_OPENAI_TEMPERATURE: azureOpenAITemperature
          AZURE_OPENAI_TOP_P: azureOpenAITopP
          AZURE_OPENAI_MAX_TOKENS: azureOpenAIMaxTokens
          AZURE_OPENAI_STOP_SEQUENCE: azureOpenAIStopSequence
          AZURE_OPENAI_SYSTEM_MESSAGE: azureOpenAISystemMessage
          AZURE_OPENAI_PREVIEW_API_VERSION: azureOpenaiAPIVersion
          AZURE_OPENAI_STREAM: azureOpenAIStream
          AZURE_SEARCH_QUERY_TYPE: azureSearchQueryType
          AZURE_SEARCH_VECTOR_COLUMNS: azureSearchVectorFields
          AZURE_SEARCH_PERMITTED_GROUPS_COLUMN: azureSearchPermittedGroupsField
          AZURE_SEARCH_STRICTNESS: azureSearchStrictness
          AZURE_OPENAI_EMBEDDING_NAME: embeddingModel
          AZURE_OPENAI_EMBEDDING_ENDPOINT : aiFoundryAiServices.outputs.endpoints['OpenAI Language Model Instance API']
          SQLDB_SERVER: sqlServerFqdn
          SQLDB_DATABASE: sqlDbName
          USE_INTERNAL_STREAM: useInternalStream
          AZURE_COSMOSDB_ACCOUNT: cosmosDb.outputs.name
          AZURE_COSMOSDB_CONVERSATIONS_CONTAINER: collectionName
          AZURE_COSMOSDB_DATABASE: cosmosDbDatabaseName
          AZURE_COSMOSDB_ENABLE_FEEDBACK: azureCosmosDbEnableFeedback
          SQLDB_USER_MID: sqlUserAssignedIdentity.outputs.clientId
          AZURE_AI_SEARCH_ENDPOINT: 'https://${aiSearchName}.search.windows.net'
          AZURE_SQL_SYSTEM_PROMPT: functionAppSqlPrompt
          AZURE_CALL_TRANSCRIPT_SYSTEM_PROMPT: functionAppCallTranscriptSystemPrompt
          AZURE_OPENAI_STREAM_TEXT_SYSTEM_PROMPT: functionAppStreamTextSystemPrompt
          USE_AI_PROJECT_CLIENT: useAIProjectClientFlag
          AZURE_AI_AGENT_ENDPOINT: useExistingAiFoundryAiProject ? existingAiFoundryAiServicesProject!.properties.endpoints.inference : aiFoundryAiServices.outputs.aiProjectInfo.apiEndpoint
          AZURE_AI_AGENT_MODEL_DEPLOYMENT_NAME: gptModelName
          AZURE_AI_AGENT_API_VERSION: azureOpenaiAPIVersion
          AZURE_SEARCH_CONNECTION_NAME: aiSearchName
          AZURE_CLIENT_ID: userAssignedIdentity.outputs.clientId
        }
        applicationInsightResourceId: enableMonitoring ? applicationInsights!.outputs.resourceId : null
      }
    ]
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspaceResourceId }] : null
    vnetRouteAllEnabled: enablePrivateNetworking ? true : false
    vnetImagePullEnabled: enablePrivateNetworking ? true : false
    virtualNetworkSubnetId: enablePrivateNetworking ? virtualNetwork!.outputs.webSubnetResourceId : null
    publicNetworkAccess: 'Enabled'
  }
}

// ========== AI Search Service ========== //
var aiSearchName = 'srch-${solutionSuffix}'
module searchService 'br/public:avm/res/search/search-service:0.11.1' = {
  name: take('avm.res.search.search-service.${aiSearchName}', 64)
  params: {
    name: aiSearchName
    authOptions: {
      aadOrApiKey: {
        aadAuthFailureMode: 'http401WithBearerChallenge'
      }
    }
    diagnosticSettings: enableMonitoring ? [
      {
        workspaceResourceId: logAnalyticsWorkspaceResourceId
      }
    ] : null
    disableLocalAuth: false
    hostingMode: 'default'
    managedIdentities: {
      systemAssigned: true
    }
    networkRuleSet: {
      bypass: 'AzureServices'
      ipRules: []
    }
    roleAssignments: [
      {
        roleDefinitionIdOrName: '1407120a-92aa-4202-b7e9-c0e197c71c8f' // Search Index Data Reader
        principalId: userAssignedIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
      }
      {
        roleDefinitionIdOrName: '7ca78c08-252a-4471-8644-bb5ff32d4ba0' // Search Service Contributor
        principalId: userAssignedIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
      }
      {
        roleDefinitionIdOrName: '1407120a-92aa-4202-b7e9-c0e197c71c8f' // Search Index Data Reader
        principalId: !useExistingAiFoundryAiProject ? aiFoundryAiServices.outputs.aiProjectInfo.aiprojectSystemAssignedMIPrincipalId : existingAiFoundryAiServicesProject!.identity.principalId
        principalType: 'ServicePrincipal'
      }
      {
        roleDefinitionIdOrName: '7ca78c08-252a-4471-8644-bb5ff32d4ba0' // Search Service Contributor
        principalId: !useExistingAiFoundryAiProject ? aiFoundryAiServices.outputs.aiProjectInfo.aiprojectSystemAssignedMIPrincipalId : existingAiFoundryAiServicesProject!.identity.principalId
        principalType: 'ServicePrincipal'
      }
      // DEVELOPER EXPERIENCE: Add deployer permissions
      {
        roleDefinitionIdOrName: '1407120a-92aa-4202-b7e9-c0e197c71c8f' // Search Index Data Reader
        principalId: deployer().objectId
        principalType: 'User'
      }
      {
        roleDefinitionIdOrName: '7ca78c08-252a-4471-8644-bb5ff32d4ba0' // Search Service Contributor
        principalId: deployer().objectId
        principalType: 'User'
      }
    ]
    partitionCount: 1
    replicaCount: 1
    sku: 'standard'
    semanticSearch: 'free'
    tags: tags
    publicNetworkAccess: 'Enabled'
    privateEndpoints: enablePrivateNetworking
      ? [
          {
            name: 'pep-${aiSearchName}'
            customNetworkInterfaceName: 'nic-${aiSearchName}'
            privateDnsZoneGroup: {
              privateDnsZoneGroupConfigs: [
                { privateDnsZoneResourceId: avmPrivateDnsZones[dnsZoneIndex.searchService]!.outputs.resourceId }
              ]
            }
            service: 'searchService'
            subnetResourceId: virtualNetwork!.outputs.pepsSubnetResourceId
          }
        ]
      : []
  }
}

// ========== AI Search Project Connection ========== //
resource projectAISearchConnection 'Microsoft.CognitiveServices/accounts/projects/connections@2025-04-01-preview' = if (!useExistingAiFoundryAiProject) {
  name: '${aiFoundryAiServicesResourceName}/${aiFoundryAiServicesAiProjectResourceName}/${aiSearchName}'
  properties: {
    category: 'CognitiveSearch'
    target: 'https://${aiSearchName}.search.windows.net'
    authType: 'AAD'
    isSharedToAll: true
    metadata: {
      ApiType: 'Azure'
      ResourceId: searchService.outputs.resourceId
      location: searchService.outputs.location
    }
  }
}

module existing_AIProject_SearchConnectionModule 'modules/deploy_aifp_aisearch_connection.bicep' = if (useExistingAiFoundryAiProject) {
  name: 'aiProjectSearchConnectionDeployment'
  scope: resourceGroup(aiFoundryAiServicesSubscriptionId, aiFoundryAiServicesResourceGroupName)
  params: {
    existingAIProjectName: aiFoundryAiProjectResourceName
    existingAIFoundryName: aiFoundryAiServicesResourceName
    aiSearchName: aiSearchName
    aiSearchResourceId: searchService.outputs.resourceId
    aiSearchLocation: searchService.outputs.location
    aiSearchConnectionName: aiSearchName
  }
}

// ========== Existing AI Services Resources ========== //
resource existingAiFoundryAiServices 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' existing = if (useExistingAiFoundryAiProject) {
  name: aiFoundryAiServicesResourceName
  scope: resourceGroup(aiFoundryAiServicesSubscriptionId, aiFoundryAiServicesResourceGroupName)
}

resource existingAiFoundryAiServicesProject 'Microsoft.CognitiveServices/accounts/projects@2025-04-01-preview' existing = if (useExistingAiFoundryAiProject) {
  name: aiFoundryAiProjectResourceName
  parent: existingAiFoundryAiServices
}

// ========== Search Service Role Assignments ========== //
resource searchServiceToAiServicesRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!useExistingAiFoundryAiProject) {
  name: guid(aiSearchName, '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd', aiFoundryAiServicesResourceName)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd') // Cognitive Services OpenAI User
    principalId: searchService.outputs.systemAssignedMIPrincipalId!
    principalType: 'ServicePrincipal'
  }
}

// Role assignment for existing AI Services scenario
module searchServiceToExistingAiServicesRoleAssignment 'modules/role-assignment.bicep' = if (useExistingAiFoundryAiProject) {
  name: 'searchToExistingAiServices-roleAssignment'
  scope: resourceGroup(aiFoundryAiServicesSubscriptionId, aiFoundryAiServicesResourceGroupName)
  params: {
    principalId: searchService.outputs.systemAssignedMIPrincipalId!
    roleDefinitionId: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd' // Cognitive Services OpenAI User
    targetResourceName: aiFoundryAiServices.outputs.name
  }
}

// ========== Outputs ========== //
@description('URL of the deployed web application.')
output WEB_APP_URL string = 'https://${webSite.outputs.name}.azurewebsites.net'

@description('Name of the deployed web application.')
output WEB_APP_NAME string = webSite.outputs.name

@description('Name of the Azure Container Registry.')
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.outputs.name

@description('Login server of the Azure Container Registry.')
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer

@description('Container registry hostname for docker images.')
output CONTAINER_REGISTRY_HOSTNAME string = containerRegistryHostnameActual

@description('Container image name.')
output CONTAINER_IMAGE_NAME string = containerImageName

@description('Container image tag.')
output IMAGE_TAG string = imageTag

@description('Name of the storage account.')
output STORAGE_ACCOUNT_NAME string = avmStorageAccount.outputs.name

@description('Name of the storage container.')
output STORAGE_CONTAINER_NAME string = 'data'

@description('Name of the Key Vault.')
output KEY_VAULT_NAME string = keyvault.outputs.name

@description('Name of the Cosmos DB account.')
output COSMOSDB_ACCOUNT_NAME string = cosmosDb.outputs.name

@description('Name of the resource group.')
output RESOURCE_GROUP_NAME string = resourceGroup().name

@description('The resource ID of the AI Foundry instance.')
output AI_FOUNDRY_RESOURCE_ID string = aiFoundryAiServices.outputs.resourceId

@description('Name of the SQL Database server.')
output SQLDB_SERVER_NAME string = sqlDBModule.outputs.name

@description('Name of the SQL Database.')
output SQLDB_DATABASE string = sqlDbName

@description('Name of the managed identity used by the web app.')
output MANAGEDIDENTITY_WEBAPP_NAME string = userAssignedIdentity.outputs.name

@description('Client ID of the managed identity used by the web app.')
output MANAGEDIDENTITY_WEBAPP_CLIENTID string = userAssignedIdentity.outputs.clientId

@description('Name of the managed identity used for SQL database operations.')
output MANAGEDIDENTITY_SQL_NAME string = sqlUserAssignedIdentity.outputs.name

@description('Client ID of the managed identity used for SQL database operations.')
output MANAGEDIDENTITY_SQL_CLIENTID string = sqlUserAssignedIdentity.outputs.clientId

@description('Name of the AI Search service.')
output AI_SEARCH_SERVICE_NAME string = aiSearchName

@description('Specifies the current application environment.')
output APP_ENV string = appEnvironment

@description('The Application Insights instrumentation key.')
output APPINSIGHTS_INSTRUMENTATIONKEY string = enableMonitoring ? applicationInsights!.outputs.instrumentationKey : ''

@description('The Application Insights connection string.')
output APPLICATIONINSIGHTS_CONNECTION_STRING string = enableMonitoring ? applicationInsights!.outputs.connectionString : ''

@description('The Azure Subscription ID where the resources are deployed.')
output AZURE_SUBSCRIPTION_ID string = subscription().subscriptionId

// Additional outputs for environment configuration
@description('Azure OpenAI endpoint.')
output AZURE_OPENAI_ENDPOINT string = aiFoundryAiServices.outputs.endpoints['OpenAI Language Model Instance API']

@description('Azure OpenAI resource name.')
output AZURE_OPENAI_RESOURCE string = aiFoundryAiServices.outputs.name

@description('Azure OpenAI model name.')
output AZURE_OPENAI_MODEL string = gptModelName

@description('Azure AI Search endpoint.')
output AZURE_AI_SEARCH_ENDPOINT string = 'https://${aiSearchName}.search.windows.net'

@description('Azure Cosmos DB account name.')
output AZURE_COSMOSDB_ACCOUNT string = cosmosDb.outputs.name

@description('Azure Cosmos DB database name.')
output AZURE_COSMOSDB_DATABASE string = cosmosDbDatabaseName

@description('Azure Cosmos DB conversations container name.')
output AZURE_COSMOSDB_CONVERSATIONS_CONTAINER string = collectionName

@description('SQL Database server FQDN.')
output SQLDB_SERVER string = sqlServerFqdn

@description('Client ID for web app managed identity.')
output AZURE_CLIENT_ID string = userAssignedIdentity.outputs.clientId
