import asyncio
import os
from typing import Annotated

import azure.functions as func
import openai
import pymssql
from azurefunctions.extensions.http.fastapi import Request, StreamingResponse
from semantic_kernel.connectors.ai.function_call_behavior import FunctionCallBehavior
from semantic_kernel.connectors.ai.open_ai import (
    AzureChatCompletion,
    OpenAIChatCompletion,
)
from semantic_kernel.connectors.ai.open_ai.prompt_execution_settings.open_ai_prompt_execution_settings import (
    OpenAIChatPromptExecutionSettings,
)
from semantic_kernel.contents.chat_history import ChatHistory
from semantic_kernel.contents.function_call_content import FunctionCallContent
from semantic_kernel.core_plugins.time_plugin import TimePlugin
from semantic_kernel.functions.kernel_arguments import KernelArguments
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from semantic_kernel.kernel import Kernel

# Azure Function App
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

endpoint = os.environ.get("AZURE_OPEN_AI_ENDPOINT")
api_key = os.environ.get("AZURE_OPEN_AI_API_KEY")
api_version = os.environ.get("OPENAI_API_VERSION")
deployment = os.environ.get("AZURE_OPEN_AI_DEPLOYMENT_MODEL")
temperature = 0

search_endpoint = os.environ.get("AZURE_AI_SEARCH_ENDPOINT")
search_key = os.environ.get("AZURE_AI_SEARCH_API_KEY")


class ChatWithDataPlugin:
    @kernel_function(
        name="Greeting", description="Respond to any greeting or general questions"
    )
    def greeting(
        self, input: Annotated[str, "the question"]
    ) -> Annotated[str, "The output is a string"]:
        query = input.split(":::")[0]
        endpoint = os.environ.get("AZURE_OPEN_AI_ENDPOINT")
        api_key = os.environ.get("AZURE_OPEN_AI_API_KEY")
        client = openai.AzureOpenAI(
            azure_endpoint=endpoint, api_key=api_key, api_version="2023-09-01-preview"
        )
        deployment = os.environ.get("AZURE_OPEN_AI_DEPLOYMENT_MODEL")
        try:
            completion = client.chat.completions.create(
                model=deployment,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant to repond to any greeting or general questions.",
                    },
                    {"role": "user", "content": query},
                ],
                temperature=0,
            )
            answer = completion.choices[0].message.content
        except Exception as e:
            answer = str(
                e
            )  # 'Information from database could not be retrieved. Please try again later.'
        return answer

    @kernel_function(
        name="ChatWithSQLDatabase",
        description="Given a query about client assets, investements and meeting dates or times, get details from the database",
    )
    def get_SQL_Response(
        self,
        input: Annotated[str, "the question"],
        ClientId: Annotated[str, "the ClientId"],
    ):

        # clientid = input.split(':::')[-1]
        # query = input.split(':::')[0] + ' . ClientId = ' + input.split(':::')[-1]
        clientid = ClientId
        query = input
        endpoint = os.environ.get("AZURE_OPEN_AI_ENDPOINT")
        api_key = os.environ.get("AZURE_OPEN_AI_API_KEY")

        client = openai.AzureOpenAI(
            azure_endpoint=endpoint, api_key=api_key, api_version="2023-09-01-preview"
        )
        deployment = os.environ.get("AZURE_OPEN_AI_DEPLOYMENT_MODEL")

        sql_prompt = f"""A valid T-SQL query to find {query} for tables and columns provided below:
        1. Table: Clients
        Columns: ClientId,Client,Email,Occupation,MaritalStatus,Dependents
        2. Table: InvestmentGoals
        Columns: ClientId,InvestmentGoal
        3. Table: Assets
        Columns: ClientId,AssetDate,Investment,ROI,Revenue,AssetType
        4. Table: ClientSummaries
        Columns: ClientId,ClientSummary
        5. Table: InvestmentGoalsDetails
        Columns: ClientId,InvestmentGoal,TargetAmount,Contribution
        6. Table: Retirement
        Columns: ClientId,StatusDate,RetirementGoalProgress,EducationGoalProgress
        7.Table: ClientMeetings
        Columns: ClientId,ConversationId,Title,StartTime,EndTime,Advisor,ClientEmail
        Use Investement column from Assets table as value always.
        Assets table has snapshots of values by date. Do not add numbers across different dates for total values.
        Do not use client name in filter.
        Do not include assets values unless asked for.
        Always use ClientId = {clientid} in the query filter.
        Always return client name in the query.
        Only return the generated sql query. do not return anything else"""
        try:

            completion = client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": sql_prompt},
                ],
                temperature=0,
            )
            sql_query = completion.choices[0].message.content
            sql_query = sql_query.replace("```sql", "").replace("```", "")
            # print(sql_query)

            connectionString = os.environ.get("SQLDB_CONNECTION_STRING")
            server = os.environ.get("SQLDB_SERVER")
            database = os.environ.get("SQLDB_DATABASE")
            username = os.environ.get("SQLDB_USERNAME")
            password = os.environ.get("SQLDB_PASSWORD")

            conn = pymssql.connect(server, username, password, database)
            # conn = pyodbc.connect(connectionString)
            cursor = conn.cursor()
            cursor.execute(sql_query)
            answer = ""
            for row in cursor.fetchall():
                answer += str(row)
        except Exception as e:
            answer = str(
                e
            )  # 'Information from database could not be retrieved. Please try again later.'
        return answer
        # return sql_query

    @kernel_function(
        name="ChatWithCallTranscripts",
        description="given a query about meetings summary or actions or notes, get answer from search index for a given ClientId",
    )
    def get_answers_from_calltranscripts(
        self,
        question: Annotated[str, "the question"],
        ClientId: Annotated[str, "the ClientId"],
    ):

        endpoint = os.environ.get("AZURE_OPEN_AI_ENDPOINT")
        deployment = os.environ.get("AZURE_OPEN_AI_DEPLOYMENT_MODEL")
        apikey = os.environ.get("AZURE_OPEN_AI_API_KEY")

        search_endpoint = os.environ.get("AZURE_AI_SEARCH_ENDPOINT")
        search_key = os.environ.get("AZURE_AI_SEARCH_API_KEY")
        index_name = os.environ.get("AZURE_SEARCH_INDEX")

        client = openai.AzureOpenAI(
            azure_endpoint=endpoint,  # f"{endpoint}/openai/deployments/{deployment}/extensions",
            api_key=apikey,
            api_version="2024-02-01",
        )

        query = question
        system_message = """You are an assistant who provides wealth advisors with helpful information to prepare for client meetings. 
        You have access to the client’s meeting call transcripts. 
        You can use this information to answer questions about the clients"""

        completion = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": query},
            ],
            seed=42,
            temperature=0,
            max_tokens=800,
            extra_body={
                "data_sources": [
                    {
                        "type": "azure_search",
                        "parameters": {
                            "endpoint": search_endpoint,
                            "index_name": index_name,
                            "semantic_configuration": "default",
                            "query_type": "vector_simple_hybrid",  # "vector_semantic_hybrid"
                            "fields_mapping": {
                                "content_fields_separator": "\n",
                                "content_fields": ["content"],
                                "filepath_field": "chunk_id",
                                "title_field": "",  # null,
                                "url_field": "sourceurl",
                                "vector_fields": ["contentVector"],
                            },
                            "semantic_configuration": "my-semantic-config",
                            "in_scope": "true",
                            "role_information": system_message,
                            # "vector_filter_mode": "preFilter", #VectorFilterMode.PRE_FILTER,
                            "filter": f"client_id eq '{ClientId}'",  # "", #null,
                            "strictness": 3,
                            "top_n_documents": 5,
                            "authentication": {"type": "api_key", "key": search_key},
                            "embedding_dependency": {
                                "type": "deployment_name",
                                "deployment_name": "text-embedding-ada-002",
                            },
                        },
                    }
                ]
            },
        )

        answer = completion.choices[0].message.content
        return answer


# Get data from Azure Open AI
async def stream_processor(response):
    async for message in response:
        if str(message[0]):  # Get remaining generated response if applicable
            await asyncio.sleep(0.1)
            yield str(message[0])


@app.route(route="stream_openai_text", methods=[func.HttpMethod.GET])
async def stream_openai_text(req: Request) -> StreamingResponse:

    query = req.query_params.get("query", None)

    if not query:
        query = "please pass a query:::00000"

    kernel = Kernel()

    service_id = "function_calling"

    # Please make sure your AzureOpenAI Deployment allows for function calling
    ai_service = AzureChatCompletion(
        service_id=service_id,
        endpoint=endpoint,
        api_key=api_key,
        api_version=api_version,
        deployment_name=deployment,
    )

    kernel.add_service(ai_service)

    kernel.add_plugin(ChatWithDataPlugin(), plugin_name="ChatWithData")

    settings: OpenAIChatPromptExecutionSettings = (
        kernel.get_prompt_execution_settings_from_service_id(service_id=service_id)
    )
    settings.function_call_behavior = FunctionCallBehavior.EnableFunctions(
        auto_invoke=True, filters={"included_plugins": ["ChatWithData"]}
    )
    settings.seed = 42
    settings.max_tokens = 800
    settings.temperature = 0

    system_message = """you are a helpful assistant to a wealth advisor. 
    Do not answer any questions not related to wealth advisors queries.
    If the client name and client id do not match, only return - Please only ask questions about the selected client or select another client to inquire about their details. do not return any other information.
    Only use the client name returned from database in the response.
    If you cannot answer the question, always return - I cannot answer this question from the data available. Please rephrase or add more details.
    ** Remove any client identifiers or ids or numbers or ClientId in the final response.
    """

    user_query = query.replace("?", " ")

    user_query_prompt = (
        f"""{user_query}. Always send clientId as {user_query.split(':::')[-1]} """
    )
    query_prompt = f"""<message role="system">{system_message}</message><message role="user">{user_query_prompt}</message>"""

    sk_response = kernel.invoke_prompt_stream(
        function_name="prompt_test",
        plugin_name="weather_test",
        prompt=query_prompt,
        settings=settings,
    )

    return StreamingResponse(
        stream_processor(sk_response), media_type="text/event-stream"
    )
