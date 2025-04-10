#!/bin/bash

# Variables
storageAccount="$1"
fileSystem="$2"
baseUrl="$3"

zipFileName1="demodata1.zip"
extractedFolder1="demodata"
zipUrl1=${baseUrl}"ResearchAssistant/Deployment/data/demodata1.zip"

zipFileName2="demodata2.zip"
extractedFolder2="demodata2"
zipUrl2=${baseUrl}"ResearchAssistant/Deployment/data/demodata2.zip"

zipFileName3="demodata3.zip"
extractedFolder3="demodata3"
zipUrl3=${baseUrl}"ResearchAssistant/Deployment/data/demodata3.zip"


# Download the zip file
curl --output "$zipFileName1" "$zipUrl1"
curl --output "$zipFileName2" "$zipUrl2"
curl --output "$zipFileName3" "$zipUrl3"

# Extract the zip file
unzip /mnt/azscripts/azscriptinput/"$zipFileName1" -d /mnt/azscripts/azscriptinput/"$extractedFolder1"
unzip /mnt/azscripts/azscriptinput/"$zipFileName2" -d /mnt/azscripts/azscriptinput/"$extractedFolder2"
unzip /mnt/azscripts/azscriptinput/"$zipFileName3" -d /mnt/azscripts/azscriptinput/"$extractedFolder3"

# Authenticate with Azure using managed identity
az login --identity
# Using az storage blob upload-batch to upload files with managed identity authentication, as the az storage fs directory upload command is not working with managed identity authentication.
az storage blob upload-batch --account-name "$storageAccount" --destination data/"$extractedFolder1" --source /mnt/azscripts/azscriptinput/"$extractedFolder1" --auth-mode login --pattern '*'
az storage blob upload-batch --account-name "$storageAccount" --destination data/"$extractedFolder2" --source /mnt/azscripts/azscriptinput/"$extractedFolder2" --auth-mode login --pattern '*'
az storage blob upload-batch --account-name "$storageAccount" --destination data/"$extractedFolder3" --source /mnt/azscripts/azscriptinput/"$extractedFolder3" --auth-mode login --pattern '*'
# az storage fs directory upload -f "$fileSystem" --account-name "$storageAccount" -s "$extractedFolder1" --account-key "$accountKey" --recursive
# az storage fs directory upload -f "$fileSystem" --account-name "$storageAccount" -s "$extractedFolder2" --account-key "$accountKey" --recursive
# az storage fs directory upload -f "$fileSystem" --account-name "$storageAccount" -s "$extractedFolder3" --account-key "$accountKey" --recursive