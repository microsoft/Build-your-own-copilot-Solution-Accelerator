@minLength(3)
@maxLength(15)
@description('Solution Name')
param solutionName string
param solutionLocation string

param accounts_byc_openai_name string = '${ solutionName }-openai'

resource accounts_byc_openai_name_resource 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: accounts_byc_openai_name
  location: solutionLocation
  sku: {
    name: 'S0'
  }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: accounts_byc_openai_name
    networkAcls: {
      defaultAction: 'Allow'
      virtualNetworkRules: []
      ipRules: []
    }
    publicNetworkAccess: 'Enabled'
  }
}

// resource accounts_byc_openai_name_gpt_35_turbo 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
//   parent: accounts_byc_openai_name_resource
//   name: 'gpt-35-turbo-16k'
//   sku: {
//     name: 'Standard'
//     capacity: 30
//   }
//   properties: {
//     model: {
//       format: 'OpenAI'
//       name: 'gpt-35-turbo-16k'
//       version: '0613'
//     }
//     versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
//     raiPolicyName: 'Microsoft.Default'
//   }
//   dependsOn:[accounts_byc_openai_name_resource]
// }

resource accounts_byc_openai_name_gpt_4 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: accounts_byc_openai_name_resource
  name: 'gpt-4'
  sku: {
    name: 'Standard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4'
      version: '0125-Preview'
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
    raiPolicyName: 'Microsoft.Default'
  }
}

resource accounts_byc_openai_name_text_embedding_ada_002 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: accounts_byc_openai_name_resource
  name: 'text-embedding-ada-002'
  sku: {
    name: 'Standard'
    capacity: 45
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-ada-002'
      version: '2'
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
    raiPolicyName: 'Microsoft.Default'
  }
  dependsOn:[accounts_byc_openai_name_gpt_4]
}

var openaiKey = accounts_byc_openai_name_resource.listKeys().key1

output openAIOutput object = {
openAPIKey : openaiKey
openAPIVersion:accounts_byc_openai_name_resource.apiVersion
openAPIEndpoint: accounts_byc_openai_name_resource.properties.endpoint
openAIAccountName:accounts_byc_openai_name
}
