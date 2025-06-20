using './main.bicep'

param environmentName = readEnvironmentVariable('AZURE_ENV_NAME', 'byocatemplate')
param cosmosLocation = readEnvironmentVariable('AZURE_ENV_COSMOS_LOCATION', 'eastus2')
param deploymentType = readEnvironmentVariable('AZURE_ENV_MODEL_DEPLOYMENT_TYPE', 'GlobalStandard')
param gptModelName = readEnvironmentVariable('AZURE_ENV_MODEL_NAME', 'gpt-4o-mini')
param azureOpenaiAPIVersion = readEnvironmentVariable('AZURE_ENV_MODEL_VERSION', '2025-04-01-preview')
param gptDeploymentCapacity = int(readEnvironmentVariable('AZURE_ENV_MODEL_CAPACITY', '30'))
param embeddingModel = readEnvironmentVariable('AZURE_ENV_EMBEDDING_MODEL_NAME', 'text-embedding-ada-002')
param embeddingDeploymentCapacity = int(readEnvironmentVariable('AZURE_ENV_EMBEDDING_MODEL_CAPACITY', '80'))
param imageTag = readEnvironmentVariable('AZURE_ENV_IMAGETAG', 'latest')
// param aideploymentlocation = readEnvironmentVariable('AZURE_ENV_OPENAI_LOCATION', 'eastus2')
param AZURE_LOCATION = readEnvironmentVariable('AZURE_LOCATION', '')
param existingLogAnalyticsWorkspaceId = readEnvironmentVariable('AZURE_ENV_LOG_ANALYTICS_WORKSPACE_ID', '')
