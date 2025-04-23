# Deployment Guide 

## **Pre-requisites**

To deploy this solution accelerator, ensure you have access to an [Azure subscription](https://azure.microsoft.com/free/) with the necessary permissions to create **resource groups, resources, and assign roles at the resource group level***. Follow the steps in  [Azure Account Set Up](AzureAccountSetUp.md) 

Check the [Azure Products by Region](https://azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/table) page and select a **region** where the following services are available: 

- [Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/) 
- [Azure AI Search](https://learn.microsoft.com/en-us/azure/search/) 
- [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/)
- [Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/)
- [Microsoft Fabric](https://learn.microsoft.com/en-us/fabric/)
- [Azure Semantic Search](AzureSemanticSearchRegion.md)  

Here are some example regions where the services are available: East US, East US2, Australia East, UK South, France Central.


### **Important: Check Azure OpenAI Quota Availability**

⚠️ To ensure sufficient quota is available in your subscription, please follow [quota check instructions guide](./quota_check.md) before you deploy the solution.


### [Optional] Quota Recommendations  
By default, the **Gpt-4o-mini model capacity** in deployment is set to **30k tokens**, so we recommend

<!-- **For Global Standard | GPT-4o-mini - the capacity to at least 150k tokens post-deployment for optimal performance.** -->

To adjust quota settings, follow these [steps](AzureGPTQuotaSettings.md)


## Deployment Options & Steps

Pick from the options below to see step-by-step instructions for GitHub Codespaces, VS Code Dev Containers, and Local Environments.

| [![Open in Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?repo=microsoft/Build-your-own-copilot-Solution-Accelerator&ref=dev) | [![Open in Dev Containers](https://img.shields.io/static/v1?style=for-the-badge&label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator&ref=dev) |
|---|---|

<details>
  <summary><b>Deploy in GitHub Codespaces</b></summary>

### GitHub Codespaces

You can run this solution using [GitHub Codespaces](https://docs.github.com/en/codespaces). The button will open a web-based VS Code instance in your browser:

1. Open the solution accelerator (this may take several minutes):

    [![Open in Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?repo=microsoft/Build-your-own-copilot-Solution-Accelerator&ref=dev)

2. Accept the default values on the create Codespaces page.
3. Open a terminal window if it is not already open.
4. Continue with the [deploying steps](#deploying-with-azd).

</details>

<details>
  <summary><b>Deploy in VS Code</b></summary>

### VS Code Dev Containers

You can run this solution in [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers), which will open the project in your local VS Code using the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers):

1. Start Docker Desktop (install it if not already installed).
2. Open the project:

    [![Open in Dev Containers](https://img.shields.io/static/v1?style=for-the-badge&label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator&ref=dev)

3. In the VS Code window that opens, once the project files show up (this may take several minutes), open a terminal window.
4. Continue with the [deploying steps](#deploying-with-azd).

</details>

<details>
  <summary><b>Deploy in your local Environment</b></summary>

### Local Environment

If you're not using one of the above options for opening the project, then you'll need to:

1. Make sure the following tools are installed:
    - [PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell?view=powershell-7.5) <small>(v7.0+)</small> - available for Windows, macOS, and Linux.
    - [Azure Developer CLI (azd)](https://aka.ms/install-azd)
    - [Python 3.9+](https://www.python.org/downloads/)
    - [Docker Desktop](https://www.docker.com/products/docker-desktop/)
    - [Git](https://git-scm.com/downloads)

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

When you start the deployment, most parameters will have **default values**, but you can update the below settings by following the steps  [here](CustomizingAzdParameters.md):  

| **Setting** | **Description** |  **Default value** |
|------------|----------------|  ------------|
| **Azure OpenAI Location** | The region where OpenAI deploys | eastus2 | 
| **Environment Name** | A **3-20 character alphanumeric value** used to generate a unique ID to prefix the resources. |  byocatemplate |
| **Cosmos Location** | A **less busy** region for **CosmosDB**, useful in case of availability constraints. |  eastus2 |
| **Deployment Type** | Select from a drop-down list. |  Global Standard |
| **GPT Model** | OpenAI GPT model  | gpt-4o-mini |  
| **GPT Model Deployment Capacity** | Configure capacity for **GPT models**. | 30k |
| **Embedding Model** | OpenAI embedding model |  text-embedding-ada-002 |
| **Embedding Model Capacity** | Set the capacity for **embedding models**. |  80k |

</details>

<details>
  <summary><b>[Optional] Quota Recommendations</b></summary>

By default, the **GPT model capacity** in deployment is set to **30k tokens**.  
> **We recommend increasing the capacity to 100k tokens, if available, for optimal performance.**

To adjust quota settings, follow these [steps](./AzureGPTQuotaSettings.md).

**⚠️ Warning:** Insufficient quota can cause deployment errors. Please ensure you have the recommended capacity or request additional capacity before deploying this solution.

</details>

### Deploying with AZD

Once you've opened the project in [Codespaces](#github-codespaces), [Dev Containers](#vs-code-dev-containers), or [locally](#local-environment), you can deploy it to Azure by following these steps:

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

3. Provide an `azd` environment name (e.g., "byocaapp").
4. Select a subscription from your Azure account and choose a location that has quota for all the resources. 
    - This deployment will take *7-10 minutes* to provision the resources in your account and set up the solution with sample data.
    - If you encounter an error or timeout during deployment, changing the location may help, as there could be availability constraints for the resources.

5. Once the deployment has completed successfully and you would like to use the sample data, run the bash command printed in the terminal. The bash command will look like the following: 
    ```shell 
    bash ./infra/scripts/process_sample_data.sh
    ```

6. Open the [Azure Portal](https://portal.azure.com/), go to the deployed resource group, find the App Service and get the app URL from `Default domain`.
7. Test the app locally with the sample question with any selected client: _Show latest asset value by asset type?_. For more sample questions you can test in the application, see [Sample Questions](SampleQuestions.md).
8. You can now delete the resources by running `azd down`, if you are done trying out the application. 

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

## Post Deployment Steps

1. **Import Sample Data**
   -Run  bash command printed in the terminal. The bash command will look like the following: 
    ```shell 
    bash ./infra/scripts/process_sample_data.sh
    ```

2. **Add Authentication Provider**  
    - Follow steps in [App Authentication](./AppAuthentication.md) to configure authenitcation in app service. Note that Authentication changes can take up to 10 minutes. 

3. **Fabric Configuration**, 
   - Follow steps in [Fabric Deployment guide](FabricDeployment.md) to set up the data processing pipelines and Power BI report in Fabric.
4. **Teams App Configuration**
   - *(Optional)* Follow steps in [Teams Tab App guide](TeamsAppDeployment.md) to add the Client Advisor app to Microsoft Teams.
5. **Deleting Resources After a Failed Deployment**  

     - Follow steps in [Delete Resource Group](DeleteResourceGroup.md) if your deployment fails and/or you need to clean up the resources.
