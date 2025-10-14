"""Configuration module for environment variables and Azure service settings.

This module defines the Config class, which loads configuration values from
environment variables for SQL Database, Azure OpenAI, Azure AI Search, and
other related services.
"""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    def __init__(self):

        # UI configuration (optional)
        self.UI_TITLE = os.environ.get("UI_TITLE") or "Mira-Wise"
        self.UI_LOGO = os.environ.get("UI_LOGO")
        self.UI_CHAT_LOGO = os.environ.get("UI_CHAT_LOGO")
        self.UI_CHAT_TITLE = os.environ.get("UI_CHAT_TITLE") or "Start chatting"
        self.UI_CHAT_DESCRIPTION = (
            os.environ.get("UI_CHAT_DESCRIPTION")
            or "This chatbot is configured to answer your questions"
        )
        self.UI_FAVICON = os.environ.get("UI_FAVICON") or "/favicon.ico"
        self.UI_SHOW_SHARE_BUTTON = (
            os.environ.get("UI_SHOW_SHARE_BUTTON", "true").lower() == "true"
        )

        # Application Insights Instrumentation Key
        self.INSTRUMENTATION_KEY = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
        self.APPLICATIONINSIGHTS_CONNECTION_STRING = os.getenv(
            "APPLICATIONINSIGHTS_CONNECTION_STRING"
        )

        self.DEBUG = os.environ.get("DEBUG", "false")

        # Current minimum Azure OpenAI version supported
        self.MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION = "2024-02-15-preview"

        # On Your Data Settings
        self.DATASOURCE_TYPE = os.environ.get("DATASOURCE_TYPE", "AzureCognitiveSearch")

        # ACS Integration Settings
        self.AZURE_SEARCH_ENDPOINT = os.environ.get("AZURE_AI_SEARCH_ENDPOINT")
        self.AZURE_SEARCH_SERVICE = os.environ.get("AZURE_SEARCH_SERVICE")
        self.AZURE_SEARCH_INDEX = os.environ.get("AZURE_SEARCH_INDEX")
        self.AZURE_SEARCH_KEY = os.environ.get("AZURE_SEARCH_KEY", None)
        self.AZURE_SEARCH_USE_SEMANTIC_SEARCH = os.environ.get(
            "AZURE_SEARCH_USE_SEMANTIC_SEARCH", "false"
        )
        self.AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG = os.environ.get(
            "AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG", "default"
        )
        self.AZURE_SEARCH_TOP_K = os.environ.get("AZURE_SEARCH_TOP_K", 5)
        self.AZURE_SEARCH_ENABLE_IN_DOMAIN = os.environ.get(
            "AZURE_SEARCH_ENABLE_IN_DOMAIN", "true"
        )
        self.AZURE_SEARCH_CONTENT_COLUMNS = os.environ.get(
            "AZURE_SEARCH_CONTENT_COLUMNS"
        )
        self.AZURE_SEARCH_FILENAME_COLUMN = os.environ.get(
            "AZURE_SEARCH_FILENAME_COLUMN"
        )
        self.AZURE_SEARCH_TITLE_COLUMN = os.environ.get("AZURE_SEARCH_TITLE_COLUMN")
        self.AZURE_SEARCH_URL_COLUMN = os.environ.get("AZURE_SEARCH_URL_COLUMN")
        self.AZURE_SEARCH_VECTOR_COLUMNS = os.environ.get("AZURE_SEARCH_VECTOR_COLUMNS")
        self.AZURE_SEARCH_QUERY_TYPE = os.environ.get("AZURE_SEARCH_QUERY_TYPE")
        self.AZURE_SEARCH_PERMITTED_GROUPS_COLUMN = os.environ.get(
            "AZURE_SEARCH_PERMITTED_GROUPS_COLUMN"
        )
        self.AZURE_SEARCH_STRICTNESS = os.environ.get("AZURE_SEARCH_STRICTNESS", 3)
        self.AZURE_SEARCH_CONNECTION_NAME = os.environ.get(
            "AZURE_SEARCH_CONNECTION_NAME", "foundry-search-connection"
        )

        # AOAI Integration Settings
        self.AZURE_OPENAI_RESOURCE = os.environ.get("AZURE_OPENAI_RESOURCE")
        self.AZURE_OPENAI_MODEL = os.environ.get("AZURE_OPENAI_MODEL")
        self.AZURE_OPENAI_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT")
        self.AZURE_OPENAI_KEY = os.environ.get("AZURE_OPENAI_KEY")
        self.AZURE_OPENAI_TEMPERATURE = os.environ.get("AZURE_OPENAI_TEMPERATURE", 0)
        self.AZURE_OPENAI_TOP_P = os.environ.get("AZURE_OPENAI_TOP_P", 1.0)
        self.AZURE_OPENAI_MAX_TOKENS = os.environ.get("AZURE_OPENAI_MAX_TOKENS", 1000)
        self.AZURE_OPENAI_STOP_SEQUENCE = os.environ.get("AZURE_OPENAI_STOP_SEQUENCE")
        self.AZURE_OPENAI_SYSTEM_MESSAGE = os.environ.get(
            "AZURE_OPENAI_SYSTEM_MESSAGE",
            "You are an AI assistant that helps people find information.",
        )
        self.AZURE_OPENAI_PREVIEW_API_VERSION = os.environ.get(
            "AZURE_OPENAI_PREVIEW_API_VERSION",
            self.MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION,
        )
        self.AZURE_OPENAI_STREAM = os.environ.get("AZURE_OPENAI_STREAM", "true")
        self.AZURE_OPENAI_EMBEDDING_ENDPOINT = os.environ.get(
            "AZURE_OPENAI_EMBEDDING_ENDPOINT"
        )
        self.AZURE_OPENAI_EMBEDDING_KEY = os.environ.get("AZURE_OPENAI_EMBEDDING_KEY")
        self.AZURE_OPENAI_EMBEDDING_NAME = os.environ.get(
            "AZURE_OPENAI_EMBEDDING_NAME", ""
        )

        self.SHOULD_STREAM = (
            True if self.AZURE_OPENAI_STREAM.lower() == "true" else False
        )

        # Chat History CosmosDB Integration Settings
        self.AZURE_COSMOSDB_DATABASE = os.environ.get("AZURE_COSMOSDB_DATABASE")
        self.AZURE_COSMOSDB_ACCOUNT = os.environ.get("AZURE_COSMOSDB_ACCOUNT")
        self.AZURE_COSMOSDB_CONVERSATIONS_CONTAINER = os.environ.get(
            "AZURE_COSMOSDB_CONVERSATIONS_CONTAINER"
        )
        self.AZURE_COSMOSDB_ACCOUNT_KEY = os.environ.get("AZURE_COSMOSDB_ACCOUNT_KEY")
        self.AZURE_COSMOSDB_ENABLE_FEEDBACK = (
            os.environ.get("AZURE_COSMOSDB_ENABLE_FEEDBACK", "false").lower() == "true"
        )
        self.USE_INTERNAL_STREAM = (
            os.environ.get("USE_INTERNAL_STREAM", "false").lower() == "true"
        )
        # Frontend Settings via Environment Variables
        self.AUTH_ENABLED = os.environ.get("AUTH_ENABLED", "true").lower() == "true"
        self.CHAT_HISTORY_ENABLED = (
            self.AZURE_COSMOSDB_ACCOUNT
            and self.AZURE_COSMOSDB_DATABASE
            and self.AZURE_COSMOSDB_CONVERSATIONS_CONTAINER
        )
        self.SANITIZE_ANSWER = (
            os.environ.get("SANITIZE_ANSWER", "false").lower() == "true"
        )

        # AI Project Client configuration
        self.USE_AI_PROJECT_CLIENT = (
            os.getenv("USE_AI_PROJECT_CLIENT", "False").lower() == "true"
        )
        self.AI_PROJECT_ENDPOINT = os.getenv("AZURE_AI_AGENT_ENDPOINT")

        # SQL Database configuration
        self.SQL_DATABASE = os.getenv("SQLDB_DATABASE")
        self.SQL_SERVER = os.getenv("SQLDB_SERVER")
        self.SQL_USERNAME = os.getenv("SQLDB_USERNAME")
        self.SQL_PASSWORD = os.getenv("SQLDB_PASSWORD")
        self.ODBC_DRIVER = "{ODBC Driver 18 for SQL Server}"
        self.MID_ID = os.getenv("AZURE_CLIENT_ID")
        self.SQL_MID_ID = os.getenv("SQLDB_USER_MID")

        # System Prompts
        self.SQL_SYSTEM_PROMPT = os.environ.get("AZURE_SQL_SYSTEM_PROMPT")
        self.CALL_TRANSCRIPT_SYSTEM_PROMPT = os.environ.get(
            "AZURE_CALL_TRANSCRIPT_SYSTEM_PROMPT"
        )
        self.STREAM_TEXT_SYSTEM_PROMPT = os.environ.get(
            "AZURE_OPENAI_STREAM_TEXT_SYSTEM_PROMPT"
        )


config = Config()
