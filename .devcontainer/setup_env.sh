#!/bin/bash

git fetch
git pull

# provide execute permission to quotacheck script
chmod +x ./infra/scripts/checkquota.sh

# Add the path to ~/.bashrc for persistence
if ! grep -q '/opt/mssql-tools18/bin' ~/.bashrc; then
    echo 'export PATH="$PATH:/opt/mssql-tools18/bin"' >> ~/.bashrc
fi

# Export the path for the current session
export PATH="$PATH:/opt/mssql-tools18/bin"

# Verify sqlcmd is available
if ! command -v sqlcmd &> /dev/null; then
    echo "sqlcmd is not available in the PATH. Please check the installation."
    exit 1
fi

# Install Azure function core tool
wget -q https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb

sudo apt-get update
sudo apt-get install azure-functions-core-tools-4
