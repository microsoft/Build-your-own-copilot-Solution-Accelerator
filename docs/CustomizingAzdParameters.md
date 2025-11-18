## [Optional]: Customizing resource names 

By default this template will use the environment name as the prefix to prevent naming collisions within Azure. The parameters below show the default values. You only need to run the statements below if you need to change the values. 


> To override any of the parameters, run `azd env set <PARAMETER_NAME> <VALUE>` before running `azd up`. On the first azd command, it will prompt you for the environment name. Be sure to choose 3-20 charaters alphanumeric unique name. 

## Parameters

| Name                          | Type    | Default Value       | Purpose                                                                                              |
| -----------------------------| ------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `AZURE_ENV_NAME`            | string  | `azdtemp`           | Used as a prefix for all resource names to ensure uniqueness across environments.                    |
| `AZURE_LOCATION`            | string  | `<User selects during deployment>`         | Sets the Azure region for resource deployment.  |
| `AZURE_OPENAI_MODEL_DEPLOYMENT_TYPE`             | string  | `GlobalStandard`    | Change the Model Deployment Type (allowed values: Standard, GlobalStandard).                         |
| `AZURE_OPENAI_DEPLOYMENT_MODEL`               | string  | `gpt-4.1-mini`            | Set the GPT model name (allowed values: `gpt-4.1-mini`, `gpt-4`, `gpt-4o`).                                                      |
| `AZURE_OPENAI_API_VERSION`     | string  | `2025-04-14`        | Set the Azure OpenAI model version.                                       |
| `AZURE_OPENAI_DEPLOYMENT_MODEL_CAPACITY`     | integer | `30`               | Set the model capacity for GPT deployment. Choose based on your Azure quota and usage needs.         |
| `AZURE_OPENAI_EMBEDDING_MODEL`            | string  | `text-embedding-ada-002`  | Set the model name used for embeddings.                                                              |
| `AZURE_OPENAI_EMBEDDING_MODEL_VERSION`            | string  | `2`  | Set the version for the embedding model.                                                              |
| `AZURE_OPENAI_EMBEDDING_MODEL_CAPACITY` | integer | `45`              | Set the capacity for embedding model deployment.                                                     |
| `AZURE_ENV_IMAGETAG`                  | string  | `latest`            | Set the container image tag (allowed values: `latest`, `dev`, `hotfix`).                                             |
| `AZURE_ENV_ENABLE_TELEMETRY`                  | boolean  | `true`            | Enable or disable telemetry collection for the deployment.                                             |
| `AZURE_ENV_VM_ADMIN_USERNAME`            | string  | `<Set when enablePrivateNetworking=true>`         | Admin username for the jumpbox VM when private networking is enabled.   |
| `AZURE_ENV_VM_ADMIN_PASSWORD`            | string  | `<Set when enablePrivateNetworking=true>`         | Admin password for the jumpbox VM when private networking is enabled.   |
| `AZURE_ENV_LOG_ANALYTICS_WORKSPACE_ID` | string  | Guide to get your [Existing Workspace ID](/docs/re-use-log-analytics.md) | Reuses an existing Log Analytics Workspace instead of provisioning a new one.         |


## How to Set a Parameter
To customize any of the above values, run the following command **before** `azd up`:

```bash
azd env set <PARAMETER_NAME> <VALUE>

```

**Example:**

```bash
azd env set AZURE_LOCATION westus2
```
