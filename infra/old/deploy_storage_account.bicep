// ========== Storage Account ========== //
targetScope = 'resourceGroup'

@description('Required. Deployment location for the solution.')
param solutionLocation string

@description('Required. Name of the storage account.')
param saName string

@description('Required. Object ID of the managed identity.')
param managedIdentityObjectId string

@description('Required. Name of the Azure Key Vault.')
param keyVaultName string

@description('Optional. Tags to be applied to the resources.')
param tags object = {}

resource storageAccounts_resource 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: saName
  location: solutionLocation
  sku: {
    name: 'Standard_LRS'
    tier: 'Standard'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    isHnsEnabled: true
    networkAcls: {
      bypass: 'AzureServices'
      virtualNetworkRules: []
      ipRules: []
      defaultAction: 'Allow'
    }
    supportsHttpsTrafficOnly: true
    encryption: {
      services: {
        file: {
          keyType: 'Account'
          enabled: true
        }
        blob: {
          keyType: 'Account'
          enabled: true
        }
      }
      keySource: 'Microsoft.Storage'
    }
    accessTier: 'Hot'
    allowSharedKeyAccess: false
  }
  tags : tags
}

resource storageAccounts_default 'Microsoft.Storage/storageAccounts/blobServices@2022-09-01' = {
  parent: storageAccounts_resource
  name: 'default'
  properties: {
    cors: {
      corsRules: []
    }
    deleteRetentionPolicy: {
      allowPermanentDelete: false
      enabled: false
    }
  }
}


resource storageAccounts_default_power_platform_dataflows 'Microsoft.Storage/storageAccounts/blobServices/containers@2022-09-01' = {
  parent: storageAccounts_default
  name: 'data'
  properties: {
    defaultEncryptionScope: '$account-encryption-key'
    denyEncryptionScopeOverride: false
    publicAccess: 'None'
  }
  dependsOn: [
    storageAccounts_resource
  ]
}

@description('This is the built-in Storage Blob Data Contributor.')
resource blobDataContributor 'Microsoft.Authorization/roleDefinitions@2018-01-01-preview' existing = {
  scope: resourceGroup()
  name: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, managedIdentityObjectId, blobDataContributor.id)
  properties: {
    principalId: managedIdentityObjectId
    roleDefinitionId:blobDataContributor.id
    principalType: 'ServicePrincipal' 
  }
}


//var storageAccountString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccounts_resource.name};AccountKey=${storageAccounts_resource.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = {
  name: keyVaultName
}

resource adlsAccountNameEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  parent: keyVault
  name: 'ADLS-ACCOUNT-NAME'
  properties: {
    value: saName
  }
  tags : tags
}

resource adlsAccountContainerEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  parent: keyVault
  name: 'ADLS-ACCOUNT-CONTAINER'
  properties: {
    value: 'data'
  }
  tags : tags
}

@description('Name of the storage account.')
output storageName string = saName

@description('Name of the default storage container.')
output storageContainer string = 'data'
