# db.py
import logging
import struct

import pyodbc
from backend.helpers.azure_credential_utils import get_azure_credential
from dotenv import load_dotenv

from backend.common.config import config

import time

load_dotenv()

driver = config.ODBC_DRIVER
server = config.SQL_SERVER
database = config.SQL_DATABASE
username = config.SQL_USERNAME
password = config.SQL_PASSWORD
mid_id = config.MID_ID


def dict_cursor(cursor):
    """
    Converts rows fetched by the cursor into a list of dictionaries.

    Args:
        cursor: A database cursor object.

    Returns:
        A list of dictionaries representing rows.
    """
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def get_connection():
    max_retries = 5
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            credential = get_azure_credential(client_id=mid_id)

            token_bytes = credential.get_token(
                "https://database.windows.net/.default"
            ).token.encode("utf-16-LE")
            token_struct = struct.pack(
                f"<I{len(token_bytes)}s", len(token_bytes), token_bytes
            )
            SQL_COPT_SS_ACCESS_TOKEN = (
                1256  # This connection option is defined by Microsoft in msodbcsql.h
            )

            # Set up the connection
            connection_string = f"DRIVER={driver};SERVER={server};DATABASE={database};"
            conn = pyodbc.connect(
                connection_string, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct}
            )
            return conn
        except pyodbc.Error as e:
            logging.error(f"Failed with Default Credential: {str(e)}")
            try:
                conn = pyodbc.connect(
                    f"DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}",
                    timeout=5,
                )
                logging.info("Connected using Username & Password")
                return conn
            except pyodbc.Error as e:
                logging.error(f"Failed with Username & Password: {str(e)}")

                if attempt < max_retries - 1:
                    logging.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    raise e


def get_client_name_from_db(client_id: str) -> str:
    """
    Connects to your SQL database and returns the client name for the given client_id.
    """

    conn = get_connection()
    cursor = conn.cursor()
    sql = "SELECT Client FROM Clients WHERE ClientId = ?"
    cursor.execute(sql, (client_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]  # The 'Client' column
    else:
        return ""


def get_client_data():
    """
    Fetches client data with their meeting information and asset values.
    Updates sample data if necessary.

    Returns:
        list: A list of dictionaries containing client information
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        sql_stmt = """
        SELECT
            ClientId,
            Client,
            Email,
            FORMAT(AssetValue, 'N0') AS AssetValue,
            ClientSummary,
            CAST(LastMeeting AS DATE) AS LastMeetingDate,
            FORMAT(CAST(LastMeeting AS DATE), 'dddd MMMM d, yyyy') AS LastMeetingDateFormatted,
            FORMAT(LastMeeting, 'hh:mm tt') AS LastMeetingStartTime,
            FORMAT(LastMeetingEnd, 'hh:mm tt') AS LastMeetingEndTime,
            CAST(NextMeeting AS DATE) AS NextMeetingDate,
            FORMAT(CAST(NextMeeting AS DATE), 'dddd MMMM d, yyyy') AS NextMeetingFormatted,
            FORMAT(NextMeeting, 'hh:mm tt') AS NextMeetingStartTime,
            FORMAT(NextMeetingEnd, 'hh:mm tt') AS NextMeetingEndTime
        FROM (
            SELECT ca.ClientId, Client, Email, AssetValue, ClientSummary, LastMeeting, LastMeetingEnd, NextMeeting, NextMeetingEnd
            FROM (
                SELECT c.ClientId, c.Client, c.Email, a.AssetValue, cs.ClientSummary
                FROM Clients c
                JOIN (
                    SELECT a.ClientId, a.Investment AS AssetValue
                    FROM (
                        SELECT ClientId, sum(Investment) as Investment,
                            ROW_NUMBER() OVER (PARTITION BY ClientId ORDER BY AssetDate DESC) AS RowNum
                        FROM Assets
                group by ClientId,AssetDate
                    ) a
                    WHERE a.RowNum = 1
                ) a ON c.ClientId = a.ClientId
                JOIN ClientSummaries cs ON c.ClientId = cs.ClientId
            ) ca
            JOIN (
                SELECT cm.ClientId,
                    MAX(CASE WHEN StartTime < GETDATE() THEN StartTime END) AS LastMeeting,
                    DATEADD(MINUTE, 30, MAX(CASE WHEN StartTime < GETDATE() THEN StartTime END)) AS LastMeetingEnd,
                    MIN(CASE WHEN StartTime > GETDATE() AND StartTime < GETDATE() + 7 THEN StartTime END) AS NextMeeting,
                    DATEADD(MINUTE, 30, MIN(CASE WHEN StartTime > GETDATE() AND StartTime < GETDATE() + 7 THEN StartTime END)) AS NextMeetingEnd
                FROM ClientMeetings cm
                GROUP BY cm.ClientId
            ) cm ON ca.ClientId = cm.ClientId
        ) x
        WHERE NextMeeting IS NOT NULL
        ORDER BY NextMeeting ASC;
        """
        cursor.execute(sql_stmt)
        rows = dict_cursor(cursor)

        if len(rows) <= 6:
            update_sample_data(conn)

        formatted_users = []
        for row in rows:
            user = {
                "ClientId": row["ClientId"],
                "ClientName": row["Client"],
                "ClientEmail": row["Email"],
                "AssetValue": row["AssetValue"],
                "NextMeeting": row["NextMeetingFormatted"],
                "NextMeetingTime": row["NextMeetingStartTime"],
                "NextMeetingEndTime": row["NextMeetingEndTime"],
                "LastMeeting": row["LastMeetingDateFormatted"],
                "LastMeetingStartTime": row["LastMeetingStartTime"],
                "LastMeetingEndTime": row["LastMeetingEndTime"],
                "ClientSummary": row["ClientSummary"],
            }
            formatted_users.append(user)

        return formatted_users

    except Exception as e:
        logging.exception("Exception occurred in get_client_data")
        raise e
    finally:
        if conn:
            conn.close()


def update_sample_data(conn):
    """
    Updates sample data in ClientMeetings, Assets, and Retirement tables to use current dates.

    Args:
        conn: Database connection object
    """
    try:
        cursor = conn.cursor()
        combined_stmt = """
            WITH MaxDates AS (
                SELECT
                    MAX(CAST(StartTime AS Date)) AS MaxClientMeetingDate,
                    MAX(AssetDate) AS MaxAssetDate,
                    MAX(StatusDate) AS MaxStatusDate
                FROM
                    (SELECT StartTime, NULL AS AssetDate, NULL AS StatusDate FROM ClientMeetings
                    UNION ALL
                    SELECT NULL AS StartTime, AssetDate, NULL AS StatusDate FROM Assets
                    UNION ALL
                    SELECT NULL AS StartTime, NULL AS AssetDate, StatusDate FROM Retirement) AS Combined
            ),
            Today AS (
                SELECT GETDATE() AS TodayDate
            ),
            DaysDifference AS (
                SELECT
                    DATEDIFF(DAY, MaxClientMeetingDate, TodayDate) + 3 AS ClientMeetingDaysDifference,
                    DATEDIFF(DAY, MaxAssetDate, TodayDate) - 30 AS AssetDaysDifference,
                    DATEDIFF(DAY, MaxStatusDate, TodayDate) - 30 AS StatusDaysDifference
                FROM MaxDates, Today
            )
            SELECT
                ClientMeetingDaysDifference,
                AssetDaysDifference / 30 AS AssetMonthsDifference,
                StatusDaysDifference / 30 AS StatusMonthsDifference
            FROM DaysDifference
        """
        cursor.execute(combined_stmt)
        date_diff_rows = dict_cursor(cursor)

        client_days = (
            date_diff_rows[0]["ClientMeetingDaysDifference"] if date_diff_rows else 0
        )
        asset_months = (
            int(date_diff_rows[0]["AssetMonthsDifference"]) if date_diff_rows else 0
        )
        status_months = (
            int(date_diff_rows[0]["StatusMonthsDifference"]) if date_diff_rows else 0
        )

        # Update ClientMeetings
        if client_days > 0:
            client_update_stmt = f"UPDATE ClientMeetings SET StartTime = DATEADD(day, {client_days}, StartTime), EndTime = DATEADD(day, {client_days}, EndTime)"
            cursor.execute(client_update_stmt)
            conn.commit()

        # Update Assets
        if asset_months > 0:
            asset_update_stmt = f"UPDATE Assets SET AssetDate = DATEADD(month, {asset_months}, AssetDate)"
            cursor.execute(asset_update_stmt)
            conn.commit()

        # Update Retirement
        if status_months > 0:
            retire_update_stmt = f"UPDATE Retirement SET StatusDate = DATEADD(month, {status_months}, StatusDate)"
            cursor.execute(retire_update_stmt)
            conn.commit()

        logging.info("Sample data updated successfully")
    except Exception as e:
        logging.exception("Error updating sample data")
        raise e
