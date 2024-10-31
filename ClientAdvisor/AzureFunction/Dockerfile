# Use the appropriate base image for Azure Functions
# To enable SSH & remote debugging on app service change the base image to the one below
# FROM mcr.microsoft.com/azure-functions/python:4-python3.11-appservice
FROM mcr.microsoft.com/azure-functions/python:4-python3.11

# Set environment variables
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

# Copy the requirements.txt file into the image
COPY requirements.txt /home/site/wwwroot/requirements.txt

# Install the dependencies
RUN pip install -r /home/site/wwwroot/requirements.txt

# Copy the rest of the application code
COPY . /home/site/wwwroot/