# Manual App Registration Configuration
This guide provides detailed steps to manually register both front-end and backend applications in Azure if automated registration is not an option due to security in place in your tenant and subscription.

## Prerequisites

- Access to **Microsoft Entra ID**
- Necessary permissions to create and manage **App Registrations** in your Azure tenant

## Step 1: Register the Web Application
### 1. Create App Registration
- Go to **Azure Portal** > **Microsoft Entra ID** > **Manage** > **App registrations**
- Click **+ New registration**
- Name the app (e.g., `byoc-app`)
- Under **Redirect URI**, choose **Web** and enter:

  ```
  https://<web-app-url>azurecontainerapps.io/auth/login/aad/callback
  ```

  To find your Web App URL:
  - Navigate to your newly deployed resource group in the Azure Portal.
  - Locate the web app in resource group.
  - Copy the Default domain url from the Overview .

- Click **Register**  
  ![ManualRegisterAppWeb1](./images/ManualRegisterAppWeb1.png)



### 2. Configure Certificates and Secrets

- Go to **Certificates & secrets**
- Click **+ New client secret**
- Description: Provide a meaningful name to identify the secret
- Expires: Select from the options or define a custom range
- Start (Optional for custom range): Set the starting date of the secret's validity
- End (Optional for custom range): Set the ending date of the secret's validity
- Click **Add** and remember to copy and store the secret value securely as it will not be shown again
![ManualRegisterAppWeb3](./images/ManualRegisterAppWeb3.png)

### 3. Get Tenant ID
- Go to **Tenant Properties** in [Azure Portal](https://portal.azure.com)
- Copy the Tenant ID (will be used in next step)

![ManualRegisterAppWeb6](./images/ManualRegisterAppWeb6.png)

### 4. Set Up Authentication in Web Container App

- Go to your Web Container App
- Go to **Authentication**
- Click **Add Identity Provider**
- Choose **Microsoft**
- Input:
  - **Client ID**: The Application (client) ID from the app registration
  - **Client Secret**: The secret value you generated in Certificates & Secrets from the app registration
  - **Issuer URL**: `https://sts.windows.net/<tenant_id>/v2.0`
  - **Allowed Token Audiences**: Usually the Application ID URI or Client ID
- Click **Add**  
  
![ManualRegisterAppWeb4](./images/ManualRegisterAppWeb4.png)

---

## Conclusion

You have now manually configured Azure App Registrations.
