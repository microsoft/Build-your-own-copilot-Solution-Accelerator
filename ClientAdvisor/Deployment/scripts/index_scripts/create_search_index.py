#Get Azure Key Vault Client
key_vault_name = 'kv_to-be-replaced' #'nc6262-kv-2fpeafsylfd2e' 
managed_identity_client_id = 'mici_to-be-replaced'

index_name = "transcripts_index"

file_system_client_name = "data"
directory = 'clienttranscripts/meeting_transcripts' 
csv_file_name = 'clienttranscripts/meeting_transcripts_metadata/transcripts_metadata.csv'

from azure.keyvault.secrets import SecretClient  
from azure.identity import DefaultAzureCredential 

def get_secrets_from_kv(kv_name, secret_name):
    
  # Set the name of the Azure Key Vault  
  key_vault_name = kv_name 
  credential = DefaultAzureCredential(managed_identity_client_id=managed_identity_client_id)

  # Create a secret client object using the credential and Key Vault name  
  secret_client = SecretClient(vault_url=f"https://{key_vault_name}.vault.azure.net/", credential=credential)  
    
  # Retrieve the secret value  
  return(secret_client.get_secret(secret_name).value)

search_endpoint =  get_secrets_from_kv(key_vault_name,"AZURE-SEARCH-ENDPOINT")
search_key =  get_secrets_from_kv(key_vault_name,"AZURE-SEARCH-KEY")

# openai_api_type = get_secrets_from_kv(key_vault_name,"OPENAI-API-TYPE")
openai_api_key  = get_secrets_from_kv(key_vault_name,"AZURE-OPENAI-KEY")
openai_api_base = get_secrets_from_kv(key_vault_name,"AZURE-OPENAI-ENDPOINT")
openai_api_version = get_secrets_from_kv(key_vault_name,"AZURE-OPENAI-PREVIEW-API-VERSION") 


# Create the search index
from azure.core.credentials import AzureKeyCredential 
search_credential = AzureKeyCredential(search_key)

from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SimpleField,
    SearchFieldDataType,
    SearchableField,
    SearchField,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SemanticConfiguration,
    SemanticPrioritizedFields,
    SemanticField,
    SemanticSearch,
    SearchIndex
)

# Create a search index
index_client = SearchIndexClient(endpoint=search_endpoint, credential=search_credential)

fields = [
    SimpleField(name="id", type=SearchFieldDataType.String, key=True, sortable=True, filterable=True, facetable=True),
    SearchableField(name="chunk_id", type=SearchFieldDataType.String),
    SearchableField(name="content", type=SearchFieldDataType.String),
    SearchableField(name="sourceurl", type=SearchFieldDataType.String),
    SearchableField(name="client_id", type=SearchFieldDataType.String,filterable=True),
    SearchField(name="contentVector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                searchable=True, vector_search_dimensions=1536, vector_search_profile_name="myHnswProfile"),
]

# Configure the vector search configuration  
vector_search = VectorSearch(
    algorithms=[
        HnswAlgorithmConfiguration(
            name="myHnsw"
        )
    ],
    profiles=[
        VectorSearchProfile(
            name="myHnswProfile",
            algorithm_configuration_name="myHnsw",
        )
    ]
)

semantic_config = SemanticConfiguration(
    name="my-semantic-config",
    prioritized_fields=SemanticPrioritizedFields(
        keywords_fields=[SemanticField(field_name="client_id")],
        content_fields=[SemanticField(field_name="content")]
    )
)

# Create the semantic settings with the configuration
semantic_search = SemanticSearch(configurations=[semantic_config])

# Create the search index with the semantic settings
index = SearchIndex(name=index_name, fields=fields,
                    vector_search=vector_search, semantic_search=semantic_search)
result = index_client.create_or_update_index(index)
print(f' {result.name} created')


from openai import AzureOpenAI

# Function: Get Embeddings
def get_embeddings(text: str,openai_api_base,openai_api_version,openai_api_key):
    model_id = "text-embedding-ada-002"
    client = AzureOpenAI(
        api_version=openai_api_version,
        azure_endpoint=openai_api_base,
        api_key = openai_api_key
    )
    
    embedding = client.embeddings.create(input=text, model=model_id).data[0].embedding

    return embedding

import re

def clean_spaces_with_regex(text):
    # Use a regular expression to replace multiple spaces with a single space
    cleaned_text = re.sub(r'\s+', ' ', text)
    # Use a regular expression to replace consecutive dots with a single dot
    cleaned_text = re.sub(r'\.{2,}', '.', cleaned_text)
    return cleaned_text

def chunk_data(text):
    tokens_per_chunk = 1024 #500
    text = clean_spaces_with_regex(text)
    SENTENCE_ENDINGS = [".", "!", "?"]
    WORDS_BREAKS = ['\n', '\t', '}', '{', ']', '[', ')', '(', ' ', ':', ';', ',']

    sentences = text.split('. ') # Split text into sentences
    chunks = []
    current_chunk = ''
    current_chunk_token_count = 0
    
    # Iterate through each sentence
    for sentence in sentences:
        # Split sentence into tokens
        tokens = sentence.split()
        
        # Check if adding the current sentence exceeds tokens_per_chunk
        if current_chunk_token_count + len(tokens) <= tokens_per_chunk:
            # Add the sentence to the current chunk
            if current_chunk:
                current_chunk += '. ' + sentence
            else:
                current_chunk += sentence
            current_chunk_token_count += len(tokens)
        else:
            # Add current chunk to chunks list and start a new chunk
            chunks.append(current_chunk)
            current_chunk = sentence
            current_chunk_token_count = len(tokens)
    
    # Add the last chunk
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks

#add documents to the index

import json
import base64
import time
import pandas as pd
from azure.search.documents import SearchClient
import os

# foldername = 'clienttranscripts'
# path_name = f'Data/{foldername}/meeting_transcripts'
# # paths = mssparkutils.fs.ls(path_name)

# paths = os.listdir(path_name)

from azure.storage.filedatalake import (
    DataLakeServiceClient,
    DataLakeDirectoryClient,
    FileSystemClient
)

account_name = get_secrets_from_kv(key_vault_name, "ADLS-ACCOUNT-NAME")
credential = DefaultAzureCredential(managed_identity_client_id=managed_identity_client_id)

account_url = f"https://{account_name}.dfs.core.windows.net"

service_client = DataLakeServiceClient(account_url, credential=credential,api_version='2023-01-03') 

file_system_client = service_client.get_file_system_client(file_system_client_name)  
directory_name = directory
paths = file_system_client.get_paths(path=directory_name)
print(paths)

search_credential = AzureKeyCredential(search_key)
search_client = SearchClient(search_endpoint, index_name, search_credential)
index_client = SearchIndexClient(endpoint=search_endpoint, credential=search_credential)

# metadata_filepath = f'Data/{foldername}/meeting_transcripts_metadata/transcripts_metadata.csv'
# # df_metadata = spark.read.format("csv").option("header","true").option("multiLine", "true").option("quote", "\"").option("escape", "\"").load(metadata_filepath).toPandas()
# df_metadata = pd.read_csv(metadata_filepath)
# # display(df_metadata)

import pandas as pd
# Read the CSV file into a Pandas DataFrame
file_path = csv_file_name
print(file_path)
file_client = file_system_client.get_file_client(file_path)
csv_file = file_client.download_file()
df_metadata = pd.read_csv(csv_file, encoding='utf-8')

docs = []
counter = 0
for path in paths:
    # file_path = f'Data/{foldername}/meeting_transcripts/' + path
    # with open(file_path, "r") as file:
    #     data = json.load(file)
    file_client = file_system_client.get_file_client(path.name)
    data_file = file_client.download_file()
    data = json.load(data_file)
    text = data['Content']

    filename = path.name.split('/')[-1]
    document_id = filename.replace('.json','').replace('convo_','')
    # print(document_id)
    df_file_metadata = df_metadata[df_metadata['ConversationId']==str(document_id)].iloc[0]
   
    chunks = chunk_data(text)
    chunk_num = 0
    for chunk in chunks:
        chunk_num += 1
        d = {
                "chunk_id" : document_id + '_' + str(chunk_num).zfill(2),
                "client_id": str(df_file_metadata['ClientId']),
                "content": 'ClientId is ' + str(df_file_metadata['ClientId']) + ' . '  + chunk,       
            }

        counter += 1

        try:
            v_contentVector = get_embeddings(d["content"],openai_api_base,openai_api_version,openai_api_key)
        except:
            time.sleep(30)
            v_contentVector = get_embeddings(d["content"],openai_api_base,openai_api_version,openai_api_key)


        docs.append(
            {
                    "id": base64.urlsafe_b64encode(bytes(d["chunk_id"], encoding='utf-8')).decode('utf-8'),
                    "chunk_id": d["chunk_id"],
                    "client_id": d["client_id"],
                    "content": d["content"],
                    "sourceurl": path.name.split('/')[-1],
                    "contentVector": v_contentVector
            }
        )
        
        if counter % 10 == 0:
            result = search_client.upload_documents(documents=docs)
            docs = []
            print(f' {str(counter)} uploaded')
    
    time.sleep(4)
#upload the last batch
if docs != []:
    search_client.upload_documents(documents=docs)