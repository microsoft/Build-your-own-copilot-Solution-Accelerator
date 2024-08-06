#!/bin/bash

# Variables
storageAccount="$1"
fileSystem="$2"
accountKey="$3"
baseUrl="$4"

zipFileName1="demodata1.zip"
extractedFolder1="demodata"
zipUrl1=${baseUrl}"Deployment/data/demodata1.zip"

zipFileName2="demodata2.zip"
extractedFolder2="demodata2"
zipUrl2=${baseUrl}"Deployment/data/demodata2.zip"

zipFileName3="demodata3.zip"
extractedFolder3="demodata3"
zipUrl3=${baseUrl}"Deployment/data/demodata3.zip"


# Download the zip file
curl --output "$zipFileName1" "$zipUrl1"
curl --output "$zipFileName2" "$zipUrl2"
curl --output "$zipFileName3" "$zipUrl3"

# Extract the zip file
unzip /mnt/azscripts/azscriptinput/"$zipFileName1" -d /mnt/azscripts/azscriptinput/"$extractedFolder1"
unzip /mnt/azscripts/azscriptinput/"$zipFileName2" -d /mnt/azscripts/azscriptinput/"$extractedFolder2"
unzip /mnt/azscripts/azscriptinput/"$zipFileName3" -d /mnt/azscripts/azscriptinput/"$extractedFolder3"

az storage fs directory upload -f "$fileSystem" --account-name "$storageAccount" -s "$extractedFolder1" --account-key "$accountKey" --recursive
az storage fs directory upload -f "$fileSystem" --account-name "$storageAccount" -s "$extractedFolder2" --account-key "$accountKey" --recursive
az storage fs directory upload -f "$fileSystem" --account-name "$storageAccount" -s "$extractedFolder3" --account-key "$accountKey" --recursive

