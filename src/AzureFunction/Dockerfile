# To enable ssh & remote debugging on app service change the base image to the one below
# FROM mcr.microsoft.com/azure-functions/python:4-python3.11-appservice
FROM mcr.microsoft.com/azure-functions/python:4-python3.11

# Install Microsoft ODBC Driver
RUN apt-get update && \
    ACCEPT_EULA=Y apt-get install -y msodbcsql18

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

# Copy the requirements.txt from the correct path
COPY ./AzureFunction/requirements.txt /requirements.txt
RUN pip install -r /requirements.txt

# Copy the application files to the correct directory
COPY ./AzureFunction/ /home/site/wwwroot
