#!/bin/bash

# Parameters
SqlServerName="$1"
SqlDatabaseName="$2"
UserRoleJSONArray="$3"
ManagedIdentityClientId="$6"

# Function to check if a command exists or runs successfully
function check_command() {
    if ! eval "$1" &> /dev/null; then
        echo "Error: Command '$1' failed or is not installed."
        exit 1
    fi
}

# Ensure required commands are available
check_command "az --version"
check_command "sqlcmd '-?'"

# Authenticate with Azure
if az account show &> /dev/null; then
    echo "Already authenticated with Azure."
else
    if [ -n "$ManagedIdentityClientId" ]; then
        # Use managed identity if running in Azure
        echo "Authenticating with Managed Identity..."
        az login --identity --client-id ${ManagedIdentityClientId}
    else
        # Use Azure CLI login if running locally
        echo "Authenticating with Azure CLI..."
        az login
    fi
    echo "Not authenticated with Azure. Attempting to authenticate..."
fi

SQL_QUERY=""
#loop through the JSON array and create users and assign roles using grep and sed
count=1
while read -r json_object; do
    # Extract fields from the JSON object using grep and sed
    clientId=$(echo "$json_object" | grep -o '"clientId": *"[^"]*"' | sed 's/"clientId": *"\([^"]*\)"/\1/')
    displayName=$(echo "$json_object" | grep -o '"displayName": *"[^"]*"' | sed 's/"displayName": *"\([^"]*\)"/\1/')
    role=$(echo "$json_object" | grep -o '"role": *"[^"]*"' | sed 's/"role": *"\([^"]*\)"/\1/')

    # Append to SQL_QUERY with dynamic variable names
    SQL_QUERY+="
    DECLARE @username$count nvarchar(max) = N'$displayName';
    DECLARE @clientId$count uniqueidentifier = '$clientId';
    DECLARE @sid$count NVARCHAR(max) = CONVERT(VARCHAR(max), CONVERT(VARBINARY(16), @clientId$count), 1);
    DECLARE @cmd$count NVARCHAR(max) = N'CREATE USER [' + @username$count + '] WITH SID = ' + @sid$count + ', TYPE = E;';
    IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = @username$count)
    BEGIN
        EXEC(@cmd$count)
    END
    EXEC sp_addrolemember '$role', @username$count;
    "

    # Increment the count
    count=$((count + 1))
done < <(echo "$UserRoleJSONArray" | grep -o '{[^}]*}')

#create heredoc for the SQL query
SQL_QUERY_FINAL=$(cat <<EOF
$SQL_QUERY
EOF
)



# SQL query to create the user and assign the role
# SQL_QUERY=$(cat <<EOF
# DECLARE @username nvarchar(max) = N'$DisplayName';
# DECLARE @clientId uniqueidentifier = '$ClientId';
# DECLARE @sid NVARCHAR(max) = CONVERT(VARCHAR(max), CONVERT(VARBINARY(16), @clientId), 1);
# DECLARE @cmd NVARCHAR(max) = N'CREATE USER [' + @username + '] WITH SID = ' + @sid + ', TYPE = E;';
# IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = @username)
# BEGIN
#     EXEC(@cmd)
# END
# EXEC sp_addrolemember '$DatabaseRole', @username;
# EOF
# )

# # Output the SQL query for debugging
# echo "SQL Query:"
# echo "$SQL_QUERY_FINAL"

# Check if OS is Windows
OS=$(uname | tr '[:upper:]' '[:lower:]')

if [[ "$OS" == "mingw"* || "$OS" == "cygwin"* || "$OS" == "msys"* ]]; then
    echo "Running on Windows OS, will use interactive login"
    echo "Getting signed in user email"
    UserEmail=$(az ad signed-in-user show --query userPrincipalName -o tsv)
    # Execute the SQL query
    echo "Executing SQL query..."
    sqlcmd -S "$SqlServerName" -d "$SqlDatabaseName" -G -U "$UserEmail" -Q "$SQL_QUERY_FINAL" || {
        echo "Failed to execute SQL query."
        exit 1
    }
else
    echo "Running on Linux or macOS, will use access token"
    mkdir -p usersql
    # Get an access token for the Azure SQL Database
    echo "Retrieving access token..."
    az account get-access-token --resource https://database.windows.net --output tsv | cut -f 1 | tr -d '\n' | iconv -f ascii -t UTF-16LE > usersql/tokenFile
    if [ $? -ne 0 ]; then
        echo "Failed to retrieve access token."
        exit 1
    fi
    errorFlag=false
    # Execute the SQL query
    echo "Executing SQL query..."
    sqlcmd -S "$SqlServerName" -d "$SqlDatabaseName" -G -P usersql/tokenFile -Q "$SQL_QUERY_FINAL" || {
        echo "Failed to execute SQL query."
        errorFlag=true
    }
    #delete the usersql directory
    rm -rf usersql
    if [ "$errorFlag" = true ]; then
        exit 1
    fi
fi


echo "SQL user and role assignment completed successfully."