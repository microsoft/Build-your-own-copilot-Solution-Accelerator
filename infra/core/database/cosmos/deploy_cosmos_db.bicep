@minLength(3)
@maxLength(15)
@description('Name of the solution.')
param solutionName string

@description('Deployment location for the solution.')
param solutionLocation string

@description('Name of the Cosmos DB account.')
param accountName string = '${solutionName}-cosmos'

@description('Name of the Cosmos DB database.')
param databaseName string = 'db_conversation_history'

@description('Name of the Cosmos DB container.')
param collectionName string = 'conversations'

@description('List of Cosmos DB containers to be created.')
param containers array = [
  {
    name: collectionName
    id: collectionName
    partitionKey: '/userId'
  }
]

@description('API kind of the Cosmos DB account.')
@allowed([ 'GlobalDocumentDB', 'MongoDB', 'Parse' ])
param kind string = 'GlobalDocumentDB'

@description('Resource tags to apply.')
param tags object = {}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2022-08-15' = {
  name: accountName
  kind: kind
  location: solutionLocation
  tags: tags
  properties: {
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [
      {
        locationName: solutionLocation
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    disableLocalAuth: true
    apiProperties: (kind == 'MongoDB') ? { serverVersion: '4.0' } : {}
    capabilities: [ { name: 'EnableServerless' } ]
  }
}


resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2022-05-15' = {
  name: '${accountName}/${databaseName}'
  properties: {
    resource: { id: databaseName }
  }

  resource list 'containers' = [for container in containers: {
    name: container.name
    properties: {
      resource: {
        id: container.id
        partitionKey: { paths: [ container.partitionKey ] }
      }
      options: {}
    }
  }]

  dependsOn: [
    cosmos
  ]
}

@description('Details of the Cosmos DB account, database, and container.')
output cosmosOutput object = {
  cosmosAccountName: cosmos.name
  cosmosDatabaseName: databaseName
  cosmosContainerName: collectionName
}

