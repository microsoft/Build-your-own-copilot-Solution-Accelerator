#!/usr/bin/env python3
"""Assign SQL roles for Azure AD principals (managed identities/service principals) using Azure AD token auth.

Simplified: requires --server and --database provided explicitly (no Key Vault lookup).
Roles JSON format (single arg):
[
    {"clientId":"<guid>", "displayName":"Name", "role":"db_datareader"},
    {"clientId":"<guid>", "displayName":"Name", "role":"db_datawriter"}
]

Uses pyodbc + azure-identity (AzureCliCredential)."""
import argparse
import json
import struct
import sys
from typing import List, Dict

import pyodbc
from azure.identity import AzureCliCredential

SQL_COPT_SS_ACCESS_TOKEN = 1256  # msodbcsql.h constant


def build_sql(role_items: List[Dict]) -> str:
    statements = []
    for idx, item in enumerate(role_items, start=1):
        client_id = item["clientId"].strip()
        display_name = item["displayName"].replace("'", "''")
        role = item["role"].strip()
        # Construct dynamic SQL similar to prior bash script
        stmt = f"""
DECLARE @username{idx} nvarchar(max) = N'{display_name}';
DECLARE @clientId{idx} uniqueidentifier = '{client_id}';
DECLARE @sid{idx} NVARCHAR(max) = CONVERT(VARCHAR(max), CONVERT(VARBINARY(16), @clientId{idx}), 1);
DECLARE @cmd{idx} NVARCHAR(max) = N'CREATE USER [' + @username{idx} + '] WITH SID = ' + @sid{idx} + ', TYPE = E;';
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = @username{idx})
BEGIN
    EXEC(@cmd{idx})
END
EXEC sp_addrolemember '{role}', @username{idx};
""".strip()
        statements.append(stmt)
    return "\n".join(statements)


def connect_with_token(server: str, database: str, credential: AzureCliCredential):
    token_bytes = credential.get_token("https://database.windows.net/.default").token.encode("utf-16-le")
    token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
    for driver in ["{ODBC Driver 18 for SQL Server}", "{ODBC Driver 17 for SQL Server}"]:
        try:
            conn_str = f"DRIVER={driver};SERVER={server};DATABASE={database};"
            return pyodbc.connect(conn_str, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct})
        except pyodbc.Error:
            continue
    raise RuntimeError("Unable to connect using ODBC Driver 18 or 17. Install driver msodbcsql17/18.")


def execute_sql(conn, sql: str):
    cursor = conn.cursor()
    # Split on GO batches if present (simple handling)
    batches = []
    current = []
    for line in sql.splitlines():
        if line.strip().upper() == "GO":
            if current:
                batches.append("\n".join(current))
                current = []
        else:
            current.append(line)
    if current:
        batches.append("\n".join(current))

    for batch in batches:
        if batch.strip():
            cursor.execute(batch)
    conn.commit()
    cursor.close()


def main():
    parser = argparse.ArgumentParser(description="Assign SQL roles for Azure AD principals.")
    parser.add_argument("--server", required=True, help="SQL server FQDN (e.g. myserver.database.windows.net)")
    parser.add_argument("--database", required=True, help="Database name")
    parser.add_argument("--roles-json", required=True, help="JSON array of role assignment objects")
    args = parser.parse_args()

    try:
        role_items = json.loads(args.roles_json)
        if not isinstance(role_items, list):
            raise ValueError("roles-json must be a JSON array")
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"Error parsing roles-json: {e}", file=sys.stderr)
        return 1

    credential = AzureCliCredential()

    try:
        server, database = args.server, args.database
        print(f"Target SQL: {server} / {database}")
        sql = build_sql(role_items)
        conn = connect_with_token(server, database, credential)
        print("Connected. Assigning roles...")
        execute_sql(conn, sql)
        conn.close()
        print("Role assignment completed successfully.")
        return 0
    except pyodbc.Error as e:
        print(f"Database error during role assignment: {e}", file=sys.stderr)
        return 1
    except (RuntimeError, OSError) as e:
        print(f"Environment error during role assignment: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
