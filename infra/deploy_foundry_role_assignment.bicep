param principalId string = ''
param roleDefinitionId string
param roleAssignmentName string = ''
param aiFoundryName string
param aiProjectName string = ''
param aiModelDeployments array = []


resource aiServices 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' existing = {
  name: aiFoundryName
}

// Call the model deployments module
module modelDeployments 'model_deployments.bicep' = {
  name: 'modelDeployments'
  params: {
    aiFoundryName: aiFoundryName
    aiProjectName: aiProjectName
    aiModelDeployments: aiModelDeployments
  }
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
output aiProjectPrincipalId string = !empty(aiProjectName) ? modelDeployments.outputs.aiProjectPrincipalId : ''
