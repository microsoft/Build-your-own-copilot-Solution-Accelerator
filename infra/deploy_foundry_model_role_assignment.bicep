@description('Optional. Principal ID to assign the role to.')
param principalId string = ''

@description('Required. ID of the role definition to assign.')
param roleDefinitionId string

@description('Optional. Name of the role assignment.')
param roleAssignmentName string = ''

@description('Required. Name of the AI Foundry resource.')
param aiFoundryName string

@description('Optional. Name of the AI project.')
param aiProjectName string = ''

@description('Optional. List of AI model deployments.')
param aiModelDeployments array = []

@description('Optional. Tags to be applied to the resources.')
param tags object = {}

resource aiServices 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' existing = {
  name: aiFoundryName
}

// Call the model deployments module
@batchSize(1)
resource aiServicesDeployments 'Microsoft.CognitiveServices/accounts/deployments@2025-04-01-preview' = [for aiModeldeployment in aiModelDeployments: if (!empty(aiModelDeployments)) {
  parent: aiServices
  name: aiModeldeployment.name
  properties: {
    model: {
      format: 'OpenAI'
      name: aiModeldeployment.model
    }
    raiPolicyName: aiModeldeployment.raiPolicyName
  }
  sku: {
    name: aiModeldeployment.sku.name
    capacity: aiModeldeployment.sku.capacity
  }
  tags : tags
}]

resource aiProject 'Microsoft.CognitiveServices/accounts/projects@2025-04-01-preview' existing = if (!empty(aiProjectName)) {
  name: aiProjectName
  parent: aiServices
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
@description('Principal ID of the AI Services resource.')
output aiServicesPrincipalId string = aiServices.identity.principalId

@description('Principal ID of the AI Project resource if defined.')
output aiProjectPrincipalId string = !empty(aiProjectName) ? aiProject.identity.principalId : ''
