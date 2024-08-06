#!/bin/bash
echo "started the script"

# Variables
baseUrl="$1"
keyvaultName="$2"
solutionName="$3"
resourceGroupName="$4"
subscriptionId="$5"
solutionLocation="$6"


requirementFile="requirements.txt"
requirementFileUrl=${baseUrl}"Deployment/scripts/aihub_scripts/requirements.txt"

flowFile=DraftFlow.zip
extractedFlowFolder="DraftFlow"
flowFileUrl=${baseUrl}"Deployment/scripts/aihub_scripts/flows/DraftFlow.zip"

echo "Download Started"

# Download the create_index python files
curl --output "create_ai_hub.py" ${baseUrl}"Deployment/scripts/aihub_scripts/create_ai_hub.py"

# Download the requirement file
curl --output "$requirementFile" "$requirementFileUrl"

echo "Download completed"

# Download the flow file
curl --output "$flowFile" "$flowFileUrl"

# Extract the zip file
unzip /mnt/azscripts/azscriptinput/"$flowFile" -d /mnt/azscripts/azscriptinput/"$extractedFlowFolder"

#Replace key vault name 
sed -i "s/kv_to-be-replaced/${keyvaultName}/g" "create_ai_hub.py"
sed -i "s/subscription_to-be-replaced/${subscriptionId}/g" "create_ai_hub.py"
sed -i "s/rg_to-be-replaced/${resourceGroupName}/g" "create_ai_hub.py"
sed -i "s/solutionname_to-be-replaced/${solutionName}/g" "create_ai_hub.py"
sed -i "s/solutionlocation_to-be-replaced/${solutionLocation}/g" "create_ai_hub.py"

pip install -r requirements.txt

python create_ai_hub.py
