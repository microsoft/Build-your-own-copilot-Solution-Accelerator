# Build your own copilot solution accelerator

This solution accelerator is a powerful tool that helps you create your own copilots. The accelerator can be used by any customer looking for reusable architecture and code snippets to build custom copilots with their own enterprise data.

<br/>

<div align="center">
  
[**SOLUTION OVERVIEW**](#solution-overview)  \| [**QUICK DEPLOY**](#quick-deploy)  \| [**BUSINESS SCENARIO**](#business-scenario)  \| [**SUPPORTING DOCUMENTATION**](#supporting-documentation)

</div>
<br/>


<h2><img src="./docs/images/readme/solution-overview.png" width="48" />
Solution overview
</h2>


Leverages Azure OpenAI Service and Azure AI Search, this solution streamlines daily tasks and customer meeting preparation for customer-facing roles. As a result, this helps to improve client retention and customer satisfaction. By increasing employee productivity and improving customer conversations, our solution enables organizations to serve more customers and drive increased revenue for the entire company.

### Solution architecture
|![image](./docs/images/readme/solution-architecture.png)|
|---|


<br/>

### Additional resources

[Getting started with sample questions](./docs/SampleQuestions.md)

⚠️ [Version history & researcher use case](#version-history)

<br/>



### Key features
<details open>
  <summary>Click to learn more about the key features this solution enables</summary>

  - **Data processing** <br/>
  Process past conversations at scale to add to AI search index with vector embeddings.​
  
  - **Semantic search** <br/>
  Azure AI Search enabled RAG and grounding of the application on the processed datasets.​

  - **Summarization** <br/>
  Azure OpenAI Service helps to summarize the conversations and actions for the next meeting.​

  - **Chat with data** <br/>
  Azure OpenAI Service helps enable chat with structured and unstructured data using Semantic Kernel autonomous function calling.​
     
</details>



<br /><br />
<h2><img src="./docs/images/readme/quick-deploy.png" width="48" />
Quick deploy
</h2>

### How to install or deploy
Follow the quick deploy steps on the deployment guide to deploy this solution to your own Azure subscription.

> **Note:** This solution accelerator requires **Azure Developer CLI (azd) version 1.18.0 or higher**. Please ensure you have the latest version installed before proceeding with deployment. [Download azd here](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/install-azd).

[Click here to launch the deployment guide](./docs/DeploymentGuide.md)
<br/><br/>


| [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/microsoft/Build-your-own-copilot-Solution-Accelerator) | [![Open in Dev Containers](https://img.shields.io/static/v1?style=for-the-badge&label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator) | 
|---|---|

<br/>

> ⚠️ **Important: Check Azure OpenAI Quota Availability**
 <br/>To ensure sufficient quota is available in your subscription, please follow [quota check instructions guide](./docs/QuotaCheck.md) before you deploy the solution.

<br/>

### Prerequisites and costs

To deploy this solution accelerator, ensure you have access to an [Azure subscription](https://azure.microsoft.com/free/) with the necessary permissions to create **resource groups, resources, app registrations, and assign roles at the resource group level**. This should include Contributor role at the subscription level and  Role Based Access Control role on the subscription and/or resource group level. Follow the steps in [Azure Account Set Up](./docs/AzureAccountSetUp.md).

Here are some example regions where the services are available: East US, East US2, Australia East, UK South, France Central.

Check the [Azure Products by Region](https://azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/?products=all&regions=all) page and select a **region** where the following services are available.

Pricing varies per region and usage, so it isn't possible to predict exact costs for your usage. The majority of the Azure resources used in this infrastructure are on usage-based pricing tiers. However, Azure Container Registry has a fixed cost per registry per day.

Use the [Azure pricing calculator](https://azure.microsoft.com/en-us/pricing/calculator) to calculate the cost of this solution in your subscription. 

Review a [sample pricing sheet](https://azure.com/e/2ed9283e797f40958d59cdad556560f3) in the event you want to customize and scale usage.

_Note: This is not meant to outline all costs as selected SKUs, scaled use, customizations, and integrations into your own tenant can affect the total consumption of this sample solution. The sample pricing sheet is meant to give you a starting point to customize the estimate for your specific needs._

<br/>


| Product | Description | Cost |
|---|---|---|
| [Azure AI Foundry](https://learn.microsoft.com/en-us/azure/ai-foundry/) | Free tier. | [Pricing](https://azure.microsoft.com/pricing/details/ai-studio/) |
| [Azure Storage Account for AI Foundry](https://learn.microsoft.com/en-us/azure/storage/) | Standard tier, LRS. Pricing is based on storage and operations. | [Pricing](https://azure.microsoft.com/pricing/details/storage/blobs/) |
| [Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/) | Standard tier. Pricing is based on the number of operations. | [Pricing](https://azure.microsoft.com/pricing/details/key-vault/) |
| [Azure Storage Account for application](https://learn.microsoft.com/en-us/azure/storage/) | Standard tier, LRS. Pricing is based on storage and operations. | [Pricing](https://azure.microsoft.com/pricing/details/storage/blobs/) |
| [Azure AI Services](https://learn.microsoft.com/en-us/azure/ai-services/what-are-ai-services) |  S0 tier, defaults to gpt-4o-mini. Pricing is based on token count. | [Pricing](https://azure.microsoft.com/pricing/details/cognitive-services/) |
| [Azure AI Search](https://learn.microsoft.com/en-us/azure/search/) | Basic tier. Vectorized data store. | [Pricing](https://azure.microsoft.com/en-us/pricing/details/search/) |
| [Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/) | Basic tier. Hosting container images. | [Pricing](https://azure.microsoft.com/pricing/details/container-registry/) |pricing/details/container-registry/) |
| [Azure Container App](https://learn.microsoft.com/en-us/azure/container-apps/) | Consumption tier with 4 CPU, 8GiB memory/storage. Pricing is based on resource allocation, and each month allows for a certain amount of free usage. | [Pricing](https://azure.microsoft.com/pricing/details/container-apps/) |
| [Log analytics](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/log-analytics-overview) | Pay-as-you-go tier. Costs based on data ingested. | [Pricing](https://azure.microsoft.com/pricing/details/monitor/) |
| [Azure SQL DB](https://learn.microsoft.com/en-us/azure/azure-sql/database/) | General purpose, Serverless Gen5, 2 vCores. Structured data storage. | [Pricing](https://azure.microsoft.com/en-us/pricing/details/azure-sql-database/single/) |
| [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/) | Chat history data storage. | [Pricing](https://azure.microsoft.com/en-us/pricing/details/cosmos-db/autoscale-provisioned/) |

<br/>

>⚠️ **Important:** To avoid unnecessary costs, remember to take down your app if it's no longer in use,
either by deleting the resource group in the Portal or running `azd down`.

<br /><br />
<h2><img src="./docs/images/readme/business-scenario.png" width="48" />
Business Scenario
</h2>


|![image](./docs/images/readme/ui.png)|
|---|

<br/>

A Woodgrove Bank Client Advisor is preparing for upcoming client meetings. He wants insight into his scheduled client meetings, access to portfolio information, a comprehensive understanding of previous meetings, and the ability to ask questions about client’s financial details and interests.

This solution has an integrated copilot that helps Client Advisors to save time and prepare relevant discussion topics for scheduled meetings. It provides an overview of daily client meetings with seamless navigation between viewing client profiles and chatting with data. Altogether, these features streamline meeting preparation for client advisors and result in more productive conversations with clients.

⚠️ The sample data used in this repository is synthetic and generated using Azure OpenAI service. The data is intended for use as sample data only.


### Business value
<details>
  <summary>Click to learn more about what value this solution provides</summary>

  - **Reduce expenses, increase revenue** <br/>
  Copilots can reduce operational costs, enhance revenue, and maintain competitiveness.

  - **Enhance productivity** <br/>
  Copilots save professionals time in the meeting preparation process which enables them to handle more tasks and increase customer satisfaction.

  - **Talent retention** <br/>
  Organizations can empower employees to deliver the best customer experiences with a focus on relationships, resulting in higher morale and the retention of top talent.

  - **Enhance customer engagement** <br/>
  Copilots can support improved customer interactions for enhanced satisfaction, and enabling professionals to serve a greater number of customers.

  - **Optimize daily tasks** <br/>
  Copilots can streamline workflows by providing intelligent  summaries, recommended action items, integrated client  views, and immediate support through conversational  interfaces.

     
</details>

<br /><br />

<h2><img src="./docs/images/readme/supporting-documentation.png" width="48" />
Supporting documentation
</h2>

### Security guidelines

This template uses Azure Key Vault to store all connections to communicate between resources.

This template also uses [Managed Identity](https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/overview) for local development and deployment.

To ensure continued best practices in your own repository, we recommend that anyone creating solutions based on our templates ensure that the [Github secret scanning](https://docs.github.com/code-security/secret-scanning/about-secret-scanning) setting is enabled.

You may want to consider additional security measures, such as:

* Enabling Microsoft Defender for Cloud to [secure your Azure resources](https://learn.microsoft.com/en-us/azure/defender-for-cloud/).
* Protecting the Azure Container Apps instance with a [firewall](https://learn.microsoft.com/azure/container-apps/waf-app-gateway) and/or [Virtual Network](https://learn.microsoft.com/azure/container-apps/networking?tabs=workload-profiles-env%2Cazure-cli).

<br/>


### Cross references
Check out similar solution accelerators
 
| Solution Accelerator | Description |
|---|---|
| [Document&nbsp;knowledge&nbsp;mining](https://github.com/microsoft/Document-Knowledge-Mining-Solution-Accelerator) | Process and extract summaries, entities, and metadata from unstructured, multi-modal documents and enable searching and chatting over this data. |
| [Conversation&nbsp;knowledge&nbsp;mining](https://github.com/microsoft/Conversation-Knowledge-Mining-Solution-Accelerator) | Derive insights from volumes of conversational data using generative AI. It offers key phrase extraction, topic modeling, and interactive chat experiences through an intuitive web interface. |
| [Content&nbsp;processing](https://github.com/microsoft/content-processing-solution-accelerator) | Programmatically extract data and apply schemas to unstructured documents across text-based and multi-modal content using Azure AI Foundry, Azure OpenAI, Azure AI Content Understanding, and Azure Cosmos DB. |



<br/>   

### Version history

An updated version of the **Build Your Own Copilot** solution accelerator was published on `04/24/2025`. If you deployed the accelerator prior to that date, please note the following changes:

- The **Research Assistant** project has been moved to a separate branch. You can access it here: [**Research Assistant Branch**](https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator/tree/byoc-researcher).
- This repository now focuses exclusively on the **Client Advisor** solution scenario.
- The previous folder structure containing both `research-assistant/` and `client-advisor/` directories has been removed.
- The **Client Advisor** solution accelerator is now featured directly on the main landing page, with no additional folders associated.

<br />


## Provide feedback

Have questions, find a bug, or want to request a feature? [Submit a new issue](https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator/issues) on this repo and we'll connect.

<br/>

## Responsible AI Transparency FAQ 
Please refer to [Transparency FAQ](./TRANSPARENCY_FAQ.md) for responsible AI transparency details of this solution accelerator.

<br/>

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
