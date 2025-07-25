param principalId string = ''
param roleDefinitionId string
param roleAssignmentName string = ''
param aiFoundryName string
param aiProjectName string = ''
param aiModelDeployments array = []
param aiLocation string=''
param aiKind string=''
param aiSkuName string=''
param customSubDomainName string = ''
param publicNetworkAccess string = ''
param defaultNetworkAction string = ''
param aiServicesName string
param vnetRules array = []
param ipRules array = []
param enableSystemAssignedIdentity bool = false


resource aiServices 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' existing = {
  name: aiFoundryName
}

resource aiServicesWithIdentity 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' = if (enableSystemAssignedIdentity) {
  name: aiServicesName
  location: aiLocation
  kind: aiKind
  sku: {
    name: aiSkuName
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    allowProjectManagement: true
    customSubDomainName: customSubDomainName 
    networkAcls: {
      defaultAction: defaultNetworkAction
      virtualNetworkRules: vnetRules
      ipRules: ipRules
    }
    publicNetworkAccess: publicNetworkAccess

  }
}

@batchSize(1)
resource aiServicesDeployments 'Microsoft.CognitiveServices/accounts/deployments@2025-04-01-preview' = [for aiModeldeployment in aiModelDeployments: if (!empty(aiModelDeployments)) {
  parent: aiServicesWithIdentity
  name: aiModeldeployment.name
  properties: {
    model: {
      format: 'OpenAI'
      name: aiModeldeployment.model
    }
    raiPolicyName: aiModeldeployment.raiPolicyName
  }
  sku:{
    name: aiModeldeployment.sku.name
    capacity: aiModeldeployment.sku.capacity
  }
}]

resource aiProject 'Microsoft.CognitiveServices/accounts/projects@2025-04-01-preview' existing = if (!empty(aiProjectName)) {
  name: aiProjectName
  parent: aiServices
}


resource aiProjectWithIdentity 'Microsoft.CognitiveServices/accounts/projects@2025-04-01-preview' = if (!empty(aiProjectName) && enableSystemAssignedIdentity) {
  name: aiProjectName
  parent: aiServicesWithIdentity
  location: aiLocation
  identity: {
    type: 'SystemAssigned'
  }
  properties: {}
}

resource roleAssignmentToFoundry 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: roleAssignmentName
  scope: aiServices
  properties: {
    roleDefinitionId: roleDefinitionId
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

output aiServicesPrincipalId string = aiServices.identity.principalId
output aiProjectPrincipalId string = !empty(aiProjectName) ? aiProject.identity.principalId : ''
