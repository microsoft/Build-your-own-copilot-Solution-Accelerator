@description('Specifies the location for resources.')
param baseUrl string
param solutionLocation string
param subscriptionId string
param solutionName string
param keyVaultName string
param identity string
param resourceGroupName string

resource create_index 'Microsoft.Resources/deploymentScripts@2020-10-01' = {
  kind:'AzureCLI'
  name: 'create_ai_hub'
  location: solutionLocation // Replace with your desired location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity}' : {}
    }
  }
  properties: {
    azCliVersion: '2.52.0'
    primaryScriptUri: '${baseUrl}Deployment/scripts/run_ai_hub_scripts.sh' 
    arguments: '${baseUrl} ${solutionLocation} ${subscriptionId} ${solutionName} ${keyVaultName} ${resourceGroupName}' // Specify any arguments for the script
    timeout: 'PT1H' // Specify the desired timeout duration
    retentionInterval: 'PT1H' // Specify the desired retention interval
    cleanupPreference:'OnSuccess'
  }
}


