import copy
import json
import logging
import os
import time
import uuid
from types import SimpleNamespace

from azure.identity import get_bearer_token_provider
from backend.helpers.azure_credential_utils import get_azure_credential
from azure.monitor.opentelemetry import configure_azure_monitor

# from quart.sessions import SecureCookieSessionInterface
from openai import AsyncAzureOpenAI
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from quart import (
    Blueprint,
    Quart,
    Response,
    jsonify,
    render_template,
    request,
    send_from_directory,
)

from backend.agents.agent_factory import AgentFactory
from backend.auth.auth_utils import get_authenticated_user_details, get_tenantid
from backend.common.config import config
from backend.common.event_utils import track_event_if_configured
from backend.common.utils import (
    format_stream_response,
    generateFilterString,
    parse_multi_columns,
)
from backend.services import sqldb_service
from backend.services.chat_service import stream_response_from_wealth_assistant
from backend.services.cosmosdb_service import CosmosConversationClient

bp = Blueprint("routes", __name__, static_folder="static", template_folder="static")

# app = Flask(__name__)
# CORS(app)

# Check if the Application Insights Instrumentation Key is set in the environment variables
instrumentation_key = config.INSTRUMENTATION_KEY
if instrumentation_key:
    # Configure Application Insights if the Instrumentation Key is found
    configure_azure_monitor(connection_string=instrumentation_key)
    logging.info(
        "Application Insights configured with the provided Instrumentation Key"
    )
else:
    # Log a warning if the Instrumentation Key is not found
    logging.warning(
        "No Application Insights Instrumentation Key found. Skipping configuration"
    )

# Configure logging
logging.basicConfig(level=logging.INFO)

# Suppress INFO logs from 'azure.core.pipeline.policies.http_logging_policy'
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(
    logging.WARNING
)
logging.getLogger("azure.identity.aio._internal").setLevel(logging.WARNING)

# Suppress info logs from OpenTelemetry exporter
logging.getLogger("azure.monitor.opentelemetry.exporter.export._base").setLevel(
    logging.WARNING
)


def create_app():
    app = Quart(__name__)
    app.register_blueprint(bp)
    app.config["TEMPLATES_AUTO_RELOAD"] = True

    # Setup agent initialization and cleanup
    @app.before_serving
    async def startup():
        app.wealth_advisor_agent = await AgentFactory.get_wealth_advisor_agent()
        logging.info("Wealth Advisor Agent initialized during application startup")
        app.search_agent = await AgentFactory.get_search_agent()
        logging.info("Call Transcript Search Agent initialized during application startup")
        app.sql_agent = await AgentFactory.get_sql_agent()
        logging.info("SQL Agent initialized during application startup")

    @app.after_serving
    async def shutdown():
        try:
            logging.info("Application shutdown initiated...")
            await AgentFactory.delete_all_agent_instance()
            if hasattr(app, 'wealth_advisor_agent'):
                app.wealth_advisor_agent = None
            if hasattr(app, 'search_agent'):
                app.search_agent = None
            if hasattr(app, 'sql_agent'):
                app.sql_agent = None
            logging.info("Agents cleaned up successfully")
        except Exception as e:
            logging.error(f"Error during shutdown: {e}")
            logging.exception("Detailed error during shutdown")

    # app.secret_key = secrets.token_hex(16)
    # app.session_interface = SecureCookieSessionInterface()
    return app


@bp.route("/")
async def index():
    return await render_template(
        "index.html", title=config.UI_TITLE, favicon=config.UI_FAVICON
    )


@bp.route("/favicon.ico")
async def favicon():
    return await bp.send_static_file("favicon.ico")


@bp.route("/assets/<path:path>")
async def assets(path):
    return await send_from_directory("static/assets", path)


# Debug settings
DEBUG = os.environ.get("DEBUG", "false")
if DEBUG.lower() == "true":
    logging.basicConfig(level=logging.DEBUG)

USER_AGENT = "GitHubSampleWebApp/AsyncAzureOpenAI/1.0.0"

frontend_settings = {
    "auth_enabled": config.AUTH_ENABLED,
    "feedback_enabled": config.AZURE_COSMOSDB_ENABLE_FEEDBACK
    and config.CHAT_HISTORY_ENABLED,
    "ui": {
        "title": config.UI_TITLE,
        "logo": config.UI_LOGO,
        "chat_logo": config.UI_CHAT_LOGO or config.UI_LOGO,
        "chat_title": config.UI_CHAT_TITLE,
        "chat_description": config.UI_CHAT_DESCRIPTION,
        "show_share_button": config.UI_SHOW_SHARE_BUTTON,
    },
    "sanitize_answer": config.SANITIZE_ANSWER,
}
# Enable Microsoft Defender for Cloud Integration
MS_DEFENDER_ENABLED = os.environ.get("MS_DEFENDER_ENABLED", "false").lower() == "true"
# VITE_POWERBI_EMBED_URL = os.environ.get("VITE_POWERBI_EMBED_URL")


def should_use_data():
    global DATASOURCE_TYPE
    if config.AZURE_SEARCH_SERVICE and config.AZURE_SEARCH_INDEX:
        DATASOURCE_TYPE = "AzureCognitiveSearch"
        logging.debug("Using Azure Cognitive Search")
        return True

    return False


SHOULD_USE_DATA = should_use_data()


# Initialize Azure OpenAI Client
def init_openai_client(use_data=SHOULD_USE_DATA):
    azure_openai_client = None
    try:
        # API version check
        if (
            config.AZURE_OPENAI_PREVIEW_API_VERSION
            < config.MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION
        ):
            raise Exception(
                f"The minimum supported Azure OpenAI preview API version is '{config.MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION}'"
            )

        # Endpoint
        if not config.AZURE_OPENAI_ENDPOINT and not config.AZURE_OPENAI_RESOURCE:
            raise Exception(
                "AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_RESOURCE is required"
            )

        endpoint = (
            config.AZURE_OPENAI_ENDPOINT
            if config.AZURE_OPENAI_ENDPOINT
            else f"https://{config.AZURE_OPENAI_RESOURCE}.openai.azure.com/"
        )

        # Authentication
        aoai_api_key = config.AZURE_OPENAI_KEY
        ad_token_provider = None
        if not aoai_api_key:
            logging.debug("No AZURE_OPENAI_KEY found, using Azure AD auth")
            ad_token_provider = get_bearer_token_provider(
                get_azure_credential(config.MID_ID), "https://cognitiveservices.azure.com/.default"
            )

        # Deployment
        deployment = config.AZURE_OPENAI_MODEL
        if not deployment:
            raise Exception("AZURE_OPENAI_MODEL is required")

        # Default Headers
        default_headers = {"x-ms-useragent": USER_AGENT}

        azure_openai_client = AsyncAzureOpenAI(
            api_version=config.AZURE_OPENAI_PREVIEW_API_VERSION,
            api_key=aoai_api_key,
            azure_ad_token_provider=ad_token_provider,
            default_headers=default_headers,
            azure_endpoint=endpoint,
        )

        track_event_if_configured(
            "AzureOpenAIClientInitialized",
            {
                "status": "success",
                "endpoint": endpoint,
                "use_api_key": bool(aoai_api_key),
            },
        )

        return azure_openai_client
    except Exception as e:
        logging.exception("Exception in Azure OpenAI initialization", e)
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        azure_openai_client = None
        raise e


def init_cosmosdb_client():
    cosmos_conversation_client = None
    if config.CHAT_HISTORY_ENABLED:
        try:
            cosmos_endpoint = (
                f"https://{config.AZURE_COSMOSDB_ACCOUNT}.documents.azure.com:443/"
            )

            if not config.AZURE_COSMOSDB_ACCOUNT_KEY:
                credential = get_azure_credential(config.MID_ID)
            else:
                credential = config.AZURE_COSMOSDB_ACCOUNT_KEY

            cosmos_conversation_client = CosmosConversationClient(
                cosmosdb_endpoint=cosmos_endpoint,
                credential=credential,
                database_name=config.AZURE_COSMOSDB_DATABASE,
                container_name=config.AZURE_COSMOSDB_CONVERSATIONS_CONTAINER,
                enable_message_feedback=config.AZURE_COSMOSDB_ENABLE_FEEDBACK,
            )

            track_event_if_configured(
                "CosmosDBClientInitialized",
                {
                    "status": "success",
                    "endpoint": cosmos_endpoint,
                    "database": config.AZURE_COSMOSDB_DATABASE,
                    "container": config.AZURE_COSMOSDB_CONVERSATIONS_CONTAINER,
                    "feedback_enabled": config.AZURE_COSMOSDB_ENABLE_FEEDBACK,
                },
            )
        except Exception as e:
            logging.exception("Exception in CosmosDB initialization", e)
            span = trace.get_current_span()
            if span is not None:
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
            cosmos_conversation_client = None
            raise e
    else:
        logging.debug("CosmosDB not configured")

    return cosmos_conversation_client


def get_configured_data_source():
    data_source = {}
    query_type = "simple"
    if DATASOURCE_TYPE == "AzureCognitiveSearch":
        track_event_if_configured(
            "datasource_selected", {"type": "AzureCognitiveSearch"}
        )
        # Set query type
        if config.AZURE_SEARCH_QUERY_TYPE:
            query_type = config.AZURE_SEARCH_QUERY_TYPE
        elif (
            config.AZURE_SEARCH_USE_SEMANTIC_SEARCH.lower() == "true"
            and config.AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG
        ):
            query_type = "semantic"
        track_event_if_configured("query_type_determined", {"query_type": query_type})

        # Set filter
        filter = None
        userToken = None
        if config.AZURE_SEARCH_PERMITTED_GROUPS_COLUMN:
            userToken = request.headers.get("X-MS-TOKEN-AAD-ACCESS-TOKEN", "")
            logging.debug(f"USER TOKEN is {'present' if userToken else 'not present'}")
            if not userToken:
                track_event_if_configured("user_token_missing", {})
                raise Exception(
                    "Document-level access control is enabled, but user access token could not be fetched."
                )

            filter = generateFilterString(userToken)
            track_event_if_configured("filter_generated", {"filter": filter})
            logging.debug(f"FILTER: {filter}")

        # Set authentication
        authentication = {}
        if config.AZURE_SEARCH_KEY:
            authentication = {"type": "api_key", "api_key": config.AZURE_SEARCH_KEY}
        else:
            # If key is not provided, assume AOAI resource identity has been granted access to the search service
            authentication = {"type": "system_assigned_managed_identity"}
        track_event_if_configured(
            "authentication_set", {"auth_type": authentication["type"]}
        )

        data_source = {
            "type": "azure_search",
            "parameters": {
                "endpoint": f"https://{config.AZURE_SEARCH_SERVICE}.search.windows.net",
                "authentication": authentication,
                "index_name": config.AZURE_SEARCH_INDEX,
                "fields_mapping": {
                    "content_fields": (
                        parse_multi_columns(config.AZURE_SEARCH_CONTENT_COLUMNS)
                        if config.AZURE_SEARCH_CONTENT_COLUMNS
                        else []
                    ),
                    "title_field": (
                        config.AZURE_SEARCH_TITLE_COLUMN
                        if config.AZURE_SEARCH_TITLE_COLUMN
                        else None
                    ),
                    "url_field": (
                        config.AZURE_SEARCH_URL_COLUMN
                        if config.AZURE_SEARCH_URL_COLUMN
                        else None
                    ),
                    "filepath_field": (
                        config.AZURE_SEARCH_FILENAME_COLUMN
                        if config.AZURE_SEARCH_FILENAME_COLUMN
                        else None
                    ),
                    "vector_fields": (
                        parse_multi_columns(config.AZURE_SEARCH_VECTOR_COLUMNS)
                        if config.AZURE_SEARCH_VECTOR_COLUMNS
                        else []
                    ),
                },
                "in_scope": (
                    True
                    if config.AZURE_SEARCH_ENABLE_IN_DOMAIN.lower() == "true"
                    else False
                ),
                "top_n_documents": (int(config.AZURE_SEARCH_TOP_K)),
                "query_type": query_type,
                "semantic_configuration": (
                    config.AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG
                    if config.AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG
                    else ""
                ),
                "role_information": config.AZURE_OPENAI_SYSTEM_MESSAGE,
                "filter": filter,
                "strictness": (int(config.AZURE_SEARCH_STRICTNESS)),
            },
        }
    else:
        track_event_if_configured("unknown_datasource_type", {"type": DATASOURCE_TYPE})
        raise Exception(
            f"DATASOURCE_TYPE is not configured or unknown: {DATASOURCE_TYPE}"
        )

    if "vector" in query_type.lower() and DATASOURCE_TYPE != "AzureMLIndex":
        embeddingDependency = {}
        if config.AZURE_OPENAI_EMBEDDING_NAME:
            embeddingDependency = {
                "type": "deployment_name",
                "deployment_name": config.AZURE_OPENAI_EMBEDDING_NAME,
            }
        elif (
            config.AZURE_OPENAI_EMBEDDING_ENDPOINT and config.AZURE_OPENAI_EMBEDDING_KEY
        ):
            embeddingDependency = {
                "type": "endpoint",
                "endpoint": config.AZURE_OPENAI_EMBEDDING_ENDPOINT,
                "authentication": {
                    "type": "api_key",
                    "key": config.AZURE_OPENAI_EMBEDDING_KEY,
                },
            }
        else:
            track_event_if_configured(
                "embedding_dependency_missing",
                {"datasource_type": DATASOURCE_TYPE, "query_type": query_type},
            )
            raise Exception(
                f"Vector query type ({query_type}) is selected for data source type {DATASOURCE_TYPE} but no embedding dependency is configured"
            )
        track_event_if_configured(
            "embedding_dependency_set",
            {"embedding_type": embeddingDependency.get("type")},
        )
        data_source["parameters"]["embedding_dependency"] = embeddingDependency
    track_event_if_configured(
        "get_configured_data_source_complete",
        {"datasource_type": DATASOURCE_TYPE, "query_type": query_type},
    )
    return data_source


def prepare_model_args(request_body, request_headers):
    track_event_if_configured("prepare_model_args_start", {})
    request_messages = request_body.get("messages", [])
    messages = []
    if not SHOULD_USE_DATA:
        messages = [{"role": "system", "content": config.AZURE_OPENAI_SYSTEM_MESSAGE}]

    for message in request_messages:
        if message:
            messages.append({"role": message["role"], "content": message["content"]})

    user_json = None
    if MS_DEFENDER_ENABLED:
        authenticated_user_details = get_authenticated_user_details(request_headers)
        tenantId = get_tenantid(authenticated_user_details.get("client_principal_b64"))
        conversation_id = request_body.get("conversation_id", None)
        user_args = {
            "EndUserId": authenticated_user_details.get("user_principal_id"),
            "EndUserIdType": "Entra",
            "EndUserTenantId": tenantId,
            "ConversationId": conversation_id,
            "SourceIp": request_headers.get(
                "X-Forwarded-For", request_headers.get("Remote-Addr", "")
            ),
        }
        user_json = json.dumps(user_args)
        track_event_if_configured(
            "ms_defender_user_info_added", {"user_id": user_args["EndUserId"]}
        )

    model_args = {
        "messages": messages,
        "temperature": float(config.AZURE_OPENAI_TEMPERATURE),
        "max_tokens": int(config.AZURE_OPENAI_MAX_TOKENS),
        "top_p": float(config.AZURE_OPENAI_TOP_P),
        "stop": (
            parse_multi_columns(config.AZURE_OPENAI_STOP_SEQUENCE)
            if config.AZURE_OPENAI_STOP_SEQUENCE
            else None
        ),
        "stream": config.SHOULD_STREAM,
        "model": config.AZURE_OPENAI_MODEL,
        "user": user_json,
    }

    if config.SHOULD_USE_DATA:
        track_event_if_configured(
            "ms_defender_user_info_added", {"user_id": user_args["EndUserId"]}
        )
        model_args["extra_body"] = {"data_sources": [get_configured_data_source()]}

    model_args_clean = copy.deepcopy(model_args)
    if model_args_clean.get("extra_body"):
        secret_params = [
            "key",
            "connection_string",
            "embedding_key",
            "encoded_api_key",
            "api_key",
        ]
        for secret_param in secret_params:
            if model_args_clean["extra_body"]["data_sources"][0]["parameters"].get(
                secret_param
            ):
                model_args_clean["extra_body"]["data_sources"][0]["parameters"][
                    secret_param
                ] = "*****"
        authentication = model_args_clean["extra_body"]["data_sources"][0][
            "parameters"
        ].get("authentication", {})
        for field in authentication:
            if field in secret_params:
                model_args_clean["extra_body"]["data_sources"][0]["parameters"][
                    "authentication"
                ][field] = "*****"
        embeddingDependency = model_args_clean["extra_body"]["data_sources"][0][
            "parameters"
        ].get("embedding_dependency", {})
        if "authentication" in embeddingDependency:
            for field in embeddingDependency["authentication"]:
                if field in secret_params:
                    model_args_clean["extra_body"]["data_sources"][0]["parameters"][
                        "embedding_dependency"
                    ]["authentication"][field] = "*****"

    logging.debug(f"REQUEST BODY: {json.dumps(model_args_clean, indent=4)}")
    track_event_if_configured(
        "prepare_model_args_complete", {"model": config.AZURE_OPENAI_MODEL}
    )

    return model_args


async def send_chat_request(request_body, request_headers):
    track_event_if_configured("send_chat_request_start", {})
    filtered_messages = []
    messages = request_body.get("messages", [])
    for message in messages:
        if message.get("role") != "tool":
            filtered_messages.append(message)

    request_body["messages"] = filtered_messages
    model_args = prepare_model_args(request_body, request_headers)

    try:
        azure_openai_client = init_openai_client()
        raw_response = (
            await azure_openai_client.chat.completions.with_raw_response.create(
                **model_args
            )
        )
        response = raw_response.parse()
        apim_request_id = raw_response.headers.get("apim-request-id")

        track_event_if_configured(
            "send_chat_request_success", {"model": model_args.get("model")}
        )
    except Exception as e:
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        logging.exception("Exception in send_chat_request")
        raise e
    return response, apim_request_id


async def stream_chat_request(request_body, request_headers):
    track_event_if_configured("stream_chat_request_start", {})
    if config.USE_INTERNAL_STREAM:
        history_metadata = request_body.get("history_metadata", {})
        apim_request_id = ""

        client_id = request_body.get("client_id")
        if client_id is None:
            track_event_if_configured("client_id_missing", {})
            return jsonify({"error": "No client ID provided"}), 400
        query = request_body.get("messages")[-1].get("content")
        track_event_if_configured("stream_internal_selected", {"client_id": client_id})

        sk_response = await stream_response_from_wealth_assistant(query, client_id)

        async def generate():
            chunk_id = str(uuid.uuid4())
            created_time = int(time.time())

            async for chunk in sk_response():
                deltaText = ""
                deltaText = chunk.content

                completionChunk = {
                    "id": chunk_id,
                    "model": config.AZURE_OPENAI_MODEL,
                    "created": created_time,
                    "object": "extensions.chat.completion.chunk",
                    "choices": [
                        {
                            "messages": [{"role": "assistant", "content": deltaText}],
                            "delta": {"role": "assistant", "content": deltaText},
                        }
                    ],
                    "apim-request-id": request_headers.get("apim-request-id", ""),
                    "history_metadata": history_metadata,
                }

                completionChunk2 = json.loads(
                    json.dumps(completionChunk),
                    object_hook=lambda d: SimpleNamespace(**d),
                )

                yield json.dumps(
                    format_stream_response(
                        completionChunk2,
                        history_metadata,
                        request_headers.get("apim-request-id", ""),
                    )
                ) + "\n"

        return Response(generate(), content_type="application/json-lines")

    else:
        response, apim_request_id = await send_chat_request(
            request_body, request_headers
        )
        history_metadata = request_body.get("history_metadata", {})

        async def generate():
            async for completionChunk in response:
                yield format_stream_response(
                    completionChunk, history_metadata, apim_request_id
                )
            track_event_if_configured("stream_openai_selected", {})

        return generate()


async def conversation_internal(request_body, request_headers):
    track_event_if_configured(
        "conversation_internal_start",
        {
            "streaming": config.SHOULD_STREAM,
            "internal_stream": config.USE_INTERNAL_STREAM,
        },
    )
    try:
        if config.SHOULD_STREAM:
            return await stream_chat_request(request_body, request_headers)
            # response = await make_response(format_as_ndjson(result))
            # response.timeout = None
            # response.mimetype = "application/json-lines"
            # return response

    except Exception as ex:
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(ex)
            span.set_status(Status(StatusCode.ERROR, str(ex)))
        logging.exception(ex)
        if hasattr(ex, "status_code"):
            return jsonify({"error": str(ex)}), ex.status_code
        else:
            return jsonify({"error": str(ex)}), 500


@bp.route("/conversation", methods=["POST"])
async def conversation():
    if not request.is_json:
        track_event_if_configured("invalid_request_format", {})
        return jsonify({"error": "request must be json"}), 415
    request_json = await request.get_json()
    track_event_if_configured("conversation_api_invoked", {})
    return await conversation_internal(request_json, request.headers)


@bp.route("/frontend_settings", methods=["GET"])
def get_frontend_settings():
    try:
        return jsonify(frontend_settings), 200
    except Exception as e:
        logging.exception("Exception in /frontend_settings")
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        return jsonify({"error": str(e)}), 500


# Conversation History API #
@bp.route("/history/generate", methods=["POST"])
async def add_conversation():
    authenticated_user = get_authenticated_user_details(request_headers=request.headers)
    user_id = authenticated_user["user_principal_id"]
    track_event_if_configured("HistoryGenerate_Start", {"user_id": user_id})

    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    try:
        # make sure cosmos is configured
        cosmos_conversation_client = init_cosmosdb_client()
        if not cosmos_conversation_client:
            raise Exception("CosmosDB is not configured or not working")

        # check for the conversation_id, if the conversation is not set, we will create a new one
        history_metadata = {}
        if not conversation_id:
            title = await generate_title(request_json["messages"])
            conversation_dict = await cosmos_conversation_client.create_conversation(
                user_id=user_id, title=title
            )
            conversation_id = conversation_dict["id"]
            history_metadata["title"] = title
            history_metadata["date"] = conversation_dict["createdAt"]

            track_event_if_configured(
                "ConversationCreated",
                {
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "title": title,
                },
            )

        # Format the incoming message object in the "chat/completions" messages format
        # then write it to the conversation history in cosmos
        messages = request_json["messages"]
        if len(messages) > 0 and messages[-1]["role"] == "user":
            createdMessageValue = await cosmos_conversation_client.create_message(
                uuid=str(uuid.uuid4()),
                conversation_id=conversation_id,
                user_id=user_id,
                input_message=messages[-1],
            )
            if createdMessageValue == "Conversation not found":
                raise Exception(
                    "Conversation not found for the given conversation ID: "
                    + conversation_id
                    + "."
                )
            track_event_if_configured(
                "UserMessageAdded",
                {
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "message": messages[-1],
                },
            )
        else:
            raise Exception("No user message found")

        await cosmos_conversation_client.cosmosdb_client.close()

        # Submit request to Chat Completions for response
        request_body = await request.get_json()
        history_metadata["conversation_id"] = conversation_id
        request_body["history_metadata"] = history_metadata
        track_event_if_configured(
            "SendingToChatCompletions",
            {"user_id": user_id, "conversation_id": conversation_id},
        )

        track_event_if_configured(
            "HistoryGenerate_Completed",
            {"user_id": user_id, "conversation_id": conversation_id},
        )
        return await conversation_internal(request_body, request.headers)

    except Exception as e:
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        logging.exception("Exception in /history/generate")
        return jsonify({"error": str(e)}), 500


@bp.route("/history/update", methods=["POST"])
async def update_conversation():
    authenticated_user = get_authenticated_user_details(request_headers=request.headers)
    user_id = authenticated_user["user_principal_id"]

    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    track_event_if_configured(
        "UpdateConversation_Start",
        {"user_id": user_id, "conversation_id": conversation_id},
    )

    try:
        # make sure cosmos is configured
        cosmos_conversation_client = init_cosmosdb_client()
        if not cosmos_conversation_client:
            raise Exception("CosmosDB is not configured or not working")

        # check for the conversation_id, if the conversation is not set, we will create a new one
        if not conversation_id:
            raise Exception("No conversation_id found")

        # Format the incoming message object in the "chat/completions" messages format
        # then write it to the conversation history in cosmos
        messages = request_json["messages"]
        if len(messages) > 0 and messages[-1]["role"] == "assistant":
            if len(messages) > 1 and messages[-2].get("role", None) == "tool":
                # write the tool message first
                await cosmos_conversation_client.create_message(
                    uuid=str(uuid.uuid4()),
                    conversation_id=conversation_id,
                    user_id=user_id,
                    input_message=messages[-2],
                )
                track_event_if_configured(
                    "ToolMessageStored",
                    {"user_id": user_id, "conversation_id": conversation_id},
                )
            # write the assistant message
            await cosmos_conversation_client.create_message(
                uuid=messages[-1]["id"],
                conversation_id=conversation_id,
                user_id=user_id,
                input_message=messages[-1],
            )
            track_event_if_configured(
                "AssistantMessageStored",
                {
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "message": messages[-1],
                },
            )
        else:
            raise Exception("No bot messages found")
        # Submit request to Chat Completions for response
        await cosmos_conversation_client.cosmosdb_client.close()
        track_event_if_configured(
            "UpdateConversation_Success",
            {"user_id": user_id, "conversation_id": conversation_id},
        )
        response = {"success": True}
        return jsonify(response), 200

    except Exception as e:
        logging.exception("Exception in /history/update")
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        return jsonify({"error": str(e)}), 500


@bp.route("/history/message_feedback", methods=["POST"])
async def update_message():
    authenticated_user = get_authenticated_user_details(request_headers=request.headers)
    user_id = authenticated_user["user_principal_id"]
    cosmos_conversation_client = init_cosmosdb_client()

    # check request for message_id
    request_json = await request.get_json()
    message_id = request_json.get("message_id", None)
    message_feedback = request_json.get("message_feedback", None)

    track_event_if_configured(
        "MessageFeedback_Start", {"user_id": user_id, "message_id": message_id}
    )
    try:
        if not message_id:
            return jsonify({"error": "message_id is required"}), 400

        if not message_feedback:
            return jsonify({"error": "message_feedback is required"}), 400

        # update the message in cosmos
        updated_message = await cosmos_conversation_client.update_message_feedback(
            user_id, message_id, message_feedback
        )
        if updated_message:
            track_event_if_configured(
                "MessageFeedback_Updated",
                {
                    "user_id": user_id,
                    "message_id": message_id,
                    "feedback": message_feedback,
                },
            )
            return (
                jsonify(
                    {
                        "message": f"Successfully updated message with feedback {message_feedback}",
                        "message_id": message_id,
                    }
                ),
                200,
            )
        else:
            track_event_if_configured(
                "MessageFeedback_NotFound",
                {"user_id": user_id, "message_id": message_id},
            )
            return (
                jsonify(
                    {
                        "error": f"Unable to update message {message_id}. It either does not exist or the user does not have access to it."
                    }
                ),
                404,
            )

    except Exception as e:
        logging.exception("Exception in /history/message_feedback")
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        return jsonify({"error": str(e)}), 500


@bp.route("/history/delete", methods=["DELETE"])
async def delete_conversation():
    # get the user id from the request headers
    authenticated_user = get_authenticated_user_details(request_headers=request.headers)
    user_id = authenticated_user["user_principal_id"]

    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    track_event_if_configured(
        "DeleteConversation_Start",
        {"user_id": user_id, "conversation_id": conversation_id},
    )

    try:
        if not conversation_id:
            return jsonify({"error": "conversation_id is required"}), 400

        # make sure cosmos is configured
        cosmos_conversation_client = init_cosmosdb_client()
        if not cosmos_conversation_client:
            raise Exception("CosmosDB is not configured or not working")

        # delete the conversation messages from cosmos first
        await cosmos_conversation_client.delete_messages(conversation_id, user_id)

        # Now delete the conversation
        await cosmos_conversation_client.delete_conversation(user_id, conversation_id)

        await cosmos_conversation_client.cosmosdb_client.close()

        track_event_if_configured(
            "DeleteConversation_Success",
            {"user_id": user_id, "conversation_id": conversation_id},
        )

        return (
            jsonify(
                {
                    "message": "Successfully deleted conversation and messages",
                    "conversation_id": conversation_id,
                }
            ),
            200,
        )
    except Exception as e:
        logging.exception("Exception in /history/delete")
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        return jsonify({"error": str(e)}), 500


@bp.route("/history/list", methods=["GET"])
async def list_conversations():
    offset = request.args.get("offset", 0)
    authenticated_user = get_authenticated_user_details(request_headers=request.headers)
    user_id = authenticated_user["user_principal_id"]

    track_event_if_configured(
        "ListConversations_Start", {"user_id": user_id, "offset": offset}
    )

    # make sure cosmos is configured
    cosmos_conversation_client = init_cosmosdb_client()
    if not cosmos_conversation_client:
        raise Exception("CosmosDB is not configured or not working")

    # get the conversations from cosmos
    conversations = await cosmos_conversation_client.get_conversations(
        user_id, offset=offset, limit=25
    )
    await cosmos_conversation_client.cosmosdb_client.close()
    if not isinstance(conversations, list):
        track_event_if_configured(
            "ListConversations_Empty", {"user_id": user_id, "offset": offset}
        )
        return jsonify({"error": f"No conversations for {user_id} were found"}), 404

    # return the conversation ids

    track_event_if_configured(
        "ListConversations_Success",
        {"user_id": user_id, "conversation_count": len(conversations)},
    )

    return jsonify(conversations), 200


@bp.route("/history/read", methods=["POST"])
async def get_conversation():
    authenticated_user = get_authenticated_user_details(request_headers=request.headers)
    user_id = authenticated_user["user_principal_id"]

    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    track_event_if_configured(
        "GetConversation_Start",
        {
            "user_id": user_id,
            "conversation_id": conversation_id,
        },
    )

    if not conversation_id:
        track_event_if_configured(
            "GetConversation_Failed",
            {
                "user_id": user_id,
                "conversation_id": conversation_id,
                "error": f"Conversation {conversation_id} not found",
            },
        )
        return jsonify({"error": "conversation_id is required"}), 400

    # make sure cosmos is configured
    cosmos_conversation_client = init_cosmosdb_client()
    if not cosmos_conversation_client:
        raise Exception("CosmosDB is not configured or not working")

    # get the conversation object and the related messages from cosmos
    conversation = await cosmos_conversation_client.get_conversation(
        user_id, conversation_id
    )
    # return the conversation id and the messages in the bot frontend format
    if not conversation:
        return (
            jsonify(
                {
                    "error": f"Conversation {conversation_id} was not found. It either does not exist or the logged in user does not have access to it."
                }
            ),
            404,
        )

    # get the messages for the conversation from cosmos
    conversation_messages = await cosmos_conversation_client.get_messages(
        user_id, conversation_id
    )

    # format the messages in the bot frontend format
    messages = [
        {
            "id": msg["id"],
            "role": msg["role"],
            "content": msg["content"],
            "createdAt": msg["createdAt"],
            "feedback": msg.get("feedback"),
        }
        for msg in conversation_messages
    ]

    await cosmos_conversation_client.cosmosdb_client.close()
    track_event_if_configured(
        "GetConversation_Success",
        {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "message_count": len(messages),
        },
    )
    return jsonify({"conversation_id": conversation_id, "messages": messages}), 200


@bp.route("/history/rename", methods=["POST"])
async def rename_conversation():
    authenticated_user = get_authenticated_user_details(request_headers=request.headers)
    user_id = authenticated_user["user_principal_id"]

    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    track_event_if_configured(
        "RenameConversation_Start",
        {"user_id": user_id, "conversation_id": conversation_id},
    )

    if not conversation_id:
        track_event_if_configured(
            "RenameConversation_Failed",
            {
                "user_id": user_id,
                "conversation_id": conversation_id,
                "error": f"Conversation {conversation_id} not found",
            },
        )
        return jsonify({"error": "conversation_id is required"}), 400

    # make sure cosmos is configured
    cosmos_conversation_client = init_cosmosdb_client()
    if not cosmos_conversation_client:
        raise Exception("CosmosDB is not configured or not working")

    # get the conversation from cosmos
    conversation = await cosmos_conversation_client.get_conversation(
        user_id, conversation_id
    )
    if not conversation:
        return (
            jsonify(
                {
                    "error": f"Conversation {conversation_id} was not found. It either does not exist or the logged in user does not have access to it."
                }
            ),
            404,
        )

    # update the title
    title = request_json.get("title", None)
    if not title:
        return jsonify({"error": "title is required"}), 400
    conversation["title"] = title
    updated_conversation = await cosmos_conversation_client.upsert_conversation(
        conversation
    )

    await cosmos_conversation_client.cosmosdb_client.close()

    track_event_if_configured(
        "RenameConversation_Success",
        {"user_id": user_id, "conversation_id": conversation_id, "new_title": title},
    )
    return jsonify(updated_conversation), 200


@bp.route("/history/delete_all", methods=["DELETE"])
async def delete_all_conversations():
    # get the user id from the request headers
    authenticated_user = get_authenticated_user_details(request_headers=request.headers)
    user_id = authenticated_user["user_principal_id"]

    track_event_if_configured("DeleteAllConversations_Start", {"user_id": user_id})

    # get conversations for user
    try:
        # make sure cosmos is configured
        cosmos_conversation_client = init_cosmosdb_client()
        if not cosmos_conversation_client:
            raise Exception("CosmosDB is not configured or not working")

        conversations = await cosmos_conversation_client.get_conversations(
            user_id, offset=0, limit=None
        )
        if not conversations:
            track_event_if_configured(
                "DeleteAllConversations_Empty",
                {
                    "user_id": user_id,
                },
            )
            return jsonify({"error": f"No conversations for {user_id} were found"}), 404

        # delete each conversation
        for conversation in conversations:
            # delete the conversation messages from cosmos first
            await cosmos_conversation_client.delete_messages(
                conversation["id"], user_id
            )

            # Now delete the conversation
            await cosmos_conversation_client.delete_conversation(
                user_id, conversation["id"]
            )
        await cosmos_conversation_client.cosmosdb_client.close()

        track_event_if_configured(
            "DeleteAllConversations_Success",
            {"user_id": user_id, "conversation_count": len(conversations)},
        )

        return (
            jsonify(
                {
                    "message": f"Successfully deleted conversation and messages for user {user_id}"
                }
            ),
            200,
        )

    except Exception as e:
        logging.exception("Exception in /history/delete_all")
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        return jsonify({"error": str(e)}), 500


@bp.route("/history/clear", methods=["POST"])
async def clear_messages():
    # get the user id from the request headers
    authenticated_user = get_authenticated_user_details(request_headers=request.headers)
    user_id = authenticated_user["user_principal_id"]

    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    track_event_if_configured(
        "ClearConversationMessages_Start",
        {
            "user_id": user_id,
            "conversation_id": conversation_id,
        },
    )

    try:
        if not conversation_id:
            track_event_if_configured(
                "ClearConversationMessages_Failed",
                {
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "error": "conversation_id is required",
                },
            )
            return jsonify({"error": "conversation_id is required"}), 400

        # make sure cosmos is configured
        cosmos_conversation_client = init_cosmosdb_client()
        if not cosmos_conversation_client:
            raise Exception("CosmosDB is not configured or not working")

        # delete the conversation messages from cosmos
        await cosmos_conversation_client.delete_messages(conversation_id, user_id)

        track_event_if_configured(
            "ClearConversationMessages_Success",
            {"user_id": user_id, "conversation_id": conversation_id},
        )

        return (
            jsonify(
                {
                    "message": "Successfully deleted messages in conversation",
                    "conversation_id": conversation_id,
                }
            ),
            200,
        )
    except Exception as e:
        logging.exception("Exception in /history/clear_messages")
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        return jsonify({"error": str(e)}), 500


@bp.route("/history/ensure", methods=["GET"])
async def ensure_cosmos():
    if not config.AZURE_COSMOSDB_ACCOUNT:
        track_event_if_configured(
            "EnsureCosmosDB_Failed",
            {
                "error": "CosmosDB is not configured",
            },
        )
        return jsonify({"error": "CosmosDB is not configured"}), 404

    try:
        cosmos_conversation_client = init_cosmosdb_client()
        success, err = await cosmos_conversation_client.ensure()
        if not cosmos_conversation_client or not success:
            if err:
                track_event_if_configured(
                    "EnsureCosmosDB_Failed",
                    {
                        "error": err,
                    },
                )
                return jsonify({"error": err}), 422
            return jsonify({"error": "CosmosDB is not configured or not working"}), 500

        await cosmos_conversation_client.cosmosdb_client.close()
        track_event_if_configured(
            "EnsureCosmosDB_Failed",
            {
                "error": "CosmosDB is not configured or not working",
            },
        )
        return jsonify({"message": "CosmosDB is configured and working"}), 200
    except Exception as e:
        logging.exception("Exception in /history/ensure")
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        cosmos_exception = str(e)
        if "Invalid credentials" in cosmos_exception:
            return jsonify({"error": cosmos_exception}), 401
        elif "Invalid CosmosDB database name" in cosmos_exception:
            return (
                jsonify(
                    {
                        "error": f"{cosmos_exception} {config.AZURE_COSMOSDB_DATABASE} for account {config.AZURE_COSMOSDB_ACCOUNT}"
                    }
                ),
                422,
            )
        elif "Invalid CosmosDB container name" in cosmos_exception:
            return (
                jsonify(
                    {
                        "error": f"{cosmos_exception}: {config.AZURE_COSMOSDB_CONVERSATIONS_CONTAINER}"
                    }
                ),
                422,
            )
        else:
            return jsonify({"error": "CosmosDB is not working"}), 500


async def generate_title(conversation_messages):

    # make sure the messages are sorted by _ts descending
    title_prompt = 'Summarize the conversation so far into a 4-word or less title. Do not use any quotation marks or punctuation. Respond with a json object in the format {{"title": string}}. Do not include any other commentary or description.'

    messages = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in conversation_messages
    ]
    messages.append({"role": "user", "content": title_prompt})

    try:
        azure_openai_client = init_openai_client(use_data=False)
        response = await azure_openai_client.chat.completions.create(
            model=config.AZURE_OPENAI_MODEL,
            messages=messages,
            temperature=1,
            max_tokens=64,
        )

        title = json.loads(response.choices[0].message.content)["title"]
        return title
    except Exception:
        return messages[-2]["content"]


# @bp.route("/api/pbi", methods=["GET"])
# def get_pbiurl():
#    return VITE_POWERBI_EMBED_URL


@bp.route("/api/users", methods=["GET"])
def get_users():
    track_event_if_configured("UserFetch_Start", {})

    try:
        users = sqldb_service.get_client_data()

        track_event_if_configured(
            "UserFetch_Success",
            {
                "user_count": len(users),
            },
        )

        return jsonify(users)

    except Exception as e:
        span = trace.get_current_span()
        if span is not None:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
        print("Exception occurred:", e)
        return str(e), 500


app = create_app()
