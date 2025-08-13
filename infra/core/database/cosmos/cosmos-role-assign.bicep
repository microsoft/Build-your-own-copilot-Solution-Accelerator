metadata description = 'Creates a SQL role assignment under an Azure Cosmos DB account.'

@description('Required. Name of the Azure Cosmos DB account.')
param accountName string

@description('Required. ID of the Cosmos DB SQL role definition.')
param roleDefinitionId string

@description('Otional. Principal ID to assign the role to.')
param principalId string = ''

resource role 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2022-05-15' = {
  parent: cosmos
  name: guid(roleDefinitionId, principalId, cosmos.id)
  properties: {
    principalId: principalId
    roleDefinitionId: roleDefinitionId
    scope: cosmos.id
  }
}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2022-08-15' existing = {
  name: accountName
}
