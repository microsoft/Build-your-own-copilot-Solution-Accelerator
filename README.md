# Build your own copilot Solution Accelerator

MENU: [**USER STORY**](#user-story) \| [**QUICK DEPLOY**](#quick-deploy)  \| [**SUPPORTING DOCUMENTS**](#supporting-documents) \|
[**CUSTOMER TRUTH**](#customer-truth)


<h2><img src="docs/images/readMe/userStory.png" width="64">
<br/>
User story
</h2>

**Solution accelerator overview**

This solution accelerator is a powerful tool that helps you create your own copilots. The accelerator can be used by any customer looking for reusable architecture and code snippets to build custom copilots with their own enterprise data. 

It leverages Azure OpenAI Service, Azure AI Search and Microsoft Fabric, to streamline daily tasks and customer meeting preparation for customer-facing roles. As a result, this helps to improve client retention and customer satisfaction. By increasing employee productivity and improving customer conversations, our solution enables organizations to serve more customers and drive increased revenue for the entire company. 

> Note: Some features contained in this repository are in private preview. Certain features might not be supported or might have constrained capabilities. For more information, see [Supplemental Terms of Use for Microsoft Azure Previews](https://azure.microsoft.com/en-us/support/legal/preview-supplemental-terms).

>**Version history:**  
>An updated version of the **Build Your Own Copilot** solution accelerator was published on **[MM/DD/YYYY]**. If you deployed the accelerator prior to that date, please see the “Version history” in the [Version History](#version-history) section for details.

**Scenario**

A Woodgrove Bank Client Advisor is preparing for upcoming client meetings. He wants insight into his scheduled client meetings, access to portfolio information, a comprehensive understanding of previous meetings, and the ability to ask questions about client’s financial details and interests. 
  
This solution with an integrated copilot helps Client Advisors to save time and prepare relevant discussion topics for scheduled meetings. It provides an overview of daily client meetings with seamless navigation between viewing client profiles and chatting with data. Altogether, these features streamline meeting preparation for client advisors and result in more productive conversations with clients. 

The sample data used in this repository is synthetic and generated using Azure OpenAI service. The data is intended for use as sample data only.

<br/>

**Key features**

![Key Features](docs/images/readMe/keyfeatures.png)

<br/>

**Below is an image of the solution accelerator.**

![Landing Page](docs/images/readMe/landing_page.png)

### Solution accelerator architecture
![image](docs/images/readMe/architecture.png)

<h2><img src="docs/images/readMe/quickDeploy.png" width="64">
<br/>
QUICK DEPLOY
</h2>

### Prerequisites

To deploy this solution accelerator, ensure you have access to an [Azure subscription](https://azure.microsoft.com/free/) with the necessary permissions to create **resource groups and resources**. Follow the steps in  [Azure Account Set Up](./docs/AzureAccountSetUp.md) 

Check the [Azure Products by Region](https://azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/table) page and select a **region** where the following services are available: 

- [Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/) 
- [Azure AI Search](https://learn.microsoft.com/en-us/azure/search/) 
- [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/)
- [Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/)
- [Microsoft Fabric](https://learn.microsoft.com/en-us/fabric/)
- [Azure Semantic Search](./docs/AzureSemanticSearchRegion.md)  

Here are some example regions where the services are available: East US, East US2, Australia East, UK South, France Central.

### ⚠️ Important: Check Azure OpenAI Quota Availability  

➡️ To ensure sufficient quota is available in your subscription, please follow **[Quota check instructions guide](./docs/quota_check.md)** before you deploy the solution.

<!-- Here are some example regions where the services are available: East US, East US2, Australia East, UK South, France Central. -->
<!-- 
| [![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fmicrosoft%2Fdocument-generation-solution-accelerator%2Fmain%2Finfra%2Fmain.json) |
|---|
-->
<<<<< Placeholder for Codespace | Placeholder for Dev Container >>>>>

### Configurable Deployment Settings

When you start the deployment, most parameters will have **default values**, but you can update the below settings by following the steps  [here](./docs/CustomizingAzdParameters.md):  

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


### [Optional] Quota Recommendations  
By default, the **Gpt-4o-mini model capacity** in deployment is set to **30k tokens**, so we recommend

<!-- **For Global Standard | GPT-4o-mini - the capacity to at least 150k tokens post-deployment for optimal performance.** -->

To adjust quota settings, follow these [steps](./docs/AzureGPTQuotaSettings.md)  

### Deploying

To change the azd parameters from the default values, follow the steps [here](./docs/CustomizingAzdParameters.md). 


1. Login to Azure:

    ```shell
    azd auth login
    ```

    #### To authenticate with Azure Developer CLI (`azd`), use the following command with your **Tenant ID**:

    ```sh
    azd auth login --tenant-id <tenant-id>
   ```

2. Provision and deploy all the resources:

    ```shell
    azd up
    ```

3. Provide an `azd` environment name (like "byocaapp")
4. Select a subscription from your Azure account, and select a location which has quota for all the resources. 
    * This deployment will take *7-10 minutes* to provision the resources in your account and set up the solution with sample data. 
    * If you get an error or timeout with deployment, changing the location can help, as there may be availability constraints for the resources.

5. Once the deployment has completed successfully and you would like to use the sample data, run the bash command printed in the terminal. The bash command will look like the following: 
    ```shell 
    bash ./infra/scripts/process_sample_data.sh
    ```

6. Open the [Azure Portal](https://portal.azure.com/), go to the deployed resource group, find the App Service and get the app URL from `Default domain`.

6. You can now delete the resources by running `azd down`, if you are done trying out the application. 

### **How to install/deploy**

1. Please check the link [Azure Products by Region](https://azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/?products=all&regions=all) and choose a region where Azure AI Search, Semantic Ranker, Azure OpenAI Service, and Azure AI Foundry are available. 

2. Click the following deployment button to create the required resources for this accelerator in your Azure Subscription.

   [![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fmicrosoft%2FBuild-your-own-copilot-Solution-Accelerator%2Fmain%2Finfra%2Fbicep%2Fmain.json)

3. Alternatively, you can use the following button to open the project in a dev container using GitHub Codespaces:

   [![Open in Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?repo=microsoft/Build-your-own-copilot-Solution-Accelerator&ref=dev)
   [![Open in Dev Containers](https://img.shields.io/static/v1?style=for-the-badge&label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator&ref=dev)

4. To use a local dev container, ensure you have Docker and Visual Studio Code installed. Then, create a `.devcontainer` folder in the root of the project and include the necessary configuration files. You can refer to the [Dev Containers documentation](https://code.visualstudio.com/docs/devcontainers/containers) for guidance.

5. You will need to select an Azure Subscription, create/select a Resource group, Region, a unique Solution Prefix and an Azure location for Cosmos DB.

   ![image](docs/images/readMe/armDeployment.png)

6. When deployment is complete, Follow steps in [Fabric Deployment guide](./docs/FabricDeployment.md) to set up the data processing pipelines and Power BI report in Fabric.

7. Optionally, follow steps in [Teams Tab App guide](./docs/TeamsAppDeployment.md) to add the Client Advisor app to Microsoft Teams.


<br/>
<br>
<h2><img src="./docs/images/readMe/supportingDocuments.png" width="64">
<br/>
Supporting documents
</h2>

Supporting documents coming soon.


<br>
<h2><img src="./docs/images/readMe/customerTruth.png" width="64">
</br>
Customer truth
</h2>
Customer stories coming soon.

<br/>

<h2>
Version History
</h2>
An updated version of the **Build Your Own Copilot** solution accelerator was published on **[MM/DD/YYYY]**. If you deployed the accelerator prior to that date, please note the following changes:

- The **Research Assistant** project has been moved to a separate branch. You can access it here: [**Research Assistant Branch**](#).
- This repository now focuses exclusively on the **Client Advisor** solution scenario.
- The previous folder structure containing both `research-assistant/` and `client-advisor/` directories has been removed.
- The **Client Advisor** solution accelerator is now featured directly on the main landing page, with no additional folders associated.


<h2>
</br>
Responsible AI Transparency FAQ 
</h2>

Please refer to [Transarency FAQ](../TRANSPARENCY_FAQ.md) for responsible AI transparency details of this solution accelerator.

<br/>
<br/>
---

## Disclaimers

This release is an artificial intelligence (AI) system that generates text based on user input. The text generated by this system may include ungrounded content, meaning that it is not verified by any reliable source or based on any factual data. The data included in this release is synthetic, meaning that it is artificially created by the system and may contain factual errors or inconsistencies. Users of this release are responsible for determining the accuracy, validity, and suitability of any content generated by the system for their intended purposes. Users should not rely on the system output as a source of truth or as a substitute for human judgment or expertise. 

This release only supports English language input and output. Users should not attempt to use the system with any other language or format. The system output may not be compatible with any translation tools or services, and may lose its meaning or coherence if translated. 

This release does not reflect the opinions, views, or values of Microsoft Corporation or any of its affiliates, subsidiaries, or partners. The system output is solely based on the system's own logic and algorithms, and does not represent any endorsement, recommendation, or advice from Microsoft or any other entity. Microsoft disclaims any liability or responsibility for any damages, losses, or harms arising from the use of this release or its output by any user or third party. 

This release does not provide any financial advice, and is not designed to replace the role of qualified client advisors in appropriately advising clients. Users should not use the system output for any financial decisions or transactions, and should consult with a professional financial advisor before taking any action based on the system output. Microsoft is not a financial institution or a fiduciary, and does not offer any financial products or services through this release or its output. 

This release is intended as a proof of concept only, and is not a finished or polished product. It is not intended for commercial use or distribution, and is subject to change or discontinuation without notice. Any planned deployment of this release or its output should include comprehensive testing and evaluation to ensure it is fit for purpose and meets the user's requirements and expectations. Microsoft does not guarantee the quality, performance, reliability, or availability of this release or its output, and does not provide any warranty or support for it. 

This Software requires the use of third-party components which are governed by separate proprietary or open-source licenses as identified below, and you must comply with the terms of each applicable license in order to use the Software. You acknowledge and agree that this license does not grant you a license or other right to use any such third-party proprietary or open-source components.  

To the extent that the Software includes components or code used in or derived from Microsoft products or services, including without limitation Microsoft Azure Services (collectively, “Microsoft Products and Services”), you must also comply with the Product Terms applicable to such Microsoft Products and Services. You acknowledge and agree that the license governing the Software does not grant you a license or other right to use Microsoft Products and Services. Nothing in the license or this ReadMe file will serve to supersede, amend, terminate or modify any terms in the Product Terms for any Microsoft Products and Services. 

You must also comply with all domestic and international export laws and regulations that apply to the Software, which include restrictions on destinations, end users, and end use. For further information on export restrictions, visit https://aka.ms/exporting. 

You acknowledge that the Software and Microsoft Products and Services (1) are not designed, intended or made available as a medical device(s), and (2) are not designed or intended to be a substitute for professional medical advice, diagnosis, treatment, or judgment and should not be used to replace or as a substitute for professional medical advice, diagnosis, treatment, or judgment. Customer is solely responsible for displaying and/or obtaining appropriate consents, warnings, disclaimers, and acknowledgements to end users of Customer’s implementation of the Online Services. 

You acknowledge the Software is not subject to SOC 1 and SOC 2 compliance audits. No Microsoft technology, nor any of its component technologies, including the Software, is intended or made available as a substitute for the professional advice, opinion, or judgement of a certified financial services professional. Do not use the Software to replace, substitute, or provide professional financial advice or judgment.  

BY ACCESSING OR USING THE SOFTWARE, YOU ACKNOWLEDGE THAT THE SOFTWARE IS NOT DESIGNED OR INTENDED TO SUPPORT ANY USE IN WHICH A SERVICE INTERRUPTION, DEFECT, ERROR, OR OTHER FAILURE OF THE SOFTWARE COULD RESULT IN THE DEATH OR SERIOUS BODILY INJURY OF ANY PERSON OR IN PHYSICAL OR ENVIRONMENTAL DAMAGE (COLLECTIVELY, “HIGH-RISK USE”), AND THAT YOU WILL ENSURE THAT, IN THE EVENT OF ANY INTERRUPTION, DEFECT, ERROR, OR OTHER FAILURE OF THE SOFTWARE, THE SAFETY OF PEOPLE, PROPERTY, AND THE ENVIRONMENT ARE NOT REDUCED BELOW A LEVEL THAT IS REASONABLY, APPROPRIATE, AND LEGAL, WHETHER IN GENERAL OR IN A SPECIFIC INDUSTRY. BY ACCESSING THE SOFTWARE, YOU FURTHER ACKNOWLEDGE THAT YOUR HIGH-RISK USE OF THE SOFTWARE IS AT YOUR OWN RISK.
