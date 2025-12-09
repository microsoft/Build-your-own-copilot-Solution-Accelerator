# Local Development Setup Guide

This guide provides comprehensive instructions for setting up the Build Your Own Copilot Solution Accelerator for local development across Windows, Linux, and macOS platforms.

## Prerequisites

Before proceeding with the local setup, ensure the following requirements are met:

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Python** | 3.11 | Backend runtime environment |
| **Node.js** | Latest LTS | Frontend build and dependencies |
| **npm** | Latest | JavaScript package manager |
| **Git** | Latest | Version control |
| **Azure CLI** | Latest | Azure authentication and resource management |
| **Microsoft ODBC Driver 18 for SQL Server** | 18.x | SQL Server database connectivity |

### Azure Deployment

✅ **Successful deployment of the Build Your Own Copilot Solution Accelerator to Azure is required.**

The local setup connects to Azure resources provisioned during deployment. If you haven't deployed yet, follow the [Deployment Guide](DeploymentGuide.md) first.

### Azure Role Requirements

Certain Azure roles must be assigned to your user account (Principal ID) for the application to function locally. These roles may already be assigned if you ran the post-deployment script (`process_sample_data.sh`) yourself.

**Required Roles:**

| Role | Resource | Purpose |
|------|----------|---------|
| **Azure AI User** | AI Foundry | Access AI services and models |
| **Cosmos DB SQL Data Contributor** | Cosmos DB Account | Read/write conversation history |
| **SQL Server Admin** | Azure SQL Server | Query client data and assets |

#### Assigning Roles via Azure CLI

**1. Retrieve your Principal ID:**

```bash
az ad signed-in-user show --query id -o tsv
```

**2. Assign Azure AI User role:**

```bash
az role assignment create \
  --assignee <Principal-ID> \
  --role 53ca6127-db72-4b80-b1b0-d745d6d5456d \
  --scope <AI-Foundry-Resource-ID>
```

**3. Assign Cosmos DB SQL Data Contributor role:**

```bash
az cosmosdb sql role assignment create \
  --account-name <cosmos-account-name> \
  --resource-group <resource-group-name> \
  --scope "/" \
  --principal-id <Principal-ID> \
  --role-definition-id "00000000-0000-0000-0000-000000000002"
```

**4. Assign SQL Server Admin role:**

Via Azure Portal:
1. Navigate to your SQL Server resource
2. Under **Security**, click **Microsoft Entra ID**
3. Click **Set admin** and search for your user account
4. Select your user and click **Save**

## Quick Start by Platform

### Windows Development

#### Prerequisites Installation

```powershell
# Install Python 3.11
winget install Python.Python.3.11

# Install Node.js LTS
winget install OpenJS.NodeJS.LTS

# Install Git
winget install Git.Git

# Install Azure CLI
winget install Microsoft.AzureCLI

# Install Microsoft ODBC Driver 18 for SQL Server
# Download and install from: https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
```

#### Setup Steps

```powershell
# 1. Clone repository (if not already done)
git clone https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator.git
cd Build-your-own-copilot-Solution-Accelerator

# 2. Navigate to App folder
cd src\App

# 3. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 4. Configure environment variables
Copy-Item .env.sample .env
# Edit .env file with values from your Azure deployment
# IMPORTANT: Set APP_ENV=dev for local development

# 5. Login to Azure (required for local development)
az login

# 6. Install dependencies and run
.\start.cmd
```

The `start.cmd` script will:
- Install all Python packages from `requirements.txt`
- Install all Node.js packages
- Build the frontend
- Start the backend server on port 50505

#### Option: Windows with WSL2 (Alternative)

```bash
# Install WSL2 first (run in PowerShell as Administrator):
# wsl --install -d Ubuntu

# Then follow the Linux Ubuntu/Debian instructions below
```

### Linux Development

#### Ubuntu/Debian

##### Prerequisites Installation

```bash
# Update package list
sudo apt update

# Install Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install Node.js and npm (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install nodejs -y

# Install Git
sudo apt install git -y

# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Microsoft ODBC Driver 18 for SQL Server
curl https://packages.microsoft.com/keys/microsoft.asc | sudo tee /etc/apt/trusted.gpg.d/microsoft.asc
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
sudo apt update
sudo ACCEPT_EULA=Y apt install msodbcsql18 unixodbc-dev -y
```

##### Setup Steps

```bash
# 1. Clone repository (if not already done)
git clone https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator.git
cd Build-your-own-copilot-Solution-Accelerator

# 2. Navigate to App folder
cd src/App

# 3. Create and activate virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# 4. Configure environment variables
cp .env.sample .env
nano .env  # Edit with values from your Azure deployment
# IMPORTANT: Set APP_ENV=dev for local development

# 5. Login to Azure (required for local development)
az login

# 6. Install dependencies and run
chmod +x start.sh
./start.sh
```

#### RHEL/CentOS/Fedora

##### Prerequisites Installation

```bash
# Install Python 3.11
sudo dnf install python3.11 python3.11-devel gcc -y

# Install Node.js and npm
sudo dnf install nodejs npm -y

# Install Git
sudo dnf install git -y

# Install Azure CLI
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
echo -e "[azure-cli]
name=Azure CLI
baseurl=https://packages.microsoft.com/yumrepos/azure-cli
enabled=1
gpgcheck=1
gpgkey=https://packages.microsoft.com/keys/microsoft.asc" | sudo tee /etc/yum.repos.d/azure-cli.repo
sudo dnf install azure-cli -y

# Install Microsoft ODBC Driver 18 for SQL Server
curl https://packages.microsoft.com/config/rhel/8/prod.repo | sudo tee /etc/yum.repos.d/mssql-release.repo
sudo ACCEPT_EULA=Y dnf install msodbcsql18 unixODBC-devel -y
```

##### Setup Steps

```bash
# Follow the same setup steps as Ubuntu/Debian above
cd Build-your-own-copilot-Solution-Accelerator/src/App
python3.11 -m venv .venv
source .venv/bin/activate
cp .env.sample .env
nano .env
az login
chmod +x start.sh
./start.sh
```

### macOS Development

#### Prerequisites Installation

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3.11
brew install python@3.11

# Install Node.js LTS
brew install node

# Install Git
brew install git

# Install Azure CLI
brew install azure-cli

# Install Microsoft ODBC Driver 18 for SQL Server
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew update
brew install msodbcsql18 mssql-tools18
```

#### Setup Steps

```bash
# 1. Clone repository (if not already done)
git clone https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator.git
cd Build-your-own-copilot-Solution-Accelerator

# 2. Navigate to App folder
cd src/App

# 3. Create and activate virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# 4. Configure environment variables
cp .env.sample .env
nano .env  # Edit with values from your Azure deployment
# IMPORTANT: Set APP_ENV=dev for local development

# 5. Login to Azure (required for local development)
az login

# 6. Install dependencies and run
chmod +x start.sh
./start.sh
```

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the `src/App` directory based on `.env.sample`. This file must contain all environment variables present in the deployed Azure App Service.

**Key Configuration:**

```bash
# Application Environment (CRITICAL for local development)
APP_ENV="dev"  # Use "dev" for local development with Azure CLI authentication

# Azure OpenAI settings
AZURE_OPENAI_RESOURCE=
AZURE_OPENAI_MODEL="gpt-4o-mini"
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_EMBEDDING_NAME="text-embedding-ada-002"
AZURE_OPENAI_EMBEDDING_ENDPOINT=

# Cosmos DB settings
AZURE_COSMOSDB_ACCOUNT=
AZURE_COSMOSDB_DATABASE="db_conversation_history"
AZURE_COSMOSDB_CONVERSATIONS_CONTAINER="conversations"

# Azure Search settings
AZURE_SEARCH_SERVICE=
AZURE_SEARCH_INDEX="transcripts_index"
AZURE_AI_SEARCH_ENDPOINT=

# Azure SQL Database settings
AZURE_SQL_SERVER=
AZURE_SQL_DATABASE=
```

> **Getting Environment Values:**
> 
> **Option 1:** If resources were provisioned using `azd provision` or `azd up`, a `.env` file is automatically generated at `.azure/<env-name>/.env`. To find your `<env-name>`, run:
> ```bash
> azd env list
> ```
>
> **Option 2:** Retrieve values from the Azure Portal:
> 1. Navigate to your resource group
> 2. Open the App Service resource
> 3. Go to **Settings** → **Environment variables**
> 4. Copy the values to your local `.env` file

### Authentication Configuration

The `APP_ENV` variable controls authentication behavior:

| Environment | Value | Authentication Method | Use Case |
|-------------|-------|----------------------|----------|
| **Development** | `dev` | Azure CLI credentials | Local development and debugging |
| **Production** | `prod` | Managed Identity | Azure App Service deployment |

**⚠️ IMPORTANT:** Ensure you're logged in via `az login` when using `APP_ENV=dev` locally.

### Platform-Specific Configuration

#### Windows PowerShell

```powershell
# Set execution policy if needed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Environment variables (alternative to .env file)
$env:APP_ENV = "dev"
$env:AZURE_OPENAI_ENDPOINT = "https://your-resource.openai.azure.com/"
```

#### Windows Command Prompt

```cmd
rem Set environment variables
set APP_ENV=dev
set AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/

rem Activate virtual environment
.venv\Scripts\activate.bat
```

#### Linux/macOS Bash/Zsh

```bash
# Add to ~/.bashrc or ~/.zshrc for persistence
export APP_ENV="dev"
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"

# Or use .env file (recommended)
source .env  # if you want to load manually
```

## Running the Application

### Using Start Scripts (Recommended)

The start scripts automate the entire setup process, including:
- Installing all Python packages from `requirements.txt`
- Installing all Node.js packages
- Building the frontend application
- Starting the backend server on port 50505

#### Windows

```powershell
# From src/App directory
.\start.cmd
```

#### Linux/macOS

```bash
# From src/App directory
chmod +x start.sh
./start.sh
```

### Accessing the Application

Once the application is running, open your browser and navigate to:

```
http://localhost:50505
```

or

```
http://127.0.0.1:50505
```

## Local Debugging in Visual Studio Code

For a better debugging experience with breakpoints and step-through debugging:

### Setup Steps

1. **Open the workspace in VS Code**
   ```bash
   cd Build-your-own-copilot-Solution-Accelerator
   code .
   ```

2. **Ensure virtual environment is activated**
   - Windows: `.\.venv\Scripts\Activate.ps1`
   - Linux/macOS: `source .venv/bin/activate`

3. **Open Run and Debug panel**
   - Press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (macOS)
   - Or click the Run and Debug icon in the sidebar

4. **Select debug configuration**
   - Choose **"Python: Sample App Backend"** from the dropdown menu
   - This configuration is defined in `.vscode/launch.json`

5. **Start debugging**
   - Click the green play button or press `F5`
   - Set breakpoints in your code as needed

6. **Access the application**
   - Navigate to `http://localhost:50505` in your browser
   - The debugger will pause at any breakpoints you've set

### Using VS Code Debug Configuration

Alternatively, run the backend in debug mode using the VS Code debug configuration:

1. Open the workspace in VS Code
2. Navigate to the Run and Debug panel (Ctrl+Shift+D / Cmd+Shift+D)
3. Select the debug configuration from `.vscode/launch.json`
4. Press F5 to start debugging

### Accessing the Application

Once the app is running, open your browser and navigate to:

```
http://127.0.0.1:50505
```

## Development Tools Setup

### Visual Studio Code (Recommended)

#### Required Extensions

```json
{
    "recommendations": [
        "ms-python.python",
        "ms-python.pylint",
        "ms-python.black-formatter",
        "ms-python.isort",
        "ms-vscode-remote.remote-wsl",
        "ms-vscode-remote.remote-containers",
        "redhat.vscode-yaml",
        "ms-vscode.azure-account"
    ]
}
```

#### Settings Configuration

Create `.vscode/settings.json`:

```json
{
    "python.defaultInterpreterPath": "./src/App/.venv/bin/python",
    "python.terminal.activateEnvironment": true,
    "python.formatting.provider": "black",
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,
    "files.associations": {
        "*.yaml": "yaml",
        "*.yml": "yaml"
    }
}
```

## Troubleshooting

### Common Issues

#### Missing ODBC Driver

**Error:** `[Microsoft][ODBC Driver Manager] Data source name not found`

**Solution:**

Windows:
```powershell
# Download and install from Microsoft:
# https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
```

Linux (Ubuntu/Debian):
```bash
curl https://packages.microsoft.com/keys/microsoft.asc | sudo tee /etc/apt/trusted.gpg.d/microsoft.asc
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
sudo apt update
sudo ACCEPT_EULA=Y apt install msodbcsql18 -y
```

macOS:
```bash
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew update
brew install msodbcsql18
```

#### Azure Authentication Failures

**Error:** `DefaultAzureCredential failed to retrieve a token`

**Solution:**

```bash
# Ensure you're logged in to Azure CLI
az login

# Verify your login
az account show

# Set the correct subscription if needed
az account set --subscription "your-subscription-id"

# Ensure APP_ENV=dev in your .env file
```

#### Missing Azure Role Assignments

**Error:** `403 Forbidden` or `Unauthorized` when accessing Azure resources

**Solution:**

Verify role assignments as described in the [Prerequisites](#azure-role-requirements) section. You may need to run the post-deployment script:

```bash
bash ./infra/scripts/process_sample_data.sh
```

#### Python Version Issues

```bash
# Check available Python versions
python --version
python3.11 --version

# If python3.11 not found, install it:
# Ubuntu: sudo apt install python3.11
# macOS: brew install python@3.11
# Windows: winget install Python.Python.3.11
```

#### Virtual Environment Issues

```bash
# Recreate virtual environment
# Windows PowerShell:
Remove-Item -Recurse -Force .venv
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux/macOS:
rm -rf .venv
python3.11 -m venv .venv
source .venv/bin/activate

# Then reinstall dependencies
pip install -r requirements.txt
```

#### Node.js/npm Installation Issues

```bash
# Verify Node.js and npm are installed
node --version
npm --version

# If not installed:
# Windows: winget install OpenJS.NodeJS.LTS
# Ubuntu: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt install nodejs -y
# macOS: brew install node
```

#### Environment Variable Issues

```bash
# Check environment variables are loaded
# Linux/macOS:
env | grep AZURE
cat .env | grep -v '^#' | grep '='

# Windows PowerShell:
Get-ChildItem Env:AZURE*
Get-Content .env | Where-Object { $_ -notmatch '^#' -and $_ -match '=' }

# Validate .env file has APP_ENV=dev
grep APP_ENV .env  # Linux/macOS
Select-String -Path .env -Pattern "APP_ENV"  # Windows PowerShell
```

#### Port Already in Use

If port 50505 is already in use:

```bash
# Find and kill the process using the port

# Windows PowerShell:
$port = 50505
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $process.OwningProcess -Force
}

# Linux/macOS:
lsof -ti:50505 | xargs kill -9
```

#### Frontend Build Failures

```bash
# Clear npm cache and rebuild
cd src/App/frontend
rm -rf node_modules package-lock.json  # Linux/macOS
# or Remove-Item -Recurse node_modules, package-lock.json  # Windows PowerShell

npm install
npm run build
```

#### Database Connection Issues

**Error:** `Cannot open server 'xxx' requested by the login`

**Solutions:**

1. Verify SQL Server admin role is assigned (see [Prerequisites](#azure-role-requirements))
2. Check if SQL Server firewall allows your IP:
   ```bash
   # Add your client IP to SQL Server firewall
   az sql server firewall-rule create \
     --resource-group <resource-group-name> \
     --server <sql-server-name> \
     --name AllowMyIP \
     --start-ip-address <your-ip> \
     --end-ip-address <your-ip>
   ```
3. Ensure you're logged in with `az login`

## Summary: Quick Local Setup Checklist

- [ ] Azure resources deployed successfully
- [ ] Python 3.11 installed
- [ ] Node.js and npm installed
- [ ] Azure CLI installed
- [ ] Microsoft ODBC Driver 18 for SQL Server installed
- [ ] Repository cloned locally
- [ ] Azure roles assigned (Azure AI User, Cosmos DB Contributor, SQL Server Admin)
- [ ] Logged in via `az login`
- [ ] `.env` file created from `.env.sample` in `src/App`
- [ ] `APP_ENV=dev` set in `.env` file
- [ ] All environment variables populated from Azure deployment
- [ ] Virtual environment created and activated
- [ ] `start.cmd` (Windows) or `start.sh` (Linux/macOS) executed
- [ ] Application accessible at `http://localhost:50505`

## Deploying Local Changes to Azure

After making local modifications and testing them, you can deploy your changes to Azure App Service.

For detailed instructions on deploying local changes to Azure, see the [**Advanced: Deploy Local Changes**](DeploymentGuide.md#advanced-deploy-local-changes) section in the Deployment Guide.

## Next Steps

1. **Configure Your Environment**: Follow the platform-specific setup instructions above
2. **Explore the Codebase**: Start with `src/App/app.py` and examine the application structure
3. **Customize the Application**: Modify prompts, add new features, or integrate additional data sources
4. **Deploy to Azure**: Follow the [Deployment Guide](DeploymentGuide.md) for production deployment

## Related Documentation

- [Deployment Guide](DeploymentGuide.md) - Production deployment instructions
- [Azure Account Set Up](AzureAccountSetUp.md) - Azure subscription configuration
- [Troubleshooting Steps](TroubleShootingSteps.md) - Common issues and solutions
- [Sample Questions](SampleQuestions.md) - Example queries to test the application
