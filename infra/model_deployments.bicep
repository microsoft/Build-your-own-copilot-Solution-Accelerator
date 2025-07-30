param aiFoundryName string
param aiProjectName string = ''
param aiModelDeployments array = []

resource aiServices 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' existing = {
  name: aiFoundryName
}

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
}]

resource aiProject 'Microsoft.CognitiveServices/accounts/projects@2025-04-01-preview' existing = if (!empty(aiProjectName)) {
  name: aiProjectName
  parent: aiServices
}

output aiServices string = aiServices.identity.principalId
output aiProjectPrincipalId string = !empty(aiProjectName) ? aiProject.identity.principalId : ''
