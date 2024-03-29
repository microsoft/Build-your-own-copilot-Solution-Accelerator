#!/bin/bash
echo "started the script"

# Variables
baseUrl="$1"
solutionLocation="$2"
subscriptionId="$3"
solutionName="$4"
identity="$5"
keyVaultName="$6"
resourcegroupname="$7"

requirementFile="requirements.txt"
requirementFileUrl=${baseUrl}"Deployment/scripts/ai_hub_scripts/requirements.txt"

echo "Download Started"

# Download the create_index python files
curl --output "create_ai_hub.py" ${baseUrl}"Deployment/scripts/ai_hub_scripts/create_ai_hub.py"

# Download the requirement file
curl --output "$requirementFile" "$requirementFileUrl"

echo "Download completed"

# #Replace key vault name 
sed -i "s/kv_to-be-replaced/${keyvaultName}/g" "create_ai_hub.py"
sed -i "s/subscription_to-be-replaced/${subscriptionId}/g" "create_ai_hub.py"
sed -i "s/rg_to-be-replaced/${resourcegroupname}/g" "create_ai_hub.py"
sed -i "s/solutionname_to-be-replaced/${solutionName}/g" "create_ai_hub.py"

pip install -r requirements.txt

python create_ai_hub.py