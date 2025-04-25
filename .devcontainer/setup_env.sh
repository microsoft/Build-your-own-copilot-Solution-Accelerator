#!/bin/bash

git fetch
git pull

# provide execute permission to quotacheck script
sudo chmod +x ./infra/scripts/checkquota.sh

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

