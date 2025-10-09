# AVM Post Deployment Guide
This document provides guidance on post-deployment steps after deploying the Build Your Own Copilot Accelerator from the [AVM (Azure Verified Modules) repository](https://github.com/Azure/bicep-registry-modules/tree/main/avm/ptn/sa/build-your-own-copilot).

## Post Deployment Steps
1. Clone the Repository
    First, clone this repository to access the post-deployment scripts:
    ```bash
    git clone https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator.git
    ```
    ```bash
    cd Build-your-own-copilot-Solution-Accelerator
    ```

2. Import Sample Data -Run bash command printed in the terminal. The bash command will look like the following:

    ```bash 
    bash ./infra/scripts/process_sample_data.sh <resourceGroupName> 
    ```
    If the deployment does not exist or has been deleted – The script will prompt you to manually enter the required values

3. Add Authentication Provider

    Follow steps in [App Authentication](https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator/blob/main/docs/AppAuthentication.md) to configure authentication in app service. 
    >Note that Authentication changes can take up to 10 minutes.

4. Deleting Resources After a Failed Deployment

    Follow steps in [Delete Resource Group](https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator/blob/main/docs/DeleteResourceGroup.md) if your deployment fails and/or you need to clean up the resources.

By following these steps, you’ll ensure a smooth transition from deployment to hands-on usage.