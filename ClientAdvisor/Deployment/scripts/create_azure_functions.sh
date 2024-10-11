#!/bin/bash

# Variables
solutionName="$1"
solutionLocation="$2"
resourceGroupName="$3"
baseUrl="$4"
azureOpenAIApiKey="$5"
azureOpenAIApiVersion="$6"
azureOpenAIEndpoint="$7"
azureSearchAdminKey="$8"
azureSearchServiceEndpoint="$9"
azureSearchIndex="${10}"
sqlServerName="${11}"
sqlDbName="${12}"
sqlDbUser="${13}"
sqlDbPwd="${14}"

azureOpenAIDeploymentModel="gpt-4"
azureOpenAIEmbeddingDeployment="text-embedding-ada-002"

env_name=${solutionName}"env"
storageAccount=${solutionName}"fnstorage"
functionappname=${solutionName}"fn"
valueone="1"

# sqlDBConn="DRIVER={ODBC Driver 18 for SQL Server};SERVER="${sqlServerName}".database.windows.net;DATABASE="${sqlDbName}";UID="${sqlDbUser}";PWD="${sqlDbPwd}

#sqlDBConn="DRIVER={ODBC Driver 18 for SQL Server};SERVER=${sqlServerName}.database.windows.net;DATABASE=${sqlDbName};UID=${sqlDbUser};PWD=${sqlDbPwd}"
sqlDBConn="TBD"

az containerapp env create --name $env_name --enable-workload-profiles --resource-group $resourceGroupName --location $solutionLocation

az storage account create --name $storageAccount --location eastus --resource-group $resourceGroupName --sku Standard_LRS

az functionapp create --resource-group $resourceGroupName --name $functionappname \
                --environment $env_name --storage-account $storageAccount \
                --functions-version 4 --runtime python \
                --image bycwacontainerreg.azurecr.io/byc-wa-fn:latest

# Sleep for 120 seconds
echo "Waiting for 120 seconds to ensure the Function App is properly created..."
sleep 60

az functionapp config appsettings set --name $functionappname -g $resourceGroupName \
                --settings AZURE_OPEN_AI_API_KEY=$azureOpenAIApiKey AZURE_OPEN_AI_DEPLOYMENT_MODEL=$azureOpenAIDeploymentModel \
                AZURE_OPEN_AI_ENDPOINT=$azureOpenAIEndpoint AZURE_OPENAI_EMBEDDING_DEPLOYMENT=$azureOpenAIEmbeddingDeployment \
                OPENAI_API_VERSION=$azureOpenAIApiVersion \
                AZURE_AI_SEARCH_API_KEY=$azureSearchAdminKey AZURE_AI_SEARCH_ENDPOINT=$azureSearchServiceEndpoint \
                AZURE_SEARCH_INDEX=$azureSearchIndex \
                PYTHON_ENABLE_INIT_INDEXING=$valueone PYTHON_ISOLATE_WORKER_DEPENDENCIES=$valueone \
                SQLDB_CONNECTION_STRING=$sqlDBConn \
                SQLDB_SERVER=$sqlServerName SQLDB_DATABASE=$sqlDbName SQLDB_USERNAME=$sqlDbUser SQLDB_PASSWORD=$sqlDbPwd             