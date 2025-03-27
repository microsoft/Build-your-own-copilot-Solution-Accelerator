# db.py
import os

import pymssql
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
import pyodbc
import struct


load_dotenv()

driver = "{ODBC Driver 17 for SQL Server}"
server = os.environ.get("SQLDB_SERVER")
database = os.environ.get("SQLDB_DATABASE")
username = os.environ.get("SQLDB_USERNAME")
password = os.environ.get("SQLDB_PASSWORD")
mid_id = os.environ.get("SQLDB_USER_MID")

def dict_cursor(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def get_connection():

    # conn = pymssql.connect(
    #     server=server, user=username, password=password, database=database, as_dict=True
    # )
    credential = DefaultAzureCredential(managed_identity_client_id=mid_id)

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
    return conn
