## [Optional]: Customizing resource names 

By default this template will use the environment name as the prefix to prevent naming collisions within Azure. The parameters below show the default values. You only need to run the statements below if you need to change the values. 


> To override any of the parameters, run `azd env set <PARAMETER_NAME> <VALUE>` before running `azd up`. On the first azd command, it will prompt you for the environment name. Be sure to choose 3-20 charaters alphanumeric unique name. 

## Parameters

| Name                          | Type    | Default Value       | Purpose                                                                                              |
| -----------------------------| ------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `AZURE_ENV_NAME`            | string  | `azdtemp`           | Used as a prefix for all resource names to ensure uniqueness across environments.                    |
| `AZURE_ENV_COSMOS_LOCATION`             | string  | `eastus2`    | Location of the Cosmos DB instance. Choose from (allowed values: `swedencentral`, `australiaeast`).      |
| `AZURE_ENV_MODEL_DEPLOYMENT_TYPE`             | string  | `GlobalStandard`    | Change the Model Deployment Type (allowed values: Standard, GlobalStandard).                         |
| `AZURE_ENV_MODEL_NAME`               | string  | `gpt-4o-mini`            | Set the GPT model name (allowed values: `gpt-4o`).                                                      |
| `AZURE_ENV_MODEL_VERSION`     | string  | `2025-01-01-preview`        | Set the Azure OpenAI API version (allowed values: 2024-08-06).                                       |
| `AZURE_ENV_MODEL_CAPACITY`     | integer | `30`               | Set the model capacity for GPT deployment. Choose based on your Azure quota and usage needs.         |
| `AZURE_ENV_EMBEDDING_MODEL_NAME`            | string  | `text-embedding-ada-002`  | Set the model name used for embeddings.                                                              |
| `AZURE_ENV_EMBEDDING_MODEL_CAPACITY` | integer | `80`              | Set the capacity for embedding model deployment.                                                     |
| `AZURE_ENV_IMAGETAG`                  | string  | `latest_waf`            | Set the image tag (allowed values: `latest_waf`, `dev`, `hotfix`).                                             |
| `AZURE_LOCATION`            | string  | `<User selects during deployment>`         | Sets the Azure region for resource deployment.  |
| `AZURE_ENV_LOG_ANALYTICS_WORKSPACE_ID`            | string  | Guide to get your [Existing Workspace ID](/docs/re-use-log-analytics.md)        | Reuses an existing Log Analytics Workspace instead of provisioning a new one.   |
| `AZURE_EXISTING_AI_PROJECT_RESOURCE_ID`            | string  | `<Existing AI Foundry Project Resource Id>`         | Reuses an existing AI Foundry Project Resource Id instead of provisioning a new one.   |


## How to Set a Parameter
To customize any of the above values, run the following command **before** `azd up`:

```bash
azd env set <PARAMETER_NAME> <VALUE>

```

**Example:**

```bash
azd env set AZURE_LOCATION westus2
```
