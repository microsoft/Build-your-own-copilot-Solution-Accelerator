// ========== Key Vault ========== //
targetScope = 'resourceGroup'

@description('Required. Solution Name')
param solutionName string

@description('Required. Solution Location')
param solutionLocation string

@description('Optional. Current UTC timestamp.')
param utc string = utcNow()

@description('Required. Name of the Azure Key Vault.')
param kvName string

@description('Optional. Specifies the create mode for the resource.')
param createMode string = 'default'

@description('Optional. Enabled For Deployment. Property to specify whether Azure Virtual Machines are permitted to retrieve certificates stored as secrets from the key vault.')
param enableForDeployment bool = true

@description('Optional. Enabled For Disk Encryption. Property to specify whether Azure Disk Encryption is permitted to retrieve secrets from the vault and unwrap keys.')
param enableForDiskEncryption bool = true

@description('Optional. Enabled For Template Deployment. Property to specify whether Azure Resource Manager is permitted to retrieve secrets from the key vault.')
param enableForTemplateDeployment bool = true

@description('Optional. Enable RBAC Authorization. Property that controls how data actions are authorized.')
param enableRBACAuthorization bool = true

@description('Optional. Soft Delete Retention in Days. softDelete data retention days. It accepts >=7 and <=90.')
param softDeleteRetentionInDays int = 7

@description('Optional. Public Network Access, Property to specify whether the vault will accept traffic from public internet.')
@allowed([
  'enabled'
  'disabled'
])
param publicNetworkAccess string = 'enabled'

@description('Optional. SKU')
@allowed([
  'standard'
  'premium'
])
param sku string = 'standard'

@description('Optional. Vault URI. The URI of the vault for performing operations on keys and secrets.')
var vaultUri = 'https://${ kvName }.vault.azure.net/'

@description('Required. Object ID of the managed identity.')
param managedIdentityObjectId string

@description('Optional. Tags to be applied to the resources.')
param tags object = {}

resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: kvName
  location: solutionLocation
  tags: {
    ...tags
    app: solutionName
    location: solutionLocation
  }
  properties: {
    accessPolicies: [
      {        
        objectId: managedIdentityObjectId        
        permissions: {
          certificates: [
            'all'
          ]
          keys: [
            'all'
          ]
          secrets: [
            'all'
          ]
          storage: [
            'all'
          ]
        }
        tenantId: subscription().tenantId
      }
    ]
    createMode: createMode
    enabledForDeployment: enableForDeployment
    enabledForDiskEncryption: enableForDiskEncryption
    enabledForTemplateDeployment: enableForTemplateDeployment
    enableRbacAuthorization: enableRBACAuthorization
    softDeleteRetentionInDays: softDeleteRetentionInDays
    provisioningState: 'RegisteringDns'
    publicNetworkAccess: publicNetworkAccess
    sku: {
      family: 'A'
      name: sku
    }    
    tenantId: subscription().tenantId
    vaultUri: vaultUri
  }
}

@description('This is the built-in Key Vault Administrator role.')
resource kvAdminRole 'Microsoft.Authorization/roleDefinitions@2018-01-01-preview' existing = {
  scope: resourceGroup()
  name: '00482a5a-887f-4fb3-b363-3b7fe8e74483'
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, managedIdentityObjectId, kvAdminRole.id)
  properties: {
    principalId: managedIdentityObjectId
    roleDefinitionId:kvAdminRole.id
    principalType: 'ServicePrincipal' 
  }
}

@description('Name of the Key Vault.')
output keyvaultName string = keyVault.name

@description('Resource ID of the Key Vault.')
output keyvaultId string = keyVault.id

