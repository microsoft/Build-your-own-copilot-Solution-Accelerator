@description('Specifies the location for resources.')
param solutionLocation string 

param baseUrl string
param keyVaultName string
param identity string
param solutionName string
param resourceGroupName string
param subscriptionId string

resource create_index 'Microsoft.Resources/deploymentScripts@2020-10-01' = {
  kind:'AzureCLI'
  name: 'create_aihub'
  location: solutionLocation // Replace with your desired location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity}' : {}
    }
  }
  properties: {
    azCliVersion: '2.52.0'
    primaryScriptUri: '${baseUrl}Deployment/scripts/run_create_aihub_scripts.sh' 
    arguments: '${baseUrl} ${keyVaultName} ${solutionName} ${resourceGroupName} ${subscriptionId} ${solutionLocation}' // Specify any arguments for the script
    timeout: 'PT1H' // Specify the desired timeout duration
    retentionInterval: 'PT1H' // Specify the desired retention interval
    cleanupPreference:'OnSuccess'
  }
}
