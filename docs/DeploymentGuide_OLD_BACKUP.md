# Deployment Guide 

## Overview

This guide walks you through deploying the Build Your Own Copilot Solution Accelerator to Azure. The deployment process takes approximately 7-10 minutes for the default Development/Testing configuration and includes both infrastructure provisioning and application setup.

🆘 **Need Help?** If you encounter any issues during deployment, check our [Troubleshooting Guide](TroubleShootingSteps.md) for solutions to common problems.

---

## Step 1: Prerequisites & Setup

### 1.1 Azure Account Requirements

Ensure you have access to an [Azure subscription](https://azure.microsoft.com/free/) with the following permissions:

| **Permission/Role** | **Scope** | **Purpose** |
|---------------------|-----------|-------------|
| Contributor | Subscription level | Create and manage Azure resources |
| User Access Administrator | Subscription level | Manage user access and role assignments |
| Role Based Access Control | Subscription/Resource Group level | Configure RBAC permissions |
| App Registration Creation | Microsoft Entra ID | Create and configure authentication |

🔍 **How to Check Your Permissions:**

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Subscriptions** (search for "subscriptions" in the top search bar)
3. Click on your target subscription
4. In the left menu, click **Access control (IAM)**
5. Scroll down to see the table with your assigned roles - you should see:
   - Contributor
   - User Access Administrator
   - Role Based Access Control Administrator (or similar RBAC role)

**For App Registration permissions:**

1. Go to **Microsoft Entra ID** → **Manage** → **App registrations**
2. Try clicking **New registration**
3. If you can access this page, you have the required permissions
4. Cancel without creating an app registration

📖 **Detailed Setup:** Follow [Azure Account Set Up](AzureAccountSetUp.md) for complete configuration.

### 1.2 Check Service Availability & Quota

⚠️ **CRITICAL:** Before proceeding, ensure your chosen region has all required services available:

**Required Azure Services:**

- [Azure AI Foundry](https://learn.microsoft.com/en-us/azure/ai-foundry/)
- [Azure OpenAI Service](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Azure AI Search](https://learn.microsoft.com/en-us/azure/search/)
- [Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/)
- [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/)
- [Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/)
- [Azure Semantic Search](AzureSemanticSearchRegion.md)

**Recommended Regions:** East US, East US2, Australia East, UK South, France Central

🔍 **Check Availability:** Use [Azure Products by Region](https://azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/) to verify service availability.

### 1.3 Quota Check (Optional)

💡 **RECOMMENDED:** Check your Azure OpenAI quota availability before deployment for optimal planning.

**Recommended Configuration:**

- **Default:** 30k tokens (minimum)
- **Optimal:** 150k tokens (recommended for best performance)

> **Note:** When you run `azd up`, the deployment will automatically show you regions with available quota, so this pre-check is optional but helpful for planning purposes. You can customize these settings later in Step 3.3: Advanced Configuration.

📖 **Adjust Quota:** Follow [Azure GPT Quota Settings](AzureGPTQuotaSettings.md) if needed.

---

## Step 2: Choose Your Deployment Environment

Select one of the following options to deploy the Build Your Own Copilot Solution Accelerator:

### Environment Comparison

| **Environment** | **Best For** | **Requirements** | **Setup Time** |
|-----------------|--------------|------------------|----------------|
| GitHub Codespaces | Quick deployment, no local setup required | GitHub account | ~3-5 minutes |
| VS Code Dev Containers | Fast deployment with local tools | Docker Desktop, VS Code | ~5-10 minutes |
| VS Code Web | Quick deployment, no local setup required | Azure account | ~2-4 minutes |
| Local Environment | Enterprise environments, full control | All tools individually | ~15-30 minutes |

💡 **Recommendation:** For fastest deployment, start with GitHub Codespaces - no local installation required.

---

## Deployment Options

### Sandbox or WAF Aligned Deployment Options

The [`infra`](../infra) folder of the Build-your-own-copilot-Solution-Accelerator contains the [`main.bicep`](../infra/main.bicep) Bicep script, which defines all Azure infrastructure components for this solution.

By default, the `azd up` command uses the [`main.parameters.json`](../infra/main.parameters.json) file to deploy the solution. This file is pre-configured for a **sandbox environment** — ideal for development and proof-of-concept scenarios, with minimal security and cost controls for rapid iteration.

For **production deployments**, the repository also provides [`main.waf.parameters.json`](../infra/main.waf.parameters.json), which applies a [Well-Architected Framework (WAF) aligned](https://learn.microsoft.com/en-us/azure/well-architected/) configuration. This option enables additional Azure best practices for reliability, security, cost optimization, operational excellence, and performance efficiency, such as:

  - Enhanced network security (e.g., Network protection with private endpoints)
  - Stricter access controls and managed identities
  - Logging, monitoring, and diagnostics enabled by default
  - Resource tagging and cost management recommendations

**How to choose your deployment configuration:**

* Use the default `main.parameters.json` file for a **sandbox/dev environment**
* For a **WAF-aligned, production-ready deployment**, copy the contents of `main.waf.parameters.json` into `main.parameters.json` before running `azd up`

---

### VM Credentials Configuration

By default, the solution sets the VM administrator username and password from environment variables.

To set your own VM credentials before deployment, use:

```sh
azd env set AZURE_ENV_VM_ADMIN_USERNAME <your-username>
azd env set AZURE_ENV_VM_ADMIN_PASSWORD <your-password>
```

> [!TIP]
> Always review and adjust parameter values (such as region, capacity, security settings and log analytics workspace configuration) to match your organization’s requirements before deploying. For production, ensure you have sufficient quota and follow the principle of least privilege for all identities and role assignments.


> [!IMPORTANT]
> The WAF-aligned configuration is under active development. More Azure Well-Architected recommendations will be added in future updates.

## Deployment Options & Steps

Pick from the options below to see step-by-step instructions for GitHub Codespaces, VS Code Dev Containers, Visual Studio Code (WEB), and Local Environments.

| [![Open in Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?repo=microsoft/Build-your-own-copilot-Solution-Accelerator) | [![Open in Dev Containers](https://img.shields.io/static/v1?style=for-the-badge&label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator) | [![Open in Visual Studio Code Web](https://img.shields.io/static/v1?style=for-the-badge&label=Visual%20Studio%20Code%20(Web)&message=Open&color=blue&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/azure/?vscode-azure-exp=foundry&agentPayload=eyJiYXNlVXJsIjogImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9taWNyb3NvZnQvQnVpbGQteW91ci1vd24tY29waWxvdC1Tb2x1dGlvbi1BY2NlbGVyYXRvci9yZWZzL2hlYWRzL21haW4vaW5mcmEvdnNjb2RlX3dlYiIsICJpbmRleFVybCI6ICIvaW5kZXguanNvbiIsICJ2YXJpYWJsZXMiOiB7ImFnZW50SWQiOiAiIiwgImNvbm5lY3Rpb25TdHJpbmciOiAiIiwgInRocmVhZElkIjogIiIsICJ1c2VyTWVzc2FnZSI6ICIiLCAicGxheWdyb3VuZE5hbWUiOiAiIiwgImxvY2F0aW9uIjogIiIsICJzdWJzY3JpcHRpb25JZCI6ICIiLCAicmVzb3VyY2VJZCI6ICIiLCAicHJvamVjdFJlc291cmNlSWQiOiAiIiwgImVuZHBvaW50IjogIiJ9LCAiY29kZVJvdXRlIjogWyJhaS1wcm9qZWN0cy1zZGsiLCAicHl0aG9uIiwgImRlZmF1bHQtYXp1cmUtYXV0aCIsICJlbmRwb2ludCJdfQ==) |
|---|---|---|

<details>
  <summary><b>Deploy in GitHub Codespaces</b></summary>

### GitHub Codespaces

You can run this solution using [GitHub Codespaces](https://docs.github.com/en/codespaces). The button will open a web-based VS Code instance in your browser:

1. Open the solution accelerator (this may take several minutes):

    [![Open in Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?repo=microsoft/Build-your-own-copilot-Solution-Accelerator)

2. Accept the default values on the create Codespaces page.
3. Open a terminal window if it is not already open.
4. Continue with the [deploying steps](#deploying-with-azd).

</details>

<details>
  <summary><b>Deploy in VS Code Dev Containers</b></summary>

### VS Code Dev Containers

You can run this solution in [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers), which will open the project in your local VS Code using the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers):

1. Start Docker Desktop (install it if not already installed).
2. Open the project:

    [![Open in Dev Containers](https://img.shields.io/static/v1?style=for-the-badge&label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator)

3. In the VS Code window that opens, once the project files show up (this may take several minutes), open a terminal window.
4. Continue with the [deploying steps](#deploying-with-azd).

</details>

<details>
  <summary><b>Deploy in Visual Studio Code (WEB)</b></summary>

### Visual Studio Code (WEB)

You can run this solution in VS Code Web. The button will open a web-based VS Code instance in your browser:

1. Open the solution accelerator (this may take several minutes):

    [![Open in Visual Studio Code Web](https://img.shields.io/static/v1?style=for-the-badge&label=Visual%20Studio%20Code%20(Web)&message=Open&color=blue&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/azure/?vscode-azure-exp=foundry&agentPayload=eyJiYXNlVXJsIjogImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9taWNyb3NvZnQvQnVpbGQteW91ci1vd24tY29waWxvdC1Tb2x1dGlvbi1BY2NlbGVyYXRvci9yZWZzL2hlYWRzL21haW4vaW5mcmEvdnNjb2RlX3dlYiIsICJpbmRleFVybCI6ICIvaW5kZXguanNvbiIsICJ2YXJpYWJsZXMiOiB7ImFnZW50SWQiOiAiIiwgImNvbm5lY3Rpb25TdHJpbmciOiAiIiwgInRocmVhZElkIjogIiIsICJ1c2VyTWVzc2FnZSI6ICIiLCAicGxheWdyb3VuZE5hbWUiOiAiIiwgImxvY2F0aW9uIjogIiIsICJzdWJzY3JpcHRpb25JZCI6ICIiLCAicmVzb3VyY2VJZCI6ICIiLCAicHJvamVjdFJlc291cmNlSWQiOiAiIiwgImVuZHBvaW50IjogIiJ9LCAiY29kZVJvdXRlIjogWyJhaS1wcm9qZWN0cy1zZGsiLCAicHl0aG9uIiwgImRlZmF1bHQtYXp1cmUtYXV0aCIsICJlbmRwb2ludCJdfQ==)

2. When prompted, sign in using your Microsoft account linked to your Azure subscription.
    
    Select the appropriate subscription to continue.

3. Once the solution opens, the **AI Foundry terminal** will automatically start running the following command to install the required dependencies:

    ```shell
    sh install.sh
    ```
    During this process, you’ll be prompted with the message:
    ```
    What would you like to do with these files?
    - Overwrite with versions from template
    - Keep my existing files unchanged
    ```
    Choose “**Overwrite with versions from template**” and provide a unique environment name when prompted.
 
4. Continue with the [deploying steps](#deploying-with-azd).


</details>

<details>
  <summary><b>Deploy in your local Environment</b></summary>

### Local Environment

If you're not using one of the above options for opening the project, then you'll need to:

1. Make sure the following tools are installed:
    - [PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell?view=powershell-7.5) <small>(v7.0+)</small> - available for Windows, macOS, and Linux.
    - [Azure Developer CLI (azd)](https://aka.ms/install-azd) <small>(v1.18.0+)</small> - version
    - [Python 3.9 to 3.11](https://www.python.org/downloads/)
    - [Docker Desktop](https://www.docker.com/products/docker-desktop/)
    - [Git](https://git-scm.com/downloads)
    - [Microsoft ODBC Driver 18 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server?view=sql-server-ver16)

2. Clone the repository or download the project code via command-line:

    ```shell
    azd init -t microsoft/build-your-own-copilot-solution-accelerator/
    ```

3. Open the project folder in your terminal or editor.
4. Continue with the [deploying steps](#deploying-with-azd).

</details>

<br/>

Consider the following settings during your deployment to modify specific settings:

<details>
  <summary><b>Configurable Deployment Settings</b></summary>

When you start the deployment, most parameters will have **default values**, but you can update the below settings by following the steps  [here](CustomizingAzdParameters.md)

</details>

<details>
  <summary><b>[Optional] Quota Recommendations</b></summary>

By default, the **GPT model capacity** in deployment is set to **30k tokens**.  
> **We recommend increasing the capacity to 100k tokens, if available, for optimal performance.**

To adjust quota settings, follow these [steps](./AzureGPTQuotaSettings.md).

**⚠️ Warning:** Insufficient quota can cause deployment errors. Please ensure you have the recommended capacity or request additional capacity before deploying this solution.

</details>

<details>

  <summary><b>Reusing an Existing Log Analytics Workspace</b></summary>

  Guide to get your [Existing Workspace ID](/docs/re-use-log-analytics.md)

</details>
<details>

  <summary><b>Reusing an Existing Azure AI Foundry Project</b></summary>

  Guide to get your [Existing Project ID](/docs/re-use-foundry-project.md)

</details>

### Deploying with AZD

Once you've opened the project in [Codespaces](#github-codespaces), [Dev Containers](#vs-code-dev-containers), [Visual Studio Code (WEB)](#visual-studio-code-web), or [locally](#local-environment), you can deploy it to Azure by following these steps:

1. Login to Azure:

    ```shell
    azd auth login
    ```

    #### To authenticate with Azure Developer CLI (`azd`), use the following command with your **Tenant ID**:

    ```sh
    azd auth login --tenant-id <tenant-id>
    ```

    > **Note:** To retrieve the Tenant ID required for local deployment, you can go to **Tenant Properties** in [Azure Portal](https://portal.azure.com/) from the resource list. Alternatively, follow these steps:
    >
    > 1. Open the [Azure Portal](https://portal.azure.com/).
    > 2. Navigate to **Azure Active Directory** from the left-hand menu.
    > 3. Under the **Overview** section, locate the **Tenant ID** field. Copy the value displayed.

2. Provision and deploy all the resources:

    ```shell
    azd up
    ```
    > **Note:** This solution accelerator requires **Azure Developer CLI (azd) version 1.18.0 or higher**. Please ensure you have the latest version installed before proceeding with deployment. [Download azd here](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/install-azd).

3. Provide an `azd` environment name (e.g., "byocaapp").
4. Select a subscription from your Azure account and choose a location that has quota for all the resources. 
    - This deployment will take *7-10 minutes* to provision the resources in your account and set up the solution with sample data.
    - If you encounter an error or timeout during deployment, changing the location may help, as there could be availability constraints for the resources.

5. Once the deployment is complete, please follow the [Import Sample Data](#post-deployment-steps) instructions under **Post Deployment Steps** to load the sample data correctly.
6. Open the [Azure Portal](https://portal.azure.com/), go to the deployed resource group, find the App Service and get the app URL from `Default domain`.
7. Test the app locally with the sample question with any selected client: _Show latest asset value by asset type?_. For more sample questions you can test in the application, see [Sample Questions](SampleQuestions.md).
8. You can now delete the resources by running `azd down`, if you are done trying out the application.
   > **Note:** If you deployed with `enableRedundancy=true` and Log Analytics workspace replication is enabled, you must first disable replication before running `azd down`, else resource group delete will fail. Follow the steps in [Handling Log Analytics Workspace Deletion with Replication Enabled](./LogAnalyticsReplicationDisable.md), wait until replication returns `false`, then run `azd down`.

### Publishing Local Build Container to Azure Container Registry

If you need to rebuild the source code and push the updated container to the deployed Azure Container Registry, follow these steps:

1. Set the environment variable `USE_LOCAL_BUILD` to `True`:

   - **Linux/macOS**:
     ```bash
     export USE_LOCAL_BUILD=True
     ```

   - **Windows (PowerShell)**:
     ```powershell
     $env:USE_LOCAL_BUILD = $true
     ```
2. Run the `az login` command
   ```bash
   az login
   ```

3. Run the `azd up` command again to rebuild and push the updated container:
   ```bash
   azd up
   ```

This will rebuild the source code, package it into a container, and push it to the Azure Container Registry associated with your deployment.

### 🛠️ Troubleshooting
 If you encounter any issues during the deployment process, please refer [troubleshooting](../docs/TroubleShootingSteps.md) document for detailed steps and solutions

## Deploy Your local changes
To deploy your local changes rename the below files.
   1. Rename `azure.yaml` to `azure_custom2.yaml` and `azure_custom.yaml` to `azure.yaml`.
   2. Go to `infra` directory
        - Rename `main.bicep` to `main_custom2.bicep` and `main_custom.bicep` to `main.bicep`.
Continue with the [deploying steps](#deploying-with-azd).

## Post Deployment Steps

### 1. Import Sample Data 

**Choose the appropriate command based on your deployment method:**

**If you deployed using `azd up` command:**
```bash 
bash ./infra/scripts/process_sample_data.sh 
```
> **Note**: The script will automatically take required values from your `azd` environment.

**If you deployed using custom templates, ARM/Bicep deployments, or `az deployment group` commands:**
```bash 
bash ./infra/scripts/process_sample_data.sh <your-resource-group-name>
```
> **Note**: Replace `<your-resource-group-name>` with the actual name of the resource group containing your deployed Azure resources.

> **💡 Tip**: If the deployment metadata does not exist in Azure or has been deleted, the script will prompt you to manually enter the required configuration values.

> **💡 Tip**: Since this guide is for azd deployment, you'll most likely use the first command without resource group name.

### 2. Configure Authentication

Follow the steps in [App Authentication](./AppAuthentication.md) to configure authentication in App Service. 

> **Note**: Authentication changes can take up to 10 minutes to propagate.

### 3. Troubleshooting: Cleaning Up After a Failed Deployment

If your deployment fails and you need to clean up resources, follow the steps in [Delete Resource Group](./DeleteResourceGroup.md).

## Environment configuration for local development & debugging
> Set APP_ENV in your .env file to control Azure authentication. Set the environment variable to dev to use Azure CLI credentials, or to prod to use Managed Identity for production. **Ensure you're logged in via az login when using dev in local**.

To configure your environment, follow these steps:

	1. Navigate to the `src\App` folder.
	2. Create a `.env` file based on the `.env.sample` file.
	3. Fill in the `.env` file using the deployment output or by retrieving values from the Azure Portal under "Deployments" in your resource group.
	4. Ensure that the `APP_ENV` variable is set to "**dev**".
