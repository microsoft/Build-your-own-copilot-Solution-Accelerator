key_vault_name = "kv_to-be-replaced"
managed_identity_client_id = "mici_to-be-replaced"

import os
import struct
from datetime import datetime

import pandas as pd
import pyodbc
from azure.identity import AzureCliCredential
from azure.keyvault.secrets import SecretClient


def get_secrets_from_kv(kv_name, secret_name):
    key_vault_name = kv_name  # Set the name of the Azure Key Vault
    credential = AzureCliCredential()  # Use Azure CLI Credential
    secret_client = SecretClient(
        vault_url=f"https://{key_vault_name}.vault.azure.net/", credential=credential
    )  # Create a secret client object using the credential and Key Vault name
    return secret_client.get_secret(secret_name).value  # Retrieve the secret value


server = get_secrets_from_kv(key_vault_name, "SQLDB-SERVER")
database = get_secrets_from_kv(key_vault_name, "SQLDB-DATABASE")
driver = "{ODBC Driver 18 for SQL Server}"


credential = AzureCliCredential()  # Use Azure CLI Credential

token_bytes = credential.get_token(
    "https://database.windows.net/.default"
).token.encode("utf-16-LE")
token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
SQL_COPT_SS_ACCESS_TOKEN = (
    1256  # This connection option is defined by microsoft in msodbcsql.h
)

# Set up the connection
connection_string = f"DRIVER={driver};SERVER={server};DATABASE={database};"
conn = pyodbc.connect(
    connection_string, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct}
)
cursor = conn.cursor()

from azure.storage.filedatalake import DataLakeServiceClient

account_name = get_secrets_from_kv(key_vault_name, "ADLS-ACCOUNT-NAME")
credential = AzureCliCredential()  # Use Azure CLI Credential

account_url = f"https://{account_name}.dfs.core.windows.net"

service_client = DataLakeServiceClient(
    account_url, credential=credential, api_version="2023-01-03"
)

file_system_client_name = "data"
directory = "clientdata"

file_system_client = service_client.get_file_system_client(file_system_client_name)
directory_name = directory

cursor = conn.cursor()

cursor.execute("DROP TABLE IF EXISTS Clients")
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

# Read the CSV file into a Pandas DataFrame
file_path = directory + "/Clients.csv"
file_client = file_system_client.get_file_client(file_path)
csv_file = file_client.download_file()
df = pd.read_csv(csv_file, encoding="utf-8")

for index, item in df.iterrows():
    cursor.execute(
        f"INSERT INTO Clients (ClientId,Client, Email, Occupation, MaritalStatus, Dependents) VALUES (?,?,?,?,?,?)",
        (
            item.ClientId,
            item.Client,
            item.Email,
            item.Occupation,
            item.MaritalStatus,
            item.Dependents,
        ),
    )
conn.commit()


cursor = conn.cursor()

# #ClientInvestmentPortfolio
# cursor.execute('DROP TABLE IF EXISTS ClientInvestmentPortfolio')
# conn.commit()

# create_client_sql = """CREATE TABLE ClientInvestmentPortfolio (
#                 ClientId int,
#                 AssetDate date,
#                 AssetType varchar(255),
#                 Investment float,
#                 ROI float,
#                 RevenueWithoutStrategy float
#             );"""

# cursor.execute(create_client_sql)
# conn.commit()


# file_path = directory + '/ClientInvestmentPortfolio.csv'
# file_client = file_system_client.get_file_client(file_path)
# csv_file = file_client.download_file()
# df = pd.read_csv(csv_file, encoding='utf-8')

# for index, item in df.iterrows():
#     cursor.execute(f"INSERT INTO ClientInvestmentPortfolio (ClientId, AssetDate, AssetType, Investment, ROI, RevenueWithoutStrategy) VALUES (?,?, ?,?, ?, ?)", (item.ClientId, item.AssetDate, item.AssetType, item.Investment, item.ROI, item.RevenueWithoutStrategy))

# conn.commit()


from decimal import Decimal

cursor.execute("DROP TABLE IF EXISTS Assets")
conn.commit()

create_assets_sql = """CREATE TABLE Assets (
                ClientId int NOT NULL,
                AssetDate Date,
                Investment Decimal(18,2),
                ROI Decimal(18,2),
                Revenue Decimal(18,2),
                AssetType varchar(255)
            );"""

cursor.execute(create_assets_sql)
conn.commit()

file_path = directory + "/Assets.csv"
file_client = file_system_client.get_file_client(file_path)
csv_file = file_client.download_file()
df = pd.read_csv(csv_file, encoding="utf-8")

# # to adjust the dates to current date
df["AssetDate"] = pd.to_datetime(df["AssetDate"])
today = datetime.today()
days_difference = (today - max(df["AssetDate"])).days - 30
months_difference = int(days_difference / 30)
# print(months_difference)
# df['AssetDate'] = df['AssetDate'] + pd.Timedelta(days=days_difference)
df["AssetDate"] = df["AssetDate"] + pd.DateOffset(months=months_difference)

df["AssetDate"] = pd.to_datetime(df["AssetDate"], format="%m/%d/%Y")  #   %Y-%m-%d')
df["ClientId"] = df["ClientId"].astype(int)
df["Investment"] = df["Investment"].astype(float)
df["ROI"] = df["ROI"].astype(float)
df["Revenue"] = df["Revenue"].astype(float)


for index, item in df.iterrows():
    cursor.execute(
        f"INSERT INTO Assets (ClientId,AssetDate, Investment, ROI, Revenue, AssetType) VALUES (?,?,?,?,?,?)",
        (
            item.ClientId,
            item.AssetDate,
            item.Investment,
            item.ROI,
            item.Revenue,
            item.AssetType,
        ),
    )
conn.commit()


# InvestmentGoals
cursor.execute("DROP TABLE IF EXISTS InvestmentGoals")
conn.commit()

create_ig_sql = """CREATE TABLE InvestmentGoals (
                ClientId int NOT NULL,
                InvestmentGoal varchar(255)
            );"""

cursor.execute(create_ig_sql)
conn.commit()

file_path = directory + "/InvestmentGoals.csv"
file_client = file_system_client.get_file_client(file_path)
csv_file = file_client.download_file()
df = pd.read_csv(csv_file, encoding="utf-8")

df["ClientId"] = df["ClientId"].astype(int)

for index, item in df.iterrows():
    cursor.execute(
        f"INSERT INTO InvestmentGoals (ClientId,InvestmentGoal) VALUES (?,?)",
        (item.ClientId, item.InvestmentGoal),
    )
conn.commit()


cursor.execute("DROP TABLE IF EXISTS InvestmentGoalsDetails")
conn.commit()

create_ig_sql = """CREATE TABLE InvestmentGoalsDetails (
                ClientId int NOT NULL,
                InvestmentGoal nvarchar(255), 
                TargetAmount Decimal(18,2), 
                Contribution Decimal(18,2), 
            );"""

cursor.execute(create_ig_sql)
conn.commit()

file_path = directory + "/InvestmentGoalsDetails.csv"
file_client = file_system_client.get_file_client(file_path)
csv_file = file_client.download_file()
df = pd.read_csv(csv_file, encoding="utf-8")

df["ClientId"] = df["ClientId"].astype(int)

for index, item in df.iterrows():
    cursor.execute(
        f"INSERT INTO InvestmentGoalsDetails (ClientId,InvestmentGoal, TargetAmount, Contribution) VALUES (?,?,?,?)",
        (item.ClientId, item.InvestmentGoal, item.TargetAmount, item.Contribution),
    )
conn.commit()

# ClientSummaries
cursor.execute("DROP TABLE IF EXISTS ClientSummaries")
conn.commit()

create_cs_sql = """CREATE TABLE ClientSummaries (
                ClientId int NOT NULL,
                ClientSummary nvarchar(255)
            );"""

cursor.execute(create_cs_sql)
conn.commit()

file_path = directory + "/ClientSummaries.csv"
file_client = file_system_client.get_file_client(file_path)
csv_file = file_client.download_file()
df = pd.read_csv(csv_file, encoding="utf-8")

df["ClientId"] = df["ClientId"].astype(int)

for index, item in df.iterrows():
    cursor.execute(
        f"INSERT INTO ClientSummaries (ClientId,ClientSummary) VALUES (?,?)",
        (item.ClientId, item.ClientSummary),
    )
conn.commit()

# Retirement
cursor.execute("DROP TABLE IF EXISTS Retirement")
conn.commit()

create_cs_sql = """CREATE TABLE Retirement (
                ClientId int NOT NULL,
                StatusDate Date,
                RetirementGoalProgress Decimal(18,2),
                EducationGoalProgress Decimal(18,2)
            );"""

cursor.execute(create_cs_sql)
conn.commit()


file_path = directory + "/Retirement.csv"
file_client = file_system_client.get_file_client(file_path)
csv_file = file_client.download_file()
df = pd.read_csv(csv_file, encoding="utf-8")

df["ClientId"] = df["ClientId"].astype(int)

# to adjust the dates to current date
df["StatusDate"] = pd.to_datetime(df["StatusDate"])
today = datetime.today()
days_difference = (today - max(df["StatusDate"])).days - 30
months_difference = int(days_difference / 30)
df["StatusDate"] = df["StatusDate"] + pd.DateOffset(months=months_difference)
df["StatusDate"] = pd.to_datetime(df["StatusDate"]).dt.date

for index, item in df.iterrows():
    cursor.execute(
        f"INSERT INTO Retirement (ClientId,StatusDate, RetirementGoalProgress, EducationGoalProgress) VALUES (?,?,?,?)",
        (
            item.ClientId,
            item.StatusDate,
            item.RetirementGoalProgress,
            item.EducationGoalProgress,
        ),
    )
conn.commit()


import pandas as pd

cursor = conn.cursor()

cursor.execute("DROP TABLE IF EXISTS ClientMeetings")
conn.commit()

create_cs_sql = """CREATE TABLE ClientMeetings (
                ClientId int NOT NULL,
                ConversationId nvarchar(255),
                Title nvarchar(255),
                StartTime DateTime,
                EndTime DateTime,
                Advisor nvarchar(255),
                ClientEmail nvarchar(255)
            );"""

cursor.execute(create_cs_sql)
conn.commit()


file_path = directory + "/ClientMeetingsMetadata.csv"
file_client = file_system_client.get_file_client(file_path)
csv_file = file_client.download_file()
df = pd.read_csv(csv_file, encoding="utf-8")

# to adjust the dates to current date
df["StartTime"] = pd.to_datetime(df["StartTime"])
df["EndTime"] = pd.to_datetime(df["EndTime"])
today = datetime.today()
days_difference = (today - min(df["StartTime"])).days - 30
days_difference

df["StartTime"] = df["StartTime"] + pd.Timedelta(days=days_difference)
df["EndTime"] = df["EndTime"] + pd.Timedelta(days=days_difference)

for index, item in df.iterrows():

    cursor.execute(
        f"INSERT INTO ClientMeetings (ClientId,ConversationId,Title,StartTime,EndTime,Advisor,ClientEmail) VALUES (?,?,?,?,?,?,?)",
        (
            item.ClientId,
            item.ConversationId,
            item.Title,
            item.StartTime,
            item.EndTime,
            item.Advisor,
            item.ClientEmail,
        ),
    )
conn.commit()


file_path = directory + "/ClientFutureMeetings.csv"
file_client = file_system_client.get_file_client(file_path)
csv_file = file_client.download_file()
df = pd.read_csv(csv_file, encoding="utf-8")

# to adjust the dates to current date
df["StartTime"] = pd.to_datetime(df["StartTime"])
df["EndTime"] = pd.to_datetime(df["EndTime"])
today = datetime.today()
days_difference = (today - min(df["StartTime"])).days + 1
df["StartTime"] = df["StartTime"] + pd.Timedelta(days=days_difference)
df["EndTime"] = df["EndTime"] + pd.Timedelta(days=days_difference)

df["ClientId"] = df["ClientId"].astype(int)
df["ConversationId"] = ""

for index, item in df.iterrows():
    cursor.execute(
        f"INSERT INTO ClientMeetings (ClientId,ConversationId,Title,StartTime,EndTime,Advisor,ClientEmail) VALUES (?,?,?,?,?,?,?)",
        (
            item.ClientId,
            item.ConversationId,
            item.Title,
            item.StartTime,
            item.EndTime,
            item.Advisor,
            item.ClientEmail,
        ),
    )
conn.commit()
