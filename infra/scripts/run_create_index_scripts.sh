#!/bin/bash

# Variables
keyvaultName="$1"
baseUrl="$2"
managedIdentityClientId="$3"
resourceGroupName="$4"
sqlServerName="$5"
aiSearchName="$6"
aif_resource_id="$7"

echo "Script Started"

# Authenticate with Azure
if az account show &> /dev/null; then
    echo "Already authenticated with Azure."
else
    echo "Not authenticated with Azure. Attempting to authenticate..."
    if [ -n "$managedIdentityClientId" ]; then
        # Use managed identity if running in Azure
        echo "Authenticating with Managed Identity..."
        az login --identity --client-id ${managedIdentityClientId}
    else
        # Use Azure CLI login if running locally
        echo "Authenticating with Azure CLI..."
        az login
    fi
fi

# Get signed in user and store the output
echo "Getting signed in user id and display name"
signed_user=$(az ad signed-in-user show --query "{id:id, displayName:displayName}" -o json)

# Extract id and displayName using grep and sed
signed_user_id=$(echo "$signed_user" | grep -oP '"id":\s*"\K[^"]+')
signed_user_display_name=$(echo "$signed_user" | grep -oP '"displayName":\s*"\K[^"]+')

if [ $? -ne 0 ]; then
    if [ -z "$managedIdentityClientId" ]; then
        echo "Error: Failed to get signed in user id."
        exit 1
    else
        signed_user_id=$managedIdentityClientId
        signed_user_display_name=$(az ad sp show --id "$signed_user_id" --query displayName -o tsv)
    fi
fi

### Assign Key Vault Administrator role to the signed in user ###

echo "Getting key vault resource id"
key_vault_resource_id=$(az keyvault show --name $keyvaultName --query id --output tsv)

# Check if the user has the Key Vault Administrator role
echo "Checking if user has the Key Vault Administrator role"
role_assignment=$(MSYS_NO_PATHCONV=1 az role assignment list --assignee $signed_user_id --role "Key Vault Administrator" --scope $key_vault_resource_id --query "[].roleDefinitionId" -o tsv)
if [ -z "$role_assignment" ]; then
    echo "User does not have the Key Vault Administrator role. Assigning the role."
    MSYS_NO_PATHCONV=1 az role assignment create --assignee $signed_user_id --role "Key Vault Administrator" --scope $key_vault_resource_id --output none
    if [ $? -eq 0 ]; then
        echo "Key Vault Administrator role assigned successfully."
    else
        echo "Failed to assign Key Vault Administrator role."
        exit 1
    fi
else
    echo "User already has the Key Vault Administrator role."
fi

### Assign Azure AI User role to the signed in user ###

# Check if the user has the Azure AI User role
echo "Checking if user has the Azure AI User role"
role_assignment=$(MSYS_NO_PATHCONV=1 az role assignment list --role 53ca6127-db72-4b80-b1b0-d745d6d5456d --scope $aif_resource_id --assignee $signed_user_id --query "[].roleDefinitionId" -o tsv)
if [ -z "$role_assignment" ]; then
    echo "User does not have the Azure AI User role. Assigning the role."
    MSYS_NO_PATHCONV=1 az role assignment create --assignee $signed_user_id --role 53ca6127-db72-4b80-b1b0-d745d6d5456d --scope $aif_resource_id --output none
    if [ $? -eq 0 ]; then
        echo "Azure AI User role assigned successfully."
    else
        echo "Failed to assign Azure AI User role."
        exit 1
    fi
else
    echo "User already has the Azure AI User role."
fi


### Assign Search Index Data Contributor role to the signed in user ###

echo "Getting Azure Search resource id"
search_resource_id=$(az search service show --name $aiSearchName --resource-group $resourceGroupName --query id --output tsv)

# Check if the user has the Search Index Data Contributor role
echo "Checking if user has the Search Index Data Contributor role"
role_assignment=$(MSYS_NO_PATHCONV=1 az role assignment list --assignee $signed_user_id --role 8ebe5a00-799e-43f5-93ac-243d3dce84a7 --scope $search_resource_id --query "[].roleDefinitionId" -o tsv)
if [ -z "$role_assignment" ]; then
    echo "User does not have the Search Index Data Contributor role. Assigning the role."
    MSYS_NO_PATHCONV=1 az role assignment create --assignee $signed_user_id --role 8ebe5a00-799e-43f5-93ac-243d3dce84a7 --scope $search_resource_id --output none
    if [ $? -eq 0 ]; then
        echo "Search Index Data Contributor role assigned successfully."
    else
        echo "Failed to assign Search Index Data Contributor role."
        exit 1
    fi
else
    echo "User already has the Search Index Data Contributor role."
fi


### Assign signed in user as SQL Server Admin ###

echo "Getting Azure SQL Server resource id"
sql_server_resource_id=$(az sql server show --name $sqlServerName --resource-group $resourceGroupName --query id --output tsv)

# Check if the user is Azure SQL Server Admin
echo "Checking if user is Azure SQL Server Admin"
admin=$(MSYS_NO_PATHCONV=1 az sql server ad-admin list --ids $sql_server_resource_id --query "[?sid == '$signed_user_id']" -o tsv)

# Check if the role exists
if [ -n "$admin" ]; then
    echo "User is already Azure SQL Server Admin"
else
    echo "User is not Azure SQL Server Admin. Assigning the role."
    MSYS_NO_PATHCONV=1 az sql server ad-admin create --display-name "$signed_user_display_name" --object-id $signed_user_id --resource-group $resourceGroupName --server $sqlServerName --output none
    if [ $? -eq 0 ]; then
        echo "Assigned user as Azure SQL Server Admin."
    else
        echo "Failed to assign Azure SQL Server Admin role."
        exit 1
    fi
fi

# echo "Getting signed in user id"
# signed_user_id=$(az ad signed-in-user show --query id -o tsv)

# RUN apt-get update
# RUN apt-get install python3 python3-dev g++ unixodbc-dev unixodbc libpq-dev
# apk add python3 python3-dev g++ unixodbc-dev unixodbc libpq-dev
 
# # RUN apt-get install python3 python3-dev g++ unixodbc-dev unixodbc libpq-dev
# pip install pyodbc

pythonScriptPath="infra/scripts/index_scripts/"

# Check if running in Azure Container App
if [ -n "$baseUrl" ] && [ -n "$managedIdentityClientId" ]; then
    requirementFile="requirements.txt"
    requirementFileUrl=${baseUrl}${pythonScriptPath}"requirements.txt"

    # Download the create_index and create table python files
    curl --output "create_search_index.py" ${baseUrl}${pythonScriptPath}"create_search_index.py"
    curl --output "create_sql_tables.py" ${baseUrl}${pythonScriptPath}"create_sql_tables.py"

    # Download the requirement file
    curl --output "$requirementFile" "$requirementFileUrl"

    pythonScriptPath=""

    echo "Download completed"

fi


# Replace key vault name 
sed -i "s/kv_to-be-replaced/${keyvaultName}/g" ${pythonScriptPath}"create_search_index.py"
sed -i "s/kv_to-be-replaced/${keyvaultName}/g" ${pythonScriptPath}"create_sql_tables.py"
if [ -n "$managedIdentityClientId" ]; then
    sed -i "s/mici_to-be-replaced/${managedIdentityClientId}/g" ${pythonScriptPath}"create_search_index.py"
    sed -i "s/mici_to-be-replaced/${managedIdentityClientId}/g" ${pythonScriptPath}"create_sql_tables.py"
fi

# Determine the correct Python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "Python is not installed on this system. Or it is not added in the PATH."
    exit 1
fi

# create virtual environment
# Check if the virtual environment already exists
if [ -d $pythonScriptPath"scriptenv" ]; then
    echo "Virtual environment already exists. Skipping creation."
else
    echo "Creating virtual environment"
    $PYTHON_CMD -m venv $pythonScriptPath"scriptenv"
fi

# Activate the virtual environment
if [ -f $pythonScriptPath"scriptenv/bin/activate" ]; then
    echo "Activating virtual environment (Linux/macOS)"
    source $pythonScriptPath"scriptenv/bin/activate"
elif [ -f $pythonScriptPath"scriptenv/Scripts/activate" ]; then
    echo "Activating virtual environment (Windows)"
    source $pythonScriptPath"scriptenv/Scripts/activate"
else
    echo "Error activating virtual environment. Requirements may be installed globally."
fi

# Install the requirements
echo "Installing requirements"
pip install --quiet -r ${pythonScriptPath}requirements.txt
echo "Requirements installed"

error_flag=false
echo "Running the python scripts"
echo "Creating the search index and adding the data to the index"
python $pythonScriptPath"create_search_index.py"
if [ $? -ne 0 ]; then
    echo "Error: Failed to create search index."
    error_flag=true
fi

echo "Creating the SQL tables and adding the data to the tables"
python $pythonScriptPath"create_sql_tables.py"
if [ $? -ne 0 ]; then
    echo "Error: Failed to create SQL tables."
    error_flag=true
fi

# revert the key vault name and managed identity client id in the python files
sed -i "s/${keyvaultName}/kv_to-be-replaced/g" ${pythonScriptPath}"create_search_index.py"
sed -i "s/${keyvaultName}/kv_to-be-replaced/g" ${pythonScriptPath}"create_sql_tables.py"
if [ -n "$managedIdentityClientId" ]; then
    sed -i "s/${managedIdentityClientId}/mici_to-be-replaced/g" ${pythonScriptPath}"create_search_index.py"
    sed -i "s/${managedIdentityClientId}/mici_to-be-replaced/g" ${pythonScriptPath}"create_sql_tables.py"
fi

if [ "$error_flag" = true ]; then
    echo "One or more errors occurred during the script execution."
    exit 1
fi

echo "Script completed"