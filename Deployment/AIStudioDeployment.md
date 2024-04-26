# AI Studio Deployment Guide 
Please follow the steps below to configure the Prompt flow endpoint in App service configuration.

## Step 1: Open AI Studio Project
1. Launch the [AI Studio](https://ai.azure.com/) and select `Build` from the top menu.

    ![Home](/Deployment/images/aiStudio/Home.png)

2. Click on the project with name `ai_project_{your deployment prefix}`.

3. It might take few minutes for the flow to be validated and deployed after one-click deployment. Click on `Deployments` from left menu. You might only see the Default_AzureOpenAI deployments in the page until the deployment is completed. Please wait and click on `Refresh` after few minutes.

   ![Deployments Page](/Deployment/images/aiStudio/BlankDeploymentsPage.png)


4. Click on the deployed endpoint with name `draftsinference-{your deployment prefix}`.
   ![Drafts Endpoint](/Deployment/images/aiStudio/DraftsEndpoint.png)

5. Click on `Consume` from the top menu. Copy below details to use later in step 3.6.
- Deployment
- REST endpoint
- Primary key

    ![Drafts Endpoint Consume](/Deployment/images/aiStudio/DraftsEndpointConsume.png)


## Step 3: Update the deployment keys in Azure App Service configuration
1. Launch the Azure Portal [Azure Portal](https://portal.azure.com/).
2. Enter `Resource Groups` in the top search bar.

    ![Search Resource Groups](/Deployment/images/aiStudio/AzurePortalResourceGroups.png)

3. Locate your Resource Group you selected/created during one-click deployment and click on it.

4. Locate the App Service in the Resource Group and click on it.

5. Click on `Environment Variables` from left menu under `Settings`.

    ![Application Environment Variables](/Deployment/images/aiStudio/AppEnvironmentVariables.png)

6. Modify the below variables with values collected in step 2.9 above.
- AI_STUDIO_DRAFT_FLOW_ENDPOINT
- AI_STUDIO_DRAFT_FLOW_API_KEY
- AI_STUDIO_DRAFT_FLOW_DEPLOYMENT_NAME

7. Click on `Apply` button at the bottom of the screen. Then click on `Confirm` in the pop-up.

    ![Application Environment Variables Confirm](/Deployment/images/aiStudio/AppEnvironmentVariablesConfirm.png)

8. Click on `Overview` from the left menu. Then click on `Restart` button in the top menu. Then click on `Yes` in the pop-up message. 

   ![Application Restart](/Deployment/images/aiStudio/AppServiceRestart.png)

    
## Step 4: Add Authentication in Azure App Service configuration

1. Click on `Authentication` from left menu.

  ![Authentication](/Deployment/images/aiStudio/AppAuthentication.png)

2. Click on `+ Add Provider` to see a list of identity providers.

  ![Authentication Identity](/Deployment/images/aiStudio/AppAuthenticationIdentity.png)

3. Click on `+ Add Provider` to see a list of identity providers.

  ![Add Provider](/Deployment/images/aiStudio/AppAuthIdentityProvider.png)

4. Select the first option `Microsoft Entra Id` from the drop-down list.
 ![Add Provider](/Deployment/images/aiStudio/AppAuthIdentityProviderAdd.png)

5. Accept the default values and click on `Add` button to go back to the previous page with the identify provider added.
 ![Add Provider](/Deployment/images/aiStudio/AppAuthIdentityProviderAdded.png)