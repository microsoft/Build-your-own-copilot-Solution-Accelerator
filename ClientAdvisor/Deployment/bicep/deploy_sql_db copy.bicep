@minLength(3)
@maxLength(15)
@description('Solution Name')
param solutionName string
param solutionLocation string
param managedIdentityObjectId string

@description('The name of the SQL logical server.')
param serverName string = '${ solutionName }-sql-server'

@description('The name of the SQL Database.')
param sqlDBName string = '${ solutionName }-sql-db'

@description('Location for all resources.')
param location string = solutionLocation

@description('The administrator username of the SQL logical server.')
param administratorLogin string = 'sqladmin'

@description('The administrator password of the SQL logical server.')
@secure()
param administratorLoginPassword string = 'TestPassword_1234'

resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: serverName
  location: location
  properties: {
      administratorLogin: administratorLogin
      administratorLoginPassword: administratorLoginPassword
      publicNetworkAccess: 'Enabled'
    }
}

resource firewallRule 'Microsoft.Sql/servers/firewallRules@2022-02-01-preview' = {
  name: 'AllowSpecificRange'
  parent: sqlServer
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
}

resource sqlDB 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  parent: sqlServer
  name: sqlDBName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
}


output sqlDbOutput object = {
  sqlServerName: '${serverName}.database.windows.net' 
  sqlDbName: sqlDBName
  sqlDbUser: administratorLogin
  sqlDbPwd: administratorLoginPassword
}
