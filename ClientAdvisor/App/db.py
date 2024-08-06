# db.py
import os
import pymssql
from dotenv import load_dotenv

load_dotenv()

server = os.environ.get('SQLDB_SERVER')
database = os.environ.get('SQLDB_DATABASE')
username = os.environ.get('SQLDB_USERNAME')
password = os.environ.get('SQLDB_PASSWORD')

def get_connection():

    conn = pymssql.connect(
        server=server,
        user=username,
        password=password,
        database=database,
        as_dict=True
    )  
    return conn
 