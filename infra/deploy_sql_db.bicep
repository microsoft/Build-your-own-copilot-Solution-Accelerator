@description('Required. Deployment location for the solution.')
param solutionLocation string

@description('Required. Name of the Azure Key Vault.')
param keyVaultName string

@description('Required. Object ID of the managed identity.')
param managedIdentityObjectId string

@description('Required. Name of the managed identity.')
param managedIdentityName string

@description('Required. The name of the SQL logical server.')
param serverName string

@description('Required. The name of the SQL Database.')
param sqlDBName string

@description('Required. Location for all resources.')
param location string = solutionLocation

@description('Optional. Tags to be applied to the resources.')
param tags object = {}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: serverName
  location: location
  kind:'v12.0'
  properties: {
      publicNetworkAccess: 'Enabled'
      version: '12.0'
      restrictOutboundNetworkAccess: 'Disabled'
      minimalTlsVersion: '1.2'
      administrators: {
        login: managedIdentityName
        sid: managedIdentityObjectId
        tenantId: subscription().tenantId
        administratorType: 'ActiveDirectory'
        azureADOnlyAuthentication: true
      }
    }
    tags: tags
}

resource firewallRule 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  name: 'AllowSpecificRange'
  parent: sqlServer
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
}

resource AllowAllWindowsAzureIps 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  name: 'AllowAllWindowsAzureIps'
  parent: sqlServer
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource sqlDB 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: sqlDBName
  location: location
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 2
  }
  kind:'v12.0,user,vcore,serverless'
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    autoPauseDelay:60
    minCapacity:1
    readScale: 'Disabled'
    zoneRedundant: false
  }
   tags: tags
}

resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = {
  name: keyVaultName
}

resource sqldbServerEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  parent: keyVault
  name: 'SQLDB-SERVER'
  properties: {
    value: '${serverName}.database.windows.net'
  }
   tags: tags
}

resource sqldbDatabaseEntry 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  parent: keyVault
  name: 'SQLDB-DATABASE'
  properties: {
    value: sqlDBName
  }
   tags: tags
}
@description('Name of the SQL logical server.')
output sqlServerName string = serverName

@description('Name of the SQL database.')
output sqlDbName string = sqlDBName
// output sqlDbUser string = administratorLogin
