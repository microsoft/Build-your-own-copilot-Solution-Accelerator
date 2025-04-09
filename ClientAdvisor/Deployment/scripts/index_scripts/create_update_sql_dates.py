key_vault_name = 'kv_to-be-replaced'
managed_identity_client_id = 'mici_to-be-replaced'

import pandas as pd
import pymssql
import os
from datetime import datetime

from azure.keyvault.secrets import SecretClient  
from azure.identity import DefaultAzureCredential 

def get_secrets_from_kv(kv_name, secret_name):
    key_vault_name = kv_name  # Set the name of the Azure Key Vault  
    credential = DefaultAzureCredential(managed_identity_client_id=managed_identity_client_id)
    secret_client = SecretClient(vault_url=f"https://{key_vault_name}.vault.azure.net/", credential=credential)  # Create a secret client object using the credential and Key Vault name  
    return(secret_client.get_secret(secret_name).value) # Retrieve the secret value  

server = get_secrets_from_kv(key_vault_name,"SQLDB-SERVER")
database = get_secrets_from_kv(key_vault_name,"SQLDB-DATABASE")
username = get_secrets_from_kv(key_vault_name,"SQLDB-USERNAME")
password = get_secrets_from_kv(key_vault_name,"SQLDB-PASSWORD")

conn = pymssql.connect(server, username, password, database)
cursor = conn.cursor()

from azure.storage.filedatalake import (
    DataLakeServiceClient
)

account_name = get_secrets_from_kv(key_vault_name, "ADLS-ACCOUNT-NAME")
credential = DefaultAzureCredential(managed_identity_client_id=managed_identity_client_id)

account_url = f"https://{account_name}.dfs.core.windows.net"

service_client = DataLakeServiceClient(account_url, credential=credential,api_version='2023-01-03') 


file_system_client_name = "data"
directory = 'clientdata' 

file_system_client = service_client.get_file_system_client(file_system_client_name)  
directory_name = directory

cursor = conn.cursor()

cursor.execute('DROP TABLE IF EXISTS Clients')
conn.commit()

create_client_sql = """CREATE TABLE Clients (
                ClientId int NOT NULL PRIMARY KEY,
                Client varchar(255),
                Email varchar(255),
                Occupation varchar(255),
                MaritalStatus varchar(255),
                Dependents int
            );"""
cursor.execute(create_client_sql)
conn.commit()