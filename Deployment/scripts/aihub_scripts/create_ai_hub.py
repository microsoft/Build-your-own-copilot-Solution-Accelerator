#Get Azure Key Vault Client
key_vault_name = 'kv_to-be-replaced'

from azure.keyvault.secrets import SecretClient  
from azure.identity import DefaultAzureCredential  

def get_secrets_from_kv(kv_name, secret_name):
    
  # Set the name of the Azure Key Vault  
  key_vault_name = kv_name 
    
  # Create a credential object using the default Azure credentials  
  credential = DefaultAzureCredential()

    # Create a secret client object using the credential and Key Vault name  
  secret_client = SecretClient(vault_url=f"https://{key_vault_name}.vault.azure.net/", credential=credential)  
    
  # Retrieve the secret value  
  return(secret_client.get_secret(secret_name).value)

print(get_secrets_from_kv(key_vault_name,"AZURE-SEARCH-ENDPOINT"))


from azure.ai.resources.client import AIClient
from azure.ai.resources.entities import Project, AIResource
from azure.identity import DefaultAzureCredential 

from azure.ai.resources.entities import (
    AzureOpenAIConnection,
    AzureAISearchConnection,
    AzureAIServiceConnection
)

from azure.ai.ml.entities._credentials import ApiKeyConfiguration
from azure.ai.ml._restclient.v2023_06_01_preview.models import ConnectionAuthType
from azure.ai.ml._utils.utils import camel_to_snake
from azure.ai.ml.entities._credentials import ApiKeyConfiguration
from azure.core.exceptions import ResourceNotFoundError


key_vault_name = 'kv_to-be-replaced'
subscription_id='subscription_to-be-replaced'
resource_group_name = 'rg_to-be-replaced'
aihub_name = 'ai_hub_' + 'solutionname_to-be-replaced'
project_name='ai_project_' + 'solutionname_to-be-replaced'
deployment_name = 'draftsinference-' + 'solutionname_to-be-replaced'
solutionLocation = 'solutionlocation_to-be-replaced'

open_ai_key = get_secrets_from_kv(key_vault_name,"AZURE-OPENAI-KEY")
open_ai_res_name = get_secrets_from_kv(key_vault_name,"AZURE-OPENAI-ENDPOINT").replace('https://','').replace('.openai.azure.com','').replace('/','')
openai_api_version = get_secrets_from_kv(key_vault_name,"AZURE-OPENAI-PREVIEW-API-VERSION")

ai_search_endpoint = get_secrets_from_kv(key_vault_name,"AZURE-SEARCH-ENDPOINT")
ai_search_res_name = get_secrets_from_kv(key_vault_name,"AZURE-SEARCH-ENDPOINT").replace('https://','').replace('.search.windows.net','').replace('/','')
ai_search_key = get_secrets_from_kv(key_vault_name,"AZURE-SEARCH-KEY")


credential1 = DefaultAzureCredential()

ai_client = AIClient(
    credential=credential1,
    subscription_id=subscription_id,
    resource_group_name=resource_group_name
)

created_project = None
created_resource = None
# create AI resource
created_resource = ai_client.ai_resources.begin_create(ai_resource=AIResource(
    name=aihub_name,
)).result()

# Create project with above AI resource as parent.
new_local_project = Project(
    name=project_name,
    ai_resource=created_resource.id,
    description="",
)
created_project = ai_client.projects.begin_create(project=new_local_project).result()
print(created_project.name)
print(created_project.ai_resource)


ai_client = AIClient(
    credential=credential1,
    subscription_id=subscription_id,
    resource_group_name=resource_group_name,
    project_name=project_name
)

# create openai connection
openai_conn_name = 'Azure_OpenAI'
cred = ApiKeyConfiguration(key=open_ai_key)
target = f"https://{open_ai_res_name}.openai.azure.com/"

local_conn = AzureOpenAIConnection(name="overwrite", credentials=None, target="overwrite")

local_conn.name = openai_conn_name
local_conn.credentials = cred
local_conn.target = target
local_conn.api_version = openai_api_version #'2023-07-01-preview'
local_conn.tags["ResourceId"] = f"/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/Microsoft.CognitiveServices/accounts/{open_ai_res_name}"

ai_created_conn = ai_client.connections.create_or_update(local_conn)

print(ai_created_conn.name, ai_created_conn.type, ai_created_conn.target, ai_created_conn.credentials.type)


# create search connection
search_conn_name = 'Azure_AISearch'
cred = ApiKeyConfiguration(key=ai_search_key)
target = ai_search_endpoint  #f"https://{ai_search_res_name}.search.windows.net/"

local_conn = AzureAISearchConnection(name="overwrite", credentials=None, target="overwrite")
local_conn.name = search_conn_name
local_conn.credentials = cred
local_conn.target = target
local_conn.api_version = "2023-07-01-preview"
local_conn.tags["ApiType"] = 'Azure'
local_conn.tags["ApiVersion"] = "2023-07-01-preview"
local_conn.tags["ResourceId"] = f"/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/Microsoft.Search/searchServices/{ai_search_res_name}"


srch_created_conn = ai_client.connections.create_or_update(local_conn)

print(srch_created_conn.name, srch_created_conn.type, srch_created_conn.target, srch_created_conn.credentials.type)

ai_client.connections.get(search_conn_name)

# #create deployment endpoint
# from azure.ai.resources.entities.single_deployment import SingleDeployment
# from azure.ai.resources.entities.models import PromptflowModel
# import time 

# if not deployment_name:
#     deployment_name = f"{ai_client.project_name}-copilot"

# deployment = SingleDeployment(
#     name=deployment_name,
#     model=PromptflowModel(
#         path="./DraftFlow",
#     ),
#     instance_type='Standard_DS2_v2',
#     instance_count=1
# )
# ai_client.single_deployments.begin_create_or_update(deployment)

# depl_key = None
# while True:
#     try:
#         depl1_keys = ai_client.single_deployments.get_keys(name=deployment_name,endpoint_name=deployment_name)
#         if depl1_keys.primary_key != None:
#             depl_key = depl1_keys.primary_key
#             depl_endpoint = f'https://{deployment_name}.{solutionLocation}.inference.ml.azure.com/score'
#             break
#         else:
#             print('didnt find the deployment keys, waiting')
#             time.sleep(120) 
#     except:
#         print('didnt find the deployment, waiting')
#         time.sleep(120)

# print(depl_key,depl_endpoint)
