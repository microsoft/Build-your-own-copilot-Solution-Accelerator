// ========== Key Vault ========== //
targetScope = 'resourceGroup'

@minLength(3)
@maxLength(15)
@description('Solution Name')
param solutionName string

@description('Solution Location')
param solutionLocation string

param identity string

@description('Name of App Service plan')
param HostingPlanName string = '${ solutionName }-app-service-plan'

@description('The pricing tier for the App Service plan')
@allowed(
  ['F1', 'D1', 'B1', 'B2', 'B3', 'S1', 'S2', 'S3', 'P1', 'P2', 'P3', 'P4']
)
param HostingPlanSku string = 'B1'

@description('Name of Web App')
param WebsiteName string = '${ solutionName }-app-service'

@description('Name of Application Insights')
param ApplicationInsightsName string = '${ solutionName }-app-insights'

@description('Name of Azure Search Service')
param AzureSearchService string = ''

@description('Name of Azure Search Index')
param AzureSearchIndex string = ''

@description('Name of Azure Search Articles Index')
param AzureSearchArticlesIndex string = ''

@description('Name of Azure Search Grants Index')
param AzureSearchGrantsIndex string = ''

@description('Name of Azure Search Drafts Index')
param AzureSearchDraftsIndex string = ''

@description('Azure Search Admin Key')
@secure()
param AzureSearchKey string = ''

@description('Use semantic search')
param AzureSearchUseSemanticSearch string = 'False'

@description('Semantic search config')
param AzureSearchSemanticSearchConfig string = 'default'

@description('Is the index prechunked')
param AzureSearchIndexIsPrechunked string = 'False'

@description('Top K results')
param AzureSearchTopK string = '5'

@description('Enable in domain')
param AzureSearchEnableInDomain string = 'False'

@description('Content columns')
param AzureSearchContentColumns string = 'content'

@description('Filename column')
param AzureSearchFilenameColumn string = 'filename'

@description('Title column')
param AzureSearchTitleColumn string = 'title'

@description('Url column')
param AzureSearchUrlColumn string = 'url'

@description('Name of Azure OpenAI Resource')
param AzureOpenAIResource string

@description('Azure OpenAI Model Deployment Name')
param AzureOpenAIModel string

@description('Azure OpenAI Model Name')
param AzureOpenAIModelName string = 'gpt-35-turbo'

@description('Azure Open AI Endpoint')
param AzureOpenAIEndpoint string = ''

@description('Azure OpenAI Key')
@secure()
param AzureOpenAIKey string

@description('Azure OpenAI Temperature')
param AzureOpenAITemperature string = '0'

@description('Azure OpenAI Top P')
param AzureOpenAITopP string = '1'

@description('Azure OpenAI Max Tokens')
param AzureOpenAIMaxTokens string = '1000'

@description('Azure OpenAI Stop Sequence')
param AzureOpenAIStopSequence string = '\n'

@description('Azure OpenAI System Message')
param AzureOpenAISystemMessage string = 'You are an AI assistant that helps people find information.'

@description('Azure OpenAI Api Version')
param AzureOpenAIApiVersion string = '2023-12-01-preview'

@description('Whether or not to stream responses from Azure OpenAI')
param AzureOpenAIStream string = 'True'

@description('Azure Search Query Type')
@allowed(
  ['simple', 'semantic', 'vector', 'vectorSimpleHybrid', 'vectorSemanticHybrid']
)
param AzureSearchQueryType string = 'vectorSemanticHybrid'

@description('Azure Search Vector Fields')
param AzureSearchVectorFields string = ''

@description('Azure Search Permitted Groups Field')
param AzureSearchPermittedGroupsField string = ''

@description('Azure Search Strictness')
@allowed(['1', '2', '3', '4', '5'])
param AzureSearchStrictness string = '3'

@description('Azure OpenAI Embedding Deployment Name')
param AzureOpenAIEmbeddingName string = ''

@description('Azure Open AI Embedding Key')
param AzureOpenAIEmbeddingkey string = ''

@description('Azure Open AI Embedding Endpoint')
param AzureOpenAIEmbeddingEndpoint string = ''

@description('Enable chat history by deploying a Cosmos DB instance')
param WebAppEnableChatHistory string = 'False'


@description('Azure AI Studio Chat Flow Endpoint')
param AIStudioChatFlowEndpoint string = ''

@description('Azure AI Studio Chat Flow Key')
param AIStudioChatFlowAPIKey string = ''


@description('Azure AI Studio Chat Flow Deployment Name')
param AIStudioChatFlowDeploymentName string = ''

@description('Azure AI Studio Draft Flow Endpoint')
param AIStudioDraftFlowEndpoint string = ''


@description('Azure AI Studio Draft Flow Key')
param AIStudioDraftFlowAPIKey string = ''

@description('Azure AI Studio Draft Flow Deployment Name')
param AIStudioDraftFlowDeploymentName string = ''

@description('Use Azure AI Studio')
param AIStudioUse string = 'False'


var WebAppImageName = 'DOCKER|byoaiacontainer.azurecr.io/byoaia-app:latest'

resource HostingPlan 'Microsoft.Web/serverfarms@2020-06-01' = {
  name: HostingPlanName
  location: resourceGroup().location
  sku: {
    name: HostingPlanSku
  }
  properties: {
    name: HostingPlanName
    reserved: true
  }
  kind: 'linux'
}

resource Website 'Microsoft.Web/sites@2020-06-01' = {
  name: WebsiteName
  location: resourceGroup().location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: HostingPlanName
    siteConfig: {
      appSettings: [
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: reference(ApplicationInsights.id, '2015-05-01').InstrumentationKey
        }
        {
          name: 'AZURE_SEARCH_SERVICE'
          value: AzureSearchService
        }
        {
          name: 'AZURE_SEARCH_INDEX_ARTICLES'
          value: AzureSearchArticlesIndex
        }
        {
          name: 'AZURE_SEARCH_INDEX_GRANTS'
          value: AzureSearchGrantsIndex
        }
        {
          name: 'AZURE_SEARCH_INDEX_DRAFTS'
          value: AzureSearchDraftsIndex
        }
        {
          name: 'AZURE_SEARCH_INDEX'
          value: AzureSearchIndex
        }
        {
          name: 'AZURE_SEARCH_KEY'
          value: AzureSearchKey
        }
        {
          name: 'AZURE_SEARCH_USE_SEMANTIC_SEARCH'
          value: AzureSearchUseSemanticSearch
        }
        {
          name: 'AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG'
          value: AzureSearchSemanticSearchConfig
        }
        {
          name: 'AZURE_SEARCH_INDEX_IS_PRECHUNKED'
          value: AzureSearchIndexIsPrechunked
        }
        {
          name: 'AZURE_SEARCH_TOP_K'
          value: AzureSearchTopK
        }
        {
          name: 'AZURE_SEARCH_ENABLE_IN_DOMAIN'
          value: AzureSearchEnableInDomain
        }
        {
          name: 'AZURE_SEARCH_CONTENT_COLUMNS'
          value: AzureSearchContentColumns
        }
        {
          name: 'AZURE_SEARCH_FILENAME_COLUMN'
          value: AzureSearchFilenameColumn
        }
        {
          name: 'AZURE_SEARCH_TITLE_COLUMN'
          value: AzureSearchTitleColumn
        }
        {
          name: 'AZURE_SEARCH_URL_COLUMN'
          value: AzureSearchUrlColumn
        }
        {
          name: 'AZURE_OPENAI_RESOURCE'
          value: AzureOpenAIResource
        }
        {
          name: 'AZURE_OPENAI_MODEL'
          value: AzureOpenAIModel
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: AzureOpenAIEndpoint
        }
        {
          name: 'AZURE_OPENAI_KEY'
          value: AzureOpenAIKey
        }
        {
          name: 'AZURE_OPENAI_MODEL_NAME'
          value: AzureOpenAIModelName
        }
        {
          name: 'AZURE_OPENAI_TEMPERATURE'
          value: AzureOpenAITemperature
        }
        {
          name: 'AZURE_OPENAI_TOP_P'
          value: AzureOpenAITopP
        }
        {
          name: 'AZURE_OPENAI_MAX_TOKENS'
          value: AzureOpenAIMaxTokens
        }
        {
          name: 'AZURE_OPENAI_STOP_SEQUENCE'
          value: AzureOpenAIStopSequence
        }
        {
          name: 'AZURE_OPENAI_SYSTEM_MESSAGE'
          value: AzureOpenAISystemMessage
        }
        {
          name: 'AZURE_OPENAI_PREVIEW_API_VERSION'
          value: AzureOpenAIApiVersion
        }
        {
          name: 'AZURE_OPENAI_STREAM'
          value: AzureOpenAIStream
        }
        {
          name: 'AZURE_SEARCH_QUERY_TYPE'
          value: AzureSearchQueryType
        }
        {
          name: 'AZURE_SEARCH_VECTOR_COLUMNS'
          value: AzureSearchVectorFields
        }
        {
          name: 'AZURE_SEARCH_PERMITTED_GROUPS_COLUMN'
          value: AzureSearchPermittedGroupsField
        }
        {
          name: 'AZURE_SEARCH_STRICTNESS'
          value: AzureSearchStrictness
        }
        {
          name: 'AZURE_OPENAI_EMBEDDING_NAME'
          value: AzureOpenAIEmbeddingName
        }

        {
          name: 'AZURE_OPENAI_EMBEDDING_KEY'
          value: AzureOpenAIEmbeddingkey
        }

        {
          name: 'AZURE_OPENAI_EMBEDDING_ENDPOINT'
          value: AzureOpenAIEmbeddingEndpoint
        }
          
        {
          name: 'WEB_APP_ENABLE_CHAT_HISTORY'
          value: WebAppEnableChatHistory
        }

        // {
        //   name: 'AI_STUDIO_CHAT_FLOW_ENDPOINT'
        //   value: AIStudioChatFlowEndpoint
        // }

        // {
        //   name: 'AI_STUDIO_CHAT_FLOW_API_KEY'
        //   value: AIStudioChatFlowAPIKey
        // }

        // {
        //   name: 'AI_STUDIO_CHAT_FLOW_DEPLOYMENT_NAME'
        //   value: AIStudioChatFlowDeploymentName
        // }

        {
          name: 'AI_STUDIO_DRAFT_FLOW_ENDPOINT'
          value: AIStudioDraftFlowEndpoint
        }

        {
          name: 'AI_STUDIO_DRAFT_FLOW_API_KEY'
          value: AIStudioDraftFlowAPIKey
        }

        {
          name: 'AI_STUDIO_DRAFT_FLOW_DEPLOYMENT_NAME'
          value: AIStudioDraftFlowDeploymentName
        }
 
        {
          name: 'USE_AZURE_AI_STUDIO'
          value: AIStudioUse
        }

        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'UWSGI_PROCESSES'
          value: '2'
        }
        {
          name: 'UWSGI_THREADS'
          value: '2'
        }
      ]
      linuxFxVersion: WebAppImageName
    }
  }
  dependsOn: [HostingPlan]
}

resource ApplicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: ApplicationInsightsName
  location: resourceGroup().location
  tags: {
    'hidden-link:${resourceId('Microsoft.Web/sites',ApplicationInsightsName)}': 'Resource'
  }
  properties: {
    Application_Type: 'web'
  }
  kind: 'web'
}

