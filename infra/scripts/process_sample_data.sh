#!/bin/bash

# Variables
resourceGroupName="$1"
cosmosDbAccountName="$2"
storageAccount="$3"
fileSystem="$4"
keyvaultName="$5"
sqlServerName="$6"
SqlDatabaseName="$7"
webAppManagedIdentityClientId="$8"
webAppDisplayName="$9"
functionAppManagedIdentityClientId="${10}"
functionAppDisplayName="${11}"

# get parameters from azd env
# resourceGroupName=$(azd env get-value )
# resourceGroupName=$(azd env get-value )
# resourceGroupName=$(azd env get-value )
# resourceGroupName=$(azd env get-value )
# resourceGroupName=$(azd env get-value )
# resourceGroupName=$(azd env get-value )
# resourceGroupName=$(azd env get-value )
# resourceGroupName=$(azd env get-value )
# resourceGroupName=$(azd env get-value )
# resourceGroupName=$(azd env get-value )
# resourceGroupName=$(azd env get-value )


# Check if all required arguments are provided
if  [ -z "$resourceGroupName" ] || [ -z "$cosmosDbAccountName" ] || [ -z "$storageAccount" ] || [ -z "$fileSystem" ] || [ -z "$keyvaultName" ] || [ -z "$sqlServerName" ] || [ -z "$SqlDatabaseName" ] || [ -z "$webAppManagedIdentityClientId" ] || [ -z "$webAppManagedIdentityClientId" ]; then
    echo "Usage: $0 <resourceGroupName> <cosmosDbAccountName> <storageAccount> <fileSystem> <keyvaultName> <sqlServerName> <webAppManagedIdentityClientId> <functionAppManagedIdentityClientId>"
    exit 1
fi

# Call add_cosmosdb_access.sh
echo "Running add_cosmosdb_access.sh"
bash infra/scripts/add_cosmosdb_access.sh "$resourceGroupName" "$cosmosDbAccountName"
if [ $? -ne 0 ]; then
    echo "Error: add_cosmosdb_access.sh failed."
    exit 1
fi
echo "add_cosmosdb_access.sh completed successfully."

# Call copy_kb_files.sh
echo "Running copy_kb_files.sh"
bash infra/scripts/copy_kb_files.sh "$storageAccount" "$fileSystem"
if [ $? -ne 0 ]; then
    echo "Error: copy_kb_files.sh failed."
    exit 1
fi
echo "copy_kb_files.sh completed successfully."

# Call run_create_index_scripts.sh
echo "Running run_create_index_scripts.sh"
bash infra/scripts/run_create_index_scripts.sh "$keyvaultName" "" "" "$resourceGroupName" "$sqlServerName"
if [ $? -ne 0 ]; then
    echo "Error: run_create_index_scripts.sh failed."
    exit 1
fi
echo "run_create_index_scripts.sh completed successfully."

# Call create_sql_user_and_role.sh
echo "Running create_sql_user_and_role.sh"
bash infra/scripts/add_user_scripts/create_sql_user_and_role.sh "$sqlServerName.database.windows.net" "$SqlDatabaseName" '[
    {"clientId":"'"$webAppManagedIdentityClientId"'", "displayName":"'"$webAppDisplayName"'", "role":"db_datareader"},
    {"clientId":"'"$webAppManagedIdentityClientId"'", "displayName":"'"$webAppDisplayName"'", "role":"db_datawriter"},
    {"clientId":"'"$functionAppManagedIdentityClientId"'", "displayName":"'"$functionAppDisplayName"'", "role":"db_datareader"}
]'
if [ $? -ne 0 ]; then
    echo "Error: create_sql_user_and_role.sh failed."
    exit 1
fi
echo "create_sql_user_and_role.sh completed successfully."

echo "All scripts executed successfully."