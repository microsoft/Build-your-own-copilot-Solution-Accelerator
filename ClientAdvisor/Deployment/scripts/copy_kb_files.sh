#!/bin/bash

# Variables
storageAccount="$1"
fileSystem="$2"
baseUrl="$3"
managedIdentityClientId="$4"

zipFileName1="clientdata.zip"
extractedFolder1="clientdata"
zipUrl1=${baseUrl}"Deployment/data/clientdata.zip"

zipFileName2="clienttranscripts.zip"
extractedFolder2="clienttranscripts"
zipUrl2=${baseUrl}"Deployment/data/clienttranscripts.zip"

# Download the zip file
curl --output "$zipFileName1" "$zipUrl1"
curl --output "$zipFileName2" "$zipUrl2"

# Extract the zip file
unzip /mnt/azscripts/azscriptinput/"$zipFileName1" -d /mnt/azscripts/azscriptinput/"$extractedFolder1"
unzip /mnt/azscripts/azscriptinput/"$zipFileName2" -d /mnt/azscripts/azscriptinput/"$extractedFolder2"

# Authenticate with Azure using managed identity
az login --identity --client-id ${managedIdentityClientId}
# Using az storage blob upload-batch to upload files with managed identity authentication, as the az storage fs directory upload command is not working with managed identity authentication.
az storage blob upload-batch --account-name "$storageAccount" --destination data/"$extractedFolder1" --source /mnt/azscripts/azscriptinput/"$extractedFolder1" --auth-mode login --pattern '*'
az storage blob upload-batch --account-name "$storageAccount" --destination data/"$extractedFolder2" --source /mnt/azscripts/azscriptinput/"$extractedFolder2" --auth-mode login --pattern '*'
# az storage fs directory upload -f "$fileSystem" --account-name "$storageAccount" -s "$extractedFolder1" --account-key "$accountKey" --recursive
# az storage fs directory upload -f "$fileSystem" --account-name "$storageAccount" -s "$extractedFolder2" --account-key "$accountKey" --recursive
