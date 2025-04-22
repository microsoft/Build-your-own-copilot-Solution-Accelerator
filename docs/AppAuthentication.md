# Set up Authentication in Azure Container App

This document provides step-by-step instructions to configure Azure App Registrations for a front-end application.

## Prerequisites

- Access to **Microsoft Entra ID**
- Necessary permissions to create and manage **App Registrations**

## Add Authentication in Azure App Service configuration

1. Click on `Authentication` from left menu.

  ![Authentication](images/AppAuthentication.png)

1. Click on `+ Add identity provider` to see a list of identity providers.

  ![Authentication Identity](images/AppAuthenticationIdentity.png)

1. Click on `+ Add Provider` to see a list of identity providers.

  ![Add Provider](images/AppAuthIdentityProvider.png)

1. Select the first option `Microsoft Entra Id` from the drop-down list.
 ![Add Provider](images/AppAuthIdentityProviderAdd.png)

1. Accept the default values and click on `Add` button to go back to the previous page with the identify provider added.