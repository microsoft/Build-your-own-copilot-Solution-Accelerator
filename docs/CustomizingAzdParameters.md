## [Optional]: Customizing resource names 

By default this template will use the environment name as the prefix to prevent naming collisions within Azure. The parameters below show the default values. You only need to run the statements below if you need to change the values. 


> To override any of the parameters, run `azd env set <key> <value>` before running `azd up`. On the first azd command, it will prompt you for the environment name. Be sure to choose 3-20 charaters alphanumeric unique name. 

## Parameters

| Name                          | Type    | Default Value       | Purpose                                                                                              |
| -----------------------------| ------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `environmentName`            | string  | `azdtemp`           | Used as a prefix for all resource names to ensure uniqueness across environments.                    |
| `cosmosLocation`             | string  | `Sweden Central`    | Location of the Cosmos DB instance. Choose from allowed values: Sweden Central, Australia East.      |
| `deploymentType`             | string  | `GlobalStandard`    | Change the Model Deployment Type (allowed values: Standard, GlobalStandard).                         |
| `gptModelName`               | string  | `gpt-4o`            | Set the GPT model name (allowed values: gpt-4o).                                                      |
| `azureOpenaiAPIVersion`     | string  | `2024-08-06`        | Set the Azure OpenAI API version (allowed values: 2024-08-06).                                       |
| `gptDeploymentCapacity`     | integer | `200`               | Set the model capacity for GPT deployment. Choose based on your Azure quota and usage needs.         |
| `embeddingModel`            | string  | `text-embedding-3`  | Set the model name used for embeddings.                                                              |
| `embeddingDeploymentCapacity` | integer | `50`              | Set the capacity for embedding model deployment.                                                     |
| `imageTag`                  | string  | `latest`            | Set the image tag (allowed values: latest, dev, hotfix).                                             |
| `AzureOpenAILocation`       | string  | `Sweden Central`    | Location of the Azure OpenAI resource. Choose from allowed values: Sweden Central, Australia East.   |
| `AZURE_LOCATION`            | string  | `japaneast`         | Location of the Azure infrastructure deployment. Controls where core resources will be provisioned.  |

## How to Set a Parameter
To customize any of the above values, run the following command **before** `azd up`:

```bash
azd env set <PARAMETER_NAME> <VALUE>
```

**Example:**

```bash
azd env set AZURE_LOCATION westus2
```
