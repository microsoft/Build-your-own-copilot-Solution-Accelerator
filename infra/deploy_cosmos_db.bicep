
@minLength(3)
@maxLength(20)
@description('Solution location.')
param solutionLocation string

@description('Name of the Azure Cosmos DB account.')
param cosmosDBName string

@description('Name of the Cosmos DB database.')
param databaseName string = 'db_conversation_history'

@description('Name of the Cosmos DB container (collection).')
param collectionName string = 'conversations'

@description('List of Cosmos DB containers to be created.')
param containers array = [
  {
    name: collectionName
    id: collectionName
    partitionKey: '/userId'
  }
]

@description('The API kind of the Cosmos DB account.')
@allowed([ 'GlobalDocumentDB', 'MongoDB', 'Parse' ])
param kind string = 'GlobalDocumentDB'

@description('Optional. Tags to be applied to the resources.')
param tags object = {}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2022-08-15' = {
  name: cosmosDBName
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
  name: '${cosmosDBName}/${databaseName}'
  properties: {
    resource: { id: databaseName }
  }
 tags: tags
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
@description('Name of the Cosmos DB account.')
output cosmosAccountName string = cosmos.name

@description('Name of the Cosmos DB database.')
output cosmosDatabaseName string = databaseName

@description('Name of the Cosmos DB container.')
output cosmosContainerName string = collectionName
