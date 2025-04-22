param functionAppName string
var functionName = 'stream_openai_text'

resource existingFunctionApp 'Microsoft.Web/sites@2021-02-01' existing = {
  name: functionAppName
}

output functionAppUrl string = 'https://${existingFunctionApp.properties.defaultHostName}/api/${functionName}'
