#!/bin/bash
echo "started the script"

# Variables
baseUrl="$1"
keyvaultName="$2"
requirementFile="requirements.txt"
requirementFileUrl=${baseUrl}"Deployment/scripts/index_scripts/requirements.txt"

echo "Script Started"

# Download the create_index and create table python files
curl --output "create_search_index.py" ${baseUrl}"Deployment/scripts/index_scripts/create_search_index.py"
curl --output "create_sql_tables.py" ${baseUrl}"Deployment/scripts/index_scripts/create_sql_tables.py"

# RUN apt-get update
# RUN apt-get install python3 python3-dev g++ unixodbc-dev unixodbc libpq-dev
# apk add python3 python3-dev g++ unixodbc-dev unixodbc libpq-dev
 
# # RUN apt-get install python3 python3-dev g++ unixodbc-dev unixodbc libpq-dev
# pip install pyodbc

# Download the requirement file
curl --output "$requirementFile" "$requirementFileUrl"

echo "Download completed"

#Replace key vault name 
sed -i "s/kv_to-be-replaced/${keyvaultName}/g" "create_search_index.py"
sed -i "s/kv_to-be-replaced/${keyvaultName}/g" "create_sql_tables.py"

pip install -r requirements.txt

python create_search_index.py
python create_sql_tables.py