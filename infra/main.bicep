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
@description('Required. Location for AI Foundry deployment. This is the location where the AI Foundry resources will be deployed.')
param aiDeploymentsLocation string

@description('Optional. Set this if you want to deploy to a different region than the resource group. Otherwise, it will use the resource group location by default.')
param AZURE_LOCATION string = ''
var solutionLocation = empty(AZURE_LOCATION) ? resourceGroup().location : AZURE_LOCATION

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

@description('Optional. Enable private networking for applicable resources, aligned with the Well Architected Framework recommendations. Defaults to false.')
param enablePrivateNetworking bool = false

@description('Optional. Enable monitoring applicable resources, aligned with the Well Architected Framework recommendations. This setting enables Application Insights and Log Analytics and configures all the resources applicable resources to send logs. Defaults to false.')
param enableMonitoring bool = false

@description('Optional. Enable/Disable usage telemetry for module.')
param enableTelemetry bool = true

@description('Optional. Enable redundancy for applicable resources, aligned with the Well Architected Framework recommendations. Defaults to false.')
param enableRedundancy bool = false

@description('Optional. Enable purge protection for the Key Vault')
param enablePurgeProtection bool = false

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
var sqlServerFqdn = '${sqlDBModule.outputs.name}.database.windows.net'

@description('Optional. Size of the Jumpbox Virtual Machine when created. Set to custom value if enablePrivateNetworking is true.')
param vmSize string? 

@description('Optional. Admin username for the Jumpbox Virtual Machine. Set to custom value if enablePrivateNetworking is true.')
@secure()
//param vmAdminUsername string = take(newGuid(), 20)
param vmAdminUsername string?

@description('Optional. Admin password for the Jumpbox Virtual Machine. Set to custom value if enablePrivateNetworking is true.')
@secure()
//param vmAdminPassword string = newGuid()
param vmAdminPassword string?

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

// Replica regions list based on article in [Azure regions list](https://learn.microsoft.com/azure/reliability/regions-list) and [Enhance resilience by replicating your Log Analytics workspace across regions](https://learn.microsoft.com/azure/azure-monitor/logs/workspace-replication#supported-regions) for supported regions for Log Analytics Workspace.
// var replicaRegionPairs = {
//   australiaeast: 'australiasoutheast'
//   centralus: 'westus'
//   eastasia: 'japaneast'
//   eastus: 'centralus'
//   eastus2: 'centralus'
//   japaneast: 'eastasia'
//   northeurope: 'westeurope'
//   southeastasia: 'eastasia'
//   uksouth: 'westeurope'
//   westeurope: 'northeurope'
// }
// var replicaLocation = replicaRegionPairs[resourceGroup().location]

@description('Optional. The tags to apply to all deployed Azure resources.')
param tags resourceInput<'Microsoft.Resources/resourceGroups@2025-04-01'>.tags = {}

var aiFoundryAiServicesAiProjectResourceName = 'proj-${solutionSuffix}'

// Region pairs list based on article in [Azure Database for MySQL Flexible Server - Azure Regions](https://learn.microsoft.com/azure/mysql/flexible-server/overview#azure-regions) for supported high availability regions for CosmosDB.
// var cosmosDbZoneRedundantHaRegionPairs = {
//   australiaeast: 'uksouth' //'southeastasia'
//   centralus: 'eastus2'
//   eastasia: 'southeastasia'
//   eastus: 'centralus'
//   eastus2: 'centralus'
//   japaneast: 'australiaeast'
//   northeurope: 'westeurope'
//   southeastasia: 'eastasia'
//   uksouth: 'westeurope'
//   westeurope: 'northeurope'
// }


var allTags = union(
  {
    'azd-env-name': solutionName
  },
  tags
)

var resourcesName = toLower(trim(replace(
  replace(
    replace(replace(replace(replace('${solutionName}${solutionUniqueToken}', '-', ''), '_', ''), '.', ''), '/', ''),
    ' ',
    ''
  ),
  '*',
  ''
)))

// Paired location calculated based on 'location' parameter. This location will be used by applicable resources if `enableScalability` is set to `true`
// var cosmosDbHaLocation = cosmosDbZoneRedundantHaRegionPairs[resourceGroup().location]

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

// ========== User Assigned Identity ========== //
// WAF best practices for identity and access management: https://learn.microsoft.com/en-us/azure/well-architected/security/identity-access
var userAssignedIdentityResourceName = 'id-${solutionSuffix}'
module userAssignedIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.4.1' = {
  name: take('avm.res.managed-identity.user-assigned-identity.${userAssignedIdentityResourceName}', 64)
  params: {
    name: userAssignedIdentityResourceName
    location: solutionLocation
    tags: tags
    // enableTelemetry: enableTelemetry
  }
}

// ========== Key Vault ========== //
// module keyvaultModule 'deploy_keyvault.bicep' = {
//   name: 'deploy_keyvault'
//   params: {
//     solutionName: solutionSuffix
//     solutionLocation: solutionLocation
//     managedIdentityObjectId: managedIdentityModule.outputs.managedIdentityOutput.objectId
//     kvName: 'kv-${solutionSuffix}'
//     tags: tags
//   }
//   scope: resourceGroup(resourceGroup().name)
// }

module network 'modules/network.bicep' = if (enablePrivateNetworking) {
  name: take('network-${resourcesName}-deployment', 64)
  params: {
    resourcesName: resourcesName
    logAnalyticsWorkSpaceResourceId: logAnalyticsWorkspace.outputs.resourceId
    vmAdminUsername: vmAdminUsername ?? 'JumpboxAdminUser'
    vmAdminPassword: vmAdminPassword ?? 'JumpboxAdminP@ssw0rd1234!'
    vmSize: vmSize ??  'Standard_DS2_v2' // Default VM size 
    location: solutionLocation
    tags: allTags
    enableTelemetry: enableTelemetry
  }
}


var networkSecurityGroupAdministrationResourceName = 'nsg-${solutionSuffix}-administration'
module networkSecurityGroupAdministration 'br/public:avm/res/network/network-security-group:0.5.1' = if (enablePrivateNetworking) {
  name: take('avm.res.network.network-security-group.${networkSecurityGroupAdministrationResourceName}', 64)
  params: {
    name: networkSecurityGroupAdministrationResourceName
    location: solutionLocation
    tags: tags
    enableTelemetry: enableTelemetry
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspace!.outputs.resourceId }] : null
    securityRules: [
      {
        name: 'deny-hop-outbound'
        properties: {
          access: 'Deny'
          destinationAddressPrefix: '*'
          destinationPortRanges: [
            '22'
            '3389'
          ]
          direction: 'Outbound'
          priority: 200
          protocol: 'Tcp'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
        }
      }
    ]
  }
}


// ========== Network Security Groups ========== //
// WAF best practices for virtual networks: https://learn.microsoft.com/en-us/azure/well-architected/service-guides/virtual-network
// WAF recommendations for networking and connectivity: https://learn.microsoft.com/en-us/azure/well-architected/security/networking
var networkSecurityGroupBackendResourceName = 'nsg-${solutionSuffix}-backend'
module networkSecurityGroupBackend 'br/public:avm/res/network/network-security-group:0.5.1' = if (enablePrivateNetworking) {
  name: take('avm.res.network.network-security-group.${networkSecurityGroupBackendResourceName}', 64)
  params: {
    name: networkSecurityGroupBackendResourceName
    location: solutionLocation
    tags: tags
    enableTelemetry: enableTelemetry
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspace!.outputs.resourceId }] : null
    securityRules: [
      {
        name: 'deny-hop-outbound'
        properties: {
          access: 'Deny'
          destinationAddressPrefix: '*'
          destinationPortRanges: [
            '22'
            '3389'
          ]
          direction: 'Outbound'
          priority: 200
          protocol: 'Tcp'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
        }
      }
    ]
  }
}


var networkSecurityGroupBastionResourceName = 'nsg-${solutionSuffix}-bastion'
module networkSecurityGroupBastion 'br/public:avm/res/network/network-security-group:0.5.1' = if (enablePrivateNetworking) {
  name: take('avm.res.network.network-security-group.${networkSecurityGroupBastionResourceName}', 64)
  params: {
    name: networkSecurityGroupBastionResourceName
    location: solutionLocation
    tags: tags
    enableTelemetry: enableTelemetry
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspace!.outputs.resourceId }] : null
    securityRules: [
      {
        name: 'AllowHttpsInBound'
        properties: {
          protocol: 'Tcp'
          sourcePortRange: '*'
          sourceAddressPrefix: 'Internet'
          destinationPortRange: '443'
          destinationAddressPrefix: '*'
          access: 'Allow'
          priority: 100
          direction: 'Inbound'
        }
      }
      {
        name: 'AllowGatewayManagerInBound'
        properties: {
          protocol: 'Tcp'
          sourcePortRange: '*'
          sourceAddressPrefix: 'GatewayManager'
          destinationPortRange: '443'
          destinationAddressPrefix: '*'
          access: 'Allow'
          priority: 110
          direction: 'Inbound'
        }
      }
      {
        name: 'AllowLoadBalancerInBound'
        properties: {
          protocol: 'Tcp'
          sourcePortRange: '*'
          sourceAddressPrefix: 'AzureLoadBalancer'
          destinationPortRange: '443'
          destinationAddressPrefix: '*'
          access: 'Allow'
          priority: 120
          direction: 'Inbound'
        }
      }
      {
        name: 'AllowBastionHostCommunicationInBound'
        properties: {
          protocol: '*'
          sourcePortRange: '*'
          sourceAddressPrefix: 'VirtualNetwork'
          destinationPortRanges: [
            '8080'
            '5701'
          ]
          destinationAddressPrefix: 'VirtualNetwork'
          access: 'Allow'
          priority: 130
          direction: 'Inbound'
        }
      }
      {
        name: 'DenyAllInBound'
        properties: {
          protocol: '*'
          sourcePortRange: '*'
          sourceAddressPrefix: '*'
          destinationPortRange: '*'
          destinationAddressPrefix: '*'
          access: 'Deny'
          priority: 1000
          direction: 'Inbound'
        }
      }
      {
        name: 'AllowSshRdpOutBound'
        properties: {
          protocol: 'Tcp'
          sourcePortRange: '*'
          sourceAddressPrefix: '*'
          destinationPortRanges: [
            '22'
            '3389'
          ]
          destinationAddressPrefix: 'VirtualNetwork'
          access: 'Allow'
          priority: 100
          direction: 'Outbound'
        }
      }
      {
        name: 'AllowAzureCloudCommunicationOutBound'
        properties: {
          protocol: 'Tcp'
          sourcePortRange: '*'
          sourceAddressPrefix: '*'
          destinationPortRange: '443'
          destinationAddressPrefix: 'AzureCloud'
          access: 'Allow'
          priority: 110
          direction: 'Outbound'
        }
      }
      {
        name: 'AllowBastionHostCommunicationOutBound'
        properties: {
          protocol: '*'
          sourcePortRange: '*'
          sourceAddressPrefix: 'VirtualNetwork'
          destinationPortRanges: [
            '8080'
            '5701'
          ]
          destinationAddressPrefix: 'VirtualNetwork'
          access: 'Allow'
          priority: 120
          direction: 'Outbound'
        }
      }
      {
        name: 'AllowGetSessionInformationOutBound'
        properties: {
          protocol: '*'
          sourcePortRange: '*'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: 'Internet'
          destinationPortRanges: [
            '80'
            '443'
          ]
          access: 'Allow'
          priority: 130
          direction: 'Outbound'
        }
      }
      {
        name: 'DenyAllOutBound'
        properties: {
          protocol: '*'
          sourcePortRange: '*'
          destinationPortRange: '*'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
          access: 'Deny'
          priority: 1000
          direction: 'Outbound'
        }
      }
    ]
  }
}

var networkSecurityGroupContainersResourceName = 'nsg-${solutionSuffix}-containers'
module networkSecurityGroupContainers 'br/public:avm/res/network/network-security-group:0.5.1' = if (enablePrivateNetworking) {
  name: take('avm.res.network.network-security-group.${networkSecurityGroupContainersResourceName}', 64)
  params: {
    name: networkSecurityGroupContainersResourceName
    location: solutionLocation
    tags: tags
    enableTelemetry: enableTelemetry
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspace!.outputs.resourceId }] : null
    securityRules: [
      {
        name: 'deny-hop-outbound'
        properties: {
          access: 'Deny'
          destinationAddressPrefix: '*'
          destinationPortRanges: [
            '22'
            '3389'
          ]
          direction: 'Outbound'
          priority: 200
          protocol: 'Tcp'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
        }
      }
    ]
  }
}

var networkSecurityGroupWebsiteResourceName = 'nsg-${solutionSuffix}-website'
module networkSecurityGroupWebsite 'br/public:avm/res/network/network-security-group:0.5.1' = if (enablePrivateNetworking) {
  name: take('avm.res.network.network-security-group.${networkSecurityGroupWebsiteResourceName}', 64)
  params: {
    name: networkSecurityGroupWebsiteResourceName
    location: solutionLocation
    tags: tags
    enableTelemetry: enableTelemetry
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspace!.outputs.resourceId }] : null
    securityRules: [
      {
        name: 'deny-hop-outbound'
        properties: {
          access: 'Deny'
          destinationAddressPrefix: '*'
          destinationPortRanges: [
            '22'
            '3389'
          ]
          direction: 'Outbound'
          priority: 200
          protocol: 'Tcp'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
        }
      }
    ]
  }
}

// ========== Virtual Network ========== //
// WAF best practices for virtual networks: https://learn.microsoft.com/en-us/azure/well-architected/service-guides/virtual-network
// WAF recommendations for networking and connectivity: https://learn.microsoft.com/en-us/azure/well-architected/security/networking
var virtualNetworkResourceName = 'vnet-${solutionSuffix}'
module virtualNetwork 'br/public:avm/res/network/virtual-network:0.7.0' = if (enablePrivateNetworking) {
  name: take('avm.res.network.virtual-network.${virtualNetworkResourceName}', 64)
  params: {
    name: virtualNetworkResourceName
    location: solutionLocation
    tags: tags
    enableTelemetry: enableTelemetry
    addressPrefixes: ['10.0.0.0/8']
    subnets: [
      {
        name: 'backend'
        addressPrefix: '10.0.0.0/27'
        //defaultOutboundAccess: false TODO: check this configuration for a more restricted outbound access
        networkSecurityGroupResourceId: networkSecurityGroupBackend!.outputs.resourceId
      }
      {
        name: 'administration'
        addressPrefix: '10.0.0.32/27'
        networkSecurityGroupResourceId: networkSecurityGroupAdministration!.outputs.resourceId
        //defaultOutboundAccess: false TODO: check this configuration for a more restricted outbound access
        //natGatewayResourceId: natGateway.outputs.resourceId
      }
      {
        // For Azure Bastion resources deployed on or after November 2, 2021, the minimum AzureBastionSubnet size is /26 or larger (/25, /24, etc.).
        // https://learn.microsoft.com/en-us/azure/bastion/configuration-settings#subnet
        name: 'AzureBastionSubnet' //This exact name is required for Azure Bastion
        addressPrefix: '10.0.0.64/26'
        networkSecurityGroupResourceId: networkSecurityGroupBastion!.outputs.resourceId
      }
      {
        // If you use your own vnw, you need to provide a subnet that is dedicated exclusively to the Container App environment you deploy. This subnet isn't available to other services
        // https://learn.microsoft.com/en-us/azure/container-apps/networking?tabs=workload-profiles-env%2Cazure-cli#custom-vnw-configuration
        name: 'containers'
        addressPrefix: '10.0.2.0/23' //subnet of size /23 is required for container app
        delegation: 'Microsoft.App/environments'
        networkSecurityGroupResourceId: networkSecurityGroupContainers!.outputs.resourceId
        privateEndpointNetworkPolicies: 'Enabled'
        privateLinkServiceNetworkPolicies: 'Enabled'
      }
      {
        // If you use your own vnw, you need to provide a subnet that is dedicated exclusively to the App Environment you deploy. This subnet isn't available to other services
        // https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration#subnet-requirements
        name: 'webserverfarm'
        addressPrefix: '10.0.4.0/27' //When you're creating subnets in Azure portal as part of integrating with the virtual network, a minimum size of /27 is required
        delegation: 'Microsoft.Web/serverfarms'
        networkSecurityGroupResourceId: networkSecurityGroupWebsite!.outputs.resourceId
        privateEndpointNetworkPolicies: 'Enabled'
        privateLinkServiceNetworkPolicies: 'Enabled'
      }
    ]
  }
}

// ========== Private DNS Zones ========== //
var privateDnsZones = [
  'privatelink.cognitiveservices.azure.com'
  'privatelink.openai.azure.com'
  'privatelink.services.ai.azure.com'
  'privatelink.contentunderstanding.ai.azure.com'
  'privatelink.blob.${environment().suffixes.storage}'
  'privatelink.queue.${environment().suffixes.storage}'
  'privatelink.file.${environment().suffixes.storage}'
  'privatelink.api.azureml.ms'
  'privatelink.notebooks.azure.net'
  'privatelink.mongo.cosmos.azure.com'
  'privatelink.azconfig.io'
  'privatelink.vaultcore.azure.net'
  'privatelink.azurecr.io'
  'privatelink${environment().suffixes.sqlServerHostname}'
]
// DNS Zone Index Constants
var dnsZoneIndex = {
  cognitiveServices: 0
  openAI: 1
  aiServices: 2
  contentUnderstanding: 3
  storageBlob: 4
  storageQueue: 5
  storageFile: 6
  aiFoundry: 7
  notebooks: 8
  cosmosDB: 9
  appConfig: 10
  keyVault: 11
  containerRegistry: 12
  sqlServer: 13
}
@batchSize(5)
module avmPrivateDnsZones 'br/public:avm/res/network/private-dns-zone:0.7.1' = [
  for (zone, i) in privateDnsZones: if (enablePrivateNetworking) {
    name: 'dns-zone-${i}'
    params: {
      name: zone
      tags: tags
      enableTelemetry: enableTelemetry
      virtualNetworkLinks: [{ virtualNetworkResourceId: virtualNetwork!.outputs.resourceId }]
    }
  }
]


// ========== Log Analytics Workspace ========== //
// WAF best practices for Log Analytics: https://learn.microsoft.com/en-us/azure/well-architected/service-guides/azure-log-analytics
// WAF PSRules for Log Analytics: https://azure.github.io/PSRule.Rules.Azure/en/rules/resource/#azure-monitor-logs
var logAnalyticsWorkspaceResourceName = 'log-${solutionSuffix}'
module logAnalyticsWorkspace 'br/public:avm/res/operational-insights/workspace:0.12.0' = if (enableMonitoring) {
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
    // WAF aligned configuration for Redundancy
    dailyQuotaGb: enableRedundancy ? 10 : null //WAF recommendation: 10 GB per day is a good starting point for most workloads
    // WAF aligned configuration for Private Networking
    publicNetworkAccessForIngestion: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    publicNetworkAccessForQuery: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    dataSources: enablePrivateNetworking
      ? [
          {
            tags: tags
            eventLogName: 'Application'
            eventTypes: [
              {
                eventType: 'Error'
              }
              {
                eventType: 'Warning'
              }
              {
                eventType: 'Information'
              }
            ]
            kind: 'WindowsEvent'
            name: 'applicationEvent'
          }
          {
            counterName: '% Processor Time'
            instanceName: '*'
            intervalSeconds: 60
            kind: 'WindowsPerformanceCounter'
            name: 'windowsPerfCounter1'
            objectName: 'Processor'
          }
          {
            kind: 'IISLogs'
            name: 'sampleIISLog1'
            state: 'OnPremiseEnabled'
          }
        ]
      : null
  }
}

// Key Vault resource
var keyVaultName = 'KV-${solutionSuffix}'
module keyvault 'br/public:avm/res/key-vault/vault:0.12.1' = {
  name: take('avm.res.key-vault.vault.${keyVaultName}', 64)
  params: {
    name: keyVaultName
    location: solutionLocation
    tags: tags
    sku: 'premium'
    publicNetworkAccess: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
    enableVaultForDeployment: true
    enableVaultForDiskEncryption: true
    enableVaultForTemplateDeployment: true
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    diagnosticSettings: enableMonitoring 
      ? [{ workspaceResourceId: logAnalyticsWorkspace!.outputs.resourceId }] 
      : []
    // WAF aligned configuration for Private Networking
    privateEndpoints: enablePrivateNetworking
      ? [
          {
            name: 'pep-${keyVaultName}'
            customNetworkInterfaceName: 'nic-${keyVaultName}'
            privateDnsZoneGroup: {
              privateDnsZoneGroupConfigs: [{ privateDnsZoneResourceId: avmPrivateDnsZones[dnsZoneIndex.keyVault]!.outputs.resourceId}]
            }
            service: 'vault'
            subnetResourceId: virtualNetwork!.outputs.subnetResourceIds[0]
          }
        ]
      : []
    // WAF aligned configuration for Role-based Access Control
    roleAssignments: [
      {
         principalId: userAssignedIdentity.outputs.principalId
         principalType: 'ServicePrincipal'
         roleDefinitionIdOrName: 'Key Vault Administrator'
      }
    ]
    secrets: [
      {
        name: 'ExampleSecret'
        value: 'YourSecretValue'
      }
    ]
    // enableTelemetry: enableTelemetry
  }
}

// ==========AI Foundry and related resources ========== //
module aifoundry 'deploy_ai_foundry.bicep' = {
  name: 'deploy_ai_foundry'
  params: {
    solutionName: solutionSuffix
    solutionLocation: aiDeploymentsLocation
    keyVaultName: keyvault.outputs.name
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
// module cosmosDBModule 'deploy_cosmos_db.bicep' = {
//   name: 'deploy_cosmos_db'
//   params: {
//     solutionLocation: cosmosLocation
//     cosmosDBName: 'cosmos-${solutionSuffix}'
//     tags: tags
//   }
//   scope: resourceGroup(resourceGroup().name)
// }


//========== AVM WAF ========== //
//========== Cosmos DB module ========== //
var cosmosDbResourceName = 'cosmos-${solutionSuffix}'
var cosmosDbDatabaseName = 'db_conversation_history'
// var cosmosDbDatabaseMemoryContainerName = 'memory'
var collectionName = 'conversations'
//TODO: update to latest version of AVM module
module cosmosDb 'br/public:avm/res/document-db/database-account:0.15.0' = {
  name: take('avm.res.document-db.database-account.${cosmosDbResourceName}', 64)
  params: {
    // Required parameters
    name: cosmosDbResourceName
    location: solutionLocation
    tags: tags
    enableTelemetry: enableTelemetry
    sqlDatabases: [
      {
        name: cosmosDbDatabaseName
        containers: [
          // {
          //   name: cosmosDbDatabaseMemoryContainerName
          //   paths: [
          //     '/session_id'
          //   ]
          //   kind: 'Hash'
          //   version: 2
          // }
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
        // Cosmos DB Built-in Data Contributor: https://docs.azure.cn/en-us/cosmos-db/nosql/security/reference-data-plane-roles#cosmos-db-built-in-data-contributor
        roleName: 'Cosmos DB SQL Data Contributor'
        dataActions: [
          'Microsoft.DocumentDB/databaseAccounts/readMetadata'
          'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/*'
          'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/*'
        ]
        assignments: [{ principalId: userAssignedIdentity.outputs.principalId }]
      }
    ]
    // WAF aligned configuration for Monitoring
    diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspace!.outputs.resourceId }] : null
    // WAF aligned configuration for Private Networking
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
            subnetResourceId: virtualNetwork!.outputs.subnetResourceIds[0]
          }
        ]
      : []
    // WAF aligned configuration for Redundancy
    zoneRedundant: enableRedundancy ? true : false
    capabilitiesToAdd: enableRedundancy ? null : ['EnableServerless']
    automaticFailover: enableRedundancy ? true : false
  }
  dependsOn: [keyvault, avmStorageAccount]
  scope: resourceGroup(resourceGroup().name)
}


// ========== Storage Account Module ========== //
// module storageAccountModule 'deploy_storage_account.bicep' = {
//   name: 'deploy_storage_account'
//   params: {
//     solutionLocation: solutionLocation
//     managedIdentityObjectId: userAssignedIdentity.outputs.principalId
//     saName: 'st${solutionSuffix}'
//     keyVaultName: keyvault.outputs.name
//     tags: tags
//   }
//   scope: resourceGroup(resourceGroup().name)
// }

// ========== AVM WAF ========== //
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
    ]
    // WAF aligned networking
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: enablePrivateNetworking ? 'Deny' : 'Allow'
    }
    allowBlobPublicAccess: enablePrivateNetworking ? true : false
    publicNetworkAccess: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    // Private endpoints for blob and queue
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
            subnetResourceId: virtualNetwork!.outputs.subnetResourceIds[0]
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
            subnetResourceId: virtualNetwork!.outputs.subnetResourceIds[0]
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
        }
      ]
    }
    //   secretsExportConfiguration: {
    //   accessKey1Name: 'ADLS-ACCOUNT-NAME'
    //   connectionString1Name: storageAccountName
    //   accessKey2Name: 'ADLS-ACCOUNT-CONTAINER'
    //   connectionString2Name: 'data'
    //   accessKey3Name: 'ADLS-ACCOUNT-KEY'
    //   connectionString3Name: listKeys(resourceId('Microsoft.Storage/storageAccounts', storageAccountName), '2021-04-01')
    //   keyVaultResourceId: keyvault.outputs.resourceId
    // }
  }
  dependsOn: [keyvault]
  scope: resourceGroup(resourceGroup().name)
}

// working version of saving storage account secrets in key vault using AVM module
module saveStorageAccountSecretsInKeyVault 'br/public:avm/res/key-vault/vault:0.12.1' = {
  name: take('saveStorageAccountSecretsInKeyVault.${keyVaultName}', 64)
  params: {
    name: keyVaultName
    enablePurgeProtection: enablePurgeProtection
    enableVaultForDeployment: true
    enableVaultForDiskEncryption: true
    enableVaultForTemplateDeployment: true
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    secrets: [
      {
        name: 'ADLS-ACCOUNT-NAME'
        value: storageAccountName
      }
      {
        name: 'ADLS-ACCOUNT-CONTAINER'
        value: 'data'
      }
      {
        name: 'ADLS-ACCOUNT-KEY'
        value: avmStorageAccount.outputs.primaryAccessKey
      }
    ]
  }
}


//========== SQL DB Module ========== //
// module sqlDBModule 'deploy_sql_db.bicep' = {
//   name: 'deploy_sql_db'
//   params: {
//     solutionLocation: solutionLocation
//     keyVaultName: keyvault.outputs.name
//     managedIdentityObjectId: userAssignedIdentity.outputs.principalId
//     managedIdentityName: userAssignedIdentity.outputs.name
//     serverName: 'sql-${solutionSuffix}'
//     sqlDBName: 'sqldb-${solutionSuffix}'
//     tags: tags
//   }
//   scope: resourceGroup(resourceGroup().name)
// }

var sqlDbName = 'sqldb-${solutionSuffix}'
module sqlDBModule 'br/public:avm/res/sql/server:0.20.1' = {
  name: 'serverDeployment'
  params: {
    // Required parameters
    name: 'sql-${solutionSuffix}'
    // Non-required parameters
    administrators: {
      azureADOnlyAuthentication: true
      login: userAssignedIdentity.outputs.name
      principalType: 'Application'
      sid: userAssignedIdentity.outputs.principalId
      tenantId: subscription().tenantId
    }
    connectionPolicy: 'Redirect'
    // customerManagedKey: {
    //   autoRotationEnabled: true
    //   keyName: keyvault.outputs.name
    //   keyVaultResourceId: keyvault.outputs.resourceId
    //   // keyVersion: keyvault.outputs.
    // }
    databases: [
      {
        availabilityZone: 1
        backupLongTermRetentionPolicy: {
          monthlyRetention: 'P6M'
        }
        backupShortTermRetentionPolicy: {
          retentionDays: 14
        }
        collation: 'SQL_Latin1_General_CP1_CI_AS'
        diagnosticSettings: enableMonitoring ? [{ workspaceResourceId: logAnalyticsWorkspace!.outputs.resourceId }] : null
        elasticPoolResourceId: resourceId('Microsoft.Sql/servers/elasticPools', 'sql-${solutionSuffix}', 'sqlswaf-ep-001')
        licenseType: 'LicenseIncluded'
        maxSizeBytes: 34359738368
        name: 'sqldb-${solutionSuffix}'
        sku: {
          capacity: 0
          name: 'ElasticPool'
          tier: 'GeneralPurpose'
        }
      }
    ]
    elasticPools: [
      {
        availabilityZone: -1
        //maintenanceConfigurationId: '<maintenanceConfigurationId>'
        name: 'sqlswaf-ep-001'
        sku: {
          capacity: 10
          name: 'GP_Gen5'
          tier: 'GeneralPurpose'
        }
        roleAssignments: [
          {
            principalId: userAssignedIdentity.outputs.principalId
            principalType: 'ServicePrincipal'
            roleDefinitionIdOrName: 'db_datareader'
          }
          {
            principalId: userAssignedIdentity.outputs.principalId
            principalType: 'ServicePrincipal'
            roleDefinitionIdOrName: 'db_datawriter'
          }

          //Enable if above access is not sufficient for your use case
          // {
          //   principalId: userAssignedIdentity.outputs.principalId
          //   principalType: 'ServicePrincipal'
          //   roleDefinitionIdOrName: 'SQL DB Contributor'
          // }
          // {
          //   principalId: userAssignedIdentity.outputs.principalId
          //   principalType: 'ServicePrincipal'
          //   roleDefinitionIdOrName: 'SQL Server Contributor'
          // }
        ]
      }
    ]
    firewallRules: [
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
            subnetResourceId: virtualNetwork!.outputs.subnetResourceIds[0]
            tags: tags
          }
        ]
      : []
    restrictOutboundNetworkAccess: 'Disabled'
    securityAlertPolicies: [
      {
        emailAccountAdmins: true
        name: 'Default'
        state: 'Enabled'
      }
    ]
    tags: tags
    virtualNetworkRules: enablePrivateNetworking
      ? [
          {
            ignoreMissingVnetServiceEndpoint: true
            name: 'newVnetRule1'
            virtualNetworkSubnetResourceId: virtualNetwork!.outputs.subnetResourceIds[0]
          }
        ]
      : []
    vulnerabilityAssessmentsObj: {
      name: 'default'
      // recurringScans: {
      //   emails: [
      //     'test1@contoso.com'
      //     'test2@contoso.com'
      //   ]
      //   emailSubscriptionAdmins: true
      //   isEnabled: true
      // }
      storageAccountResourceId: avmStorageAccount.outputs.resourceId
    }
  }
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
    SQLDB_DATABASE: sqlDbName
    AZURE_COSMOSDB_ACCOUNT: cosmosDb.outputs.name
    AZURE_COSMOSDB_CONVERSATIONS_CONTAINER: collectionName
    AZURE_COSMOSDB_DATABASE: cosmosDbDatabaseName
    AZURE_COSMOSDB_ENABLE_FEEDBACK: azureCosmosDbEnableFeedback
    //VITE_POWERBI_EMBED_URL: 'TBD'
    imageTag: imageTag
    userassignedIdentityClientId: userAssignedIdentity.outputs.clientId
    userassignedIdentityId: userAssignedIdentity.outputs.principalId
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
output AI_FOUNDRY_RESOURCE_ID string = aifoundry.outputs.aiFoundryId

@description('Name of the SQL Database server.')
output SQLDB_SERVER_NAME string = sqlDBModule.outputs.name

@description('Name of the SQL Database.')
output SQLDB_DATABASE string = sqlDbName

@description('Name of the managed identity used by the web app.')
output MANAGEDIDENTITY_WEBAPP_NAME string = userAssignedIdentity.outputs.name

@description('Client ID of the managed identity used by the web app.')
output MANAGEDIDENTITY_WEBAPP_CLIENTID string = userAssignedIdentity.outputs.clientId
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
output AZURE_COSMOSDB_ACCOUNT string = cosmosDb.outputs.name

@description('The name of the Azure Cosmos DB container for storing conversations.')
output AZURE_COSMOSDB_CONVERSATIONS_CONTAINER string = collectionName

@description('The name of the Azure Cosmos DB database.')
output AZURE_COSMOSDB_DATABASE string = cosmosDbDatabaseName

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
output SQLDB_USER_MID string = userAssignedIdentity.outputs.clientId

@description('Indicates whether the AI Project Client should be used.')
output USE_AI_PROJECT_CLIENT string = useAIProjectClientFlag

@description('Indicates whether the internal stream should be used.')
output USE_INTERNAL_STREAM string = useInternalStream

