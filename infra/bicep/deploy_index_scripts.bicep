@description('Required. Specifies the location for resources.')
param solutionLocation string 

@description('Required. Contains the Base URL.')
param baseUrl string

@description('Required. Contains KeyVault Name.')
param keyVaultName string

@description('Required. Contains ID of ManagedIdentity.')
param identity string

resource create_index 'Microsoft.Resources/deploymentScripts@2020-10-01' = {
  kind:'AzureCLI'
  name: 'create_search_indexes'
  location: solutionLocation // Replace with your desired location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity}' : {}
    }
  }
  properties: {
    azCliVersion: '2.52.0'
    primaryScriptUri: '${baseUrl}infra/scripts/run_create_index_scripts.sh' 
    arguments: '${baseUrl} ${keyVaultName}' // Specify any arguments for the script
    timeout: 'PT1H' // Specify the desired timeout duration
    retentionInterval: 'PT1H' // Specify the desired retention interval
    cleanupPreference:'OnSuccess'
  }
}
