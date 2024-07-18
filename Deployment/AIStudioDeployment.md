# AI Studio Deployment Guide 
Please follow the steps below to configure the Prompt flow endpoint in App service configuration.

## Step 1: Open AI Studio Project
1. Launch the [AI Studio](https://ai.azure.com/) and select `Build` from the top menu.

    ![Home](/Deployment/images/aiStudio/Home.png)

2. Click on the project with name `ai_project_{your deployment prefix}`.

## Step 2: Import Prompt Flow and Deploy

1. Click on `PromptFlow` button from left menu under `Tools`.

    ![Prompt Flow](/Deployment/images/aiStudio/PromptFlow.png)

2. Click on `Create` button. Then click on `Upload` button from `Upload From Local` option from the last row.
    
    ![Upload](/Deployment/images/aiStudio/UploadFromLocal.png)

3. Click on `Zip File` radio button. Then click on `Browse` to select the file `DraftFlow.zip` from the cloned/downloaded GitHub repository folder. The file will be located at `<Your Download Folder Path>/Deployment/scripts/ai_hub_scripts/flows/`.

    ![Select Local File](/Deployment/images/aiStudio/SelectLocalFile.png)

4. Once the DraftFlow.zip file is uploaded, change folder name to `DraftFlow` and Select Flow type as `Chat Flow` and click on `Upload` button.

    ![Upload Local File](/Deployment/images/aiStudio/UploadLocalFile.png)


5. Click on `Select runtime` and chick on `Start` from the drop-down list. It can take few minutes for the runtime to start.

    ![Select Runtime](/Deployment/images/aiStudio/SelectRunTime.png)

6. Click on `Deploy` button once it is enabled. Enter a unique name for Endpoint Name field.
    >IMPORTANT: This name has to be unique across all endpoints in your Azure subscription.

    You can leave the Deployment name, Virtual machine type, and Instace count as populated and click on `Review + Create`. Optionally you can choose a different VM type/size and increase/decrease the Instance count as needed. Then review details and click on `Create` in the next screen.

    ![Deploy Draft Flow](/Deployment/images/aiStudio/DeployDraftFlow.png)

7. It will take few minutes for the flow to be validated and deployed. Click on `Deployments` from left menu. You might only see the Default_AzureOpenAI deployments in the page until the deployment is completed. Please wait and click on `Refresh` after few minutes.

   ![Deployments Page](/Deployment/images/aiStudio/BlankDeploymentsPage.png)


8. Click on the deployed endpoint with name `draftsinference-1`.
   ![Drafts Endpoint](/Deployment/images/aiStudio/DraftsEndpoint.png)

9. Click on `Consume` from the top menu. Copy below details to use later in step 3.6.
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

4. Select the first option `Microsoft Entra Id` from the drop-down list. If `Create new app registration` is disabled, go to [Step 4a](https://github.com/microsoft/Build-your-own-AI-Assistant-Solution-Accelerator/blob/PSL-Authenticate-Doc/Deployment/AIStudioDeployment.md#step-4a-creating-a-new-app-registration)

 ![Add Provider](/Deployment/images/aiStudio/AppAuthIdentityProviderAdd.png)

5. Accept the default values and click on `Add` button to go back to the previous page with the identify provider added.
   
 ![Add Provider](/Deployment/images/aiStudio/AppAuthIdentityProviderAdded.png)

### Step 4a: Creating a new App Registration
1. Click on `Home` and select `Microsoft Entra ID`.

![Microsoft Entra ID](/Deployment/images/aiStudio/MicrosoftEntraID.png)

2. Click on `App registrations`.

![App registrations](/Deployment/images/aiStudio/Appregistrations.png)

3. Click on `+ New registration`.

![New Registrations](/Deployment/images/aiStudio/NewRegistration.png)

4. Provide the `Name`, select supported account types as `Accounts in this organizational directory only(Contoso only - Single tenant)`, select platform as `Web`, enter/select the `URL` and register.

![Add Details](/Deployment/images/aiStudio/AddDetails.png)

5. After application is created sucessfully, then click on `Add a Redirect URL`.

![Redirect URL](/Deployment/images/aiStudio/AddRedirectURL.png)

6. Click on `+ Add a platform`.

![+ Add platform](/Deployment/images/aiStudio/AddPlatform.png)

7. Click on `Web`.

![Web](/Deployment/images/aiStudio/Web.png)

8. Enter the `web app URL` (Provide the app service name in place of XXXX) and Save. Then go back to [Step 4](https://github.com/microsoft/Build-your-own-AI-Assistant-Solution-Accelerator/blob/PSL-Authenticate-Doc/Deployment/AIStudioDeployment.md#step-4-add-authentication-in-azure-app-service-configuration) and follow from _Point 4_ choose `Pick an existing app registration in this directory` from the Add an Identity Provider page and provide the newly registered App Name.

![Add Details](/Deployment/images/aiStudio/WebAppURL.png)
