# Setup and Deploy the Application

This guide provides instructions for setting up the application locally and deploying the web app to Azure using the Azure CLI.

---

## Local Setup: Basic Chat Experience

Follow these steps to set up and run the application locally:

### 1. Open the App Folder
Navigate to the `App` folder located in the `src` directory of the repository using Visual Studio Code.

### 2. Configure Environment Variables
- Copy the `.env.sample` file to a new file named `.env`.
- Update the `.env` file with the required values from your Azure resource group in Azure Portal App Service environment variables.
- Alternatively, if resources were
provisioned using `azd provision` or `azd up`, a `.env` file is automatically generated in the `.azure/<env-name>/.env`
file. To get your `<env-name>` run `azd env list` to see which env is default.

### 3. Start the Application
- Run `start.cmd` (Windows) or `start.sh` (Linux/Mac) to:
  - Install backend dependencies.
  - Install frontend dependencies.
  - Build the frontend.
  - Start the backend server.
- Alternatively, you can run the backend in debug mode using the VS Code debug configuration defined in `.vscode/launch.json`.

### 4. Access the Application
Once the app is running, open your browser and navigate to [http://127.0.0.1:50505](http://127.0.0.1:50505).

---

## Deploy with the Azure CLI

Follow these steps to deploy the application to Azure App Service:

### Prerequisites
- Ensure you have the [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed (version 2.68.0 or later).
- Ensure you have an Azure subscription and an existing resource group.

### 1. First-Time Deployment
If this is your first time deploying the app, use the `az webapp up` command. Run the following commands from the `App` folder, replacing the placeholders with your desired values:

```sh
az webapp up --runtime PYTHON:3.11 --sku B1 --name <new-app-name> --resource-group <resource-group-name> --location <azure-region> --subscription <subscription-id>

az webapp config set --startup-file "python3 -m uvicorn app:app --host 0.0.0.0 --port 8000" --name <new-app-name>  --resource-group <resource-group-name>

az webapp config appsettings set --resource-group <resource-group-name> --name <new-app-name> --settings WEBSITES_PORT=8000
```

Next, configure the required environment variables in the deployed app to ensure it functions correctly.

### 2. Redeploy to an Existing App

If the app has already been deployed, follow these steps to update it with your local changes:

#### Step 1: Update App Settings
Before redeploying, update the app settings to allow local code deployment. Run the following command:

```sh
az webapp config appsettings set \
  --resource-group <resource-group-name> \
  --name <existing-app-name> \
  --settings WEBSITE_WEBDEPLOY_USE_SCM=false
```

#### Step 2: Check Runtime Stack and SKU
**Runtime Stack:**
In the Azure Portal, navigate to your App Service resource and check the runtime stack. Use the appropriate runtime in the deployment command:
- If it shows "Python - 3.10", use PYTHON:3.10.
- If it shows "Python - 3.11", use PYTHON:3.11.

**SKU:**
Check the SKU (pricing tier) in the Azure Portal. Use the abbreviated SKU name in the deployment command:
- For "Basic (B1)", use B1.
- For "Standard (S1)", use S1.

#### Step 3: Redeploy the App
Run the following commands to deploy your local code to the existing app. Replace the placeholders with your app's details:

```sh
az webapp up \
  --runtime <runtime-stack> \
  --sku <sku> \
  --name <existing-app-name> \
  --resource-group <resource-group-name>

az webapp config set \
  --startup-file "python3 -m uvicorn app:app --host 0.0.0.0 --port 8000" \
  --name <existing-app-name> --resource-group <resource-group-name>
```

### 3. Verify Deployment
Deployment may take several minutes to complete.
Once the deployment is finished, navigate to your app at:
```sh
https://<app-name>.azurewebsites.net
```
