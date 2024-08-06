@minLength(3)
@maxLength(15)
@description('Solution Name')
param solutionName string
param solutionLocation string

param searchServices_byc_cs_name string = '${ solutionName }-cs'

resource searchServices_byc_cs_name_resource 'Microsoft.Search/searchServices@2023-11-01' = {
  name: searchServices_byc_cs_name
  location: solutionLocation
  tags: {
    ProjectType: 'aoai-your-data-service'
  }
  sku: {
    name: 'basic'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    publicNetworkAccess: 'enabled'
    networkRuleSet: {
      ipRules: []
    }
    encryptionWithCmk: {
      enforcement: 'Unspecified'
    }
    disableLocalAuth: false
    authOptions: {
      apiKeyOnly: {}
    }
    semanticSearch: 'free'
  }
}

var searchServiceKey = searchServices_byc_cs_name_resource.listAdminKeys().primaryKey

output searchServiceOutput object = {
  searchServiceName:searchServices_byc_cs_name
  searchServiceAdminKey : searchServiceKey
  searchServiceEndpoint: 'https://${searchServices_byc_cs_name_resource.name}.search.windows.net'
}
