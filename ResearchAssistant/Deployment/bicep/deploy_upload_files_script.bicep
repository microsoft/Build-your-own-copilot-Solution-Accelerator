@description('Specifies the location for resources.')
param solutionLocation string 

param storageAccountName string

param containerName string
param identity string
param baseUrl string

resource copy_demo_Data 'Microsoft.Resources/deploymentScripts@2020-10-01' = {
  kind:'AzureCLI'
  name: 'copy_demo_Data'
  location: solutionLocation // Replace with your desired location
  identity:{
    type:'UserAssigned'
    userAssignedIdentities: {
      '${identity}' : {}
    }
  }
  properties: {
    azCliVersion: '2.50.0'
    primaryScriptUri: '${baseUrl}ResearchAssistant/Deployment/scripts/copy_kb_files.sh' // deploy-azure-synapse-pipelines.sh
    arguments: '${storageAccountName} ${containerName} ${baseUrl}' // Specify any arguments for the script
    timeout: 'PT1H' // Specify the desired timeout duration
    retentionInterval: 'PT1H' // Specify the desired retention interval
    cleanupPreference:'OnSuccess'
  }
}
