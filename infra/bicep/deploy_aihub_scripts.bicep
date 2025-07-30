// deploy_aihub_scripts_inline.bicep

@description('Specifies the location for resources (e.g. eastus, westus2).')
param solutionLocation string

@description('Base URL of your GitHub repository containing deployment scripts. Provided for compatibility; not used when scriptContent is specified.')
param baseUrl string

@description('Name of the Key Vault. Not used in this inline script but retained for future enhancements.')
param keyVaultName string

@description('Resource ID of the user‑assigned managed identity that will execute the deployment script.')
param identity string

@description('Solution prefix used to derive the hub and project names.')
param solutionName string

@description('Name of the resource group where the hub and project will be created.')
param resourceGroupName string

@description('ID of the subscription containing the resource group.')
param subscriptionId string

resource createHubAndProject 'Microsoft.Resources/deploymentScripts@2020-10-01' = {
  name: 'create_aihub'
  location: solutionLocation
  kind: 'AzureCLI'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity}': {}
    }
  }
  properties: {
    // Use a recent Azure CLI version that supports ML commands.
    azCliVersion: '2.70.0'

    // Inline Bash script using the Azure ML CLI to create the hub and project.
    scriptContent: '''
      #!/bin/bash
      set -euo pipefail

      # Map arguments ($1..$6) to variables.  baseUrl and keyVaultName are unused.
      baseUrl="$1"
      keyvaultName="$2"
      solutionName="$3"
      resourceGroupName="$4"
      subscriptionId="$5"
      solutionLocation="$6"

      # Ensure the Azure ML CLI extension is installed
      if ! az extension show --name ml &>/dev/null; then
        az extension add --name ml --yes
      fi

      az account set --subscription "$subscriptionId"
      az configure --defaults group="$resourceGroupName" location="$solutionLocation"

      hub_name="ai_hub_${solutionName}"
      project_name="ai_project_${solutionName}"

      echo "Creating AI hub '$hub_name'..."
      az ml workspace create --kind hub --name "$hub_name" --resource-group "$resourceGroupName" --location "$solutionLocation"

      hub_id=$(az ml workspace show --name "$hub_name" --resource-group "$resourceGroupName" --query id -o tsv)
      if [ -z "$hub_id" ]; then
        echo "Failed to retrieve hub ID. Exiting." >&2
        exit 1
      fi

      echo "Creating AI project '$project_name' in hub '$hub_name'..."
      az ml workspace create --kind project --hub-id "$hub_id" --name "$project_name" --resource-group "$resourceGroupName" --location "$solutionLocation"

      echo "Hub and project creation completed successfully."
    '''

    // Pass parameters as space-separated arguments to the script. These will be $1-$6.
    arguments: '${baseUrl} ${keyVaultName} ${solutionName} ${resourceGroupName} ${subscriptionId} ${solutionLocation}'

    // Keep the timeout at one hour.  The CLI operations normally complete within a few minutes.
    timeout: 'PT1H'
    retentionInterval: 'PT1H'
    cleanupPreference: 'OnSuccess'
  }
}
