### Deploy from your local machine

#### Local Setup: Basic Chat Experience
1. Copy `.env.sample` to a new file called `.env` and update the values from your azure resource group.

2. Start the app with `start.cmd`. This will build the frontend, install backend dependencies, and then start the app. Or, just run the backend in debug mode using the VSCode debug configuration in `.vscode/launch.json`.

3. You can see the local running app at http://127.0.0.1:50505.


#### Deploy with the Azure CLI
**NOTE**: If you've made code changes, be sure to **build the app code** with `start.cmd` or `start.sh` before you deploy, otherwise your changes will not be picked up. If you've updated any files in the `frontend` folder, make sure you see updates to the files in the `static` folder before you deploy.

You can use the [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) to deploy the app from your local machine. Make sure you have version 2.48.1 or later.

If this is your first time deploying the app, you can use [az webapp up](https://learn.microsoft.com/en-us/cli/azure/webapp?view=azure-cli-latest#az-webapp-up). Run the following two commands from the root folder of the repo, updating the placeholder values to your desired app name, resource group, location, and subscription. You can also change the SKU if desired.

1. `az webapp up --runtime PYTHON:3.11 --sku B1 --name <new-app-name> --resource-group <resource-group-name> --location <azure-region> --subscription <subscription-name>`
1. `az webapp config set --startup-file "python3 -m gunicorn app:app" --name <new-app-name>`

If you've deployed the app previously, first run this command to update the appsettings to allow local code deployment:

`az webapp config appsettings set -g <resource-group-name> -n <existing-app-name> --settings WEBSITE_WEBDEPLOY_USE_SCM=false`

Check the runtime stack for your app by viewing the app service resource in the Azure Portal. If it shows "Python - 3.10", use `PYTHON:3.10` in the runtime argument below. If it shows "Python - 3.11", use `PYTHON:3.11` in the runtime argument below. 

Check the SKU in the same way. Use the abbreviated SKU name in the argument below, e.g. for "Basic (B1)" the SKU is `B1`. 

Then, use these commands to deploy your local code to the existing app:

1. `az webapp up --runtime <runtime-stack> --sku <sku> --name <existing-app-name> --resource-group <resource-group-name>`
1. `az webapp config set --startup-file "python3 -m gunicorn app:app" --name <existing-app-name>`

Make sure that the app name and resource group match exactly for the app that was previously deployed.

Deployment will take several minutes. When it completes, you should be able to navigate to your app at {app-name}.azurewebsites.net.
