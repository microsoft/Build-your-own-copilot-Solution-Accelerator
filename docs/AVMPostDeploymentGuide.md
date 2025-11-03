# AVM Post Deployment Guide

> **📋 Note**: This guide is specifically for post-deployment steps after using the AVM template. For complete deployment from scratch, see the main [Deployment Guide](./DeploymentGuide.md).

---

This document provides guidance on post-deployment steps after deploying the Build Your Own Copilot Accelerator from the [AVM (Azure Verified Modules) repository](https://github.com/Azure/bicep-registry-modules/tree/main/avm/ptn/sa/build-your-own-copilot).

## Post Deployment Steps

### 1. Clone the Repository
First, clone this repository to access the post-deployment scripts:

```bash
git clone https://github.com/microsoft/Build-your-own-copilot-Solution-Accelerator.git
cd Build-your-own-copilot-Solution-Accelerator
```

### 2. Import Sample Data 

**Choose the appropriate command based on your deployment method:**

**If you deployed using custom templates, ARM/Bicep deployments, or `az deployment group` commands:**
```bash 
bash ./infra/scripts/process_sample_data.sh <your-resource-group-name>
```
> **Note**: Replace `<your-resource-group-name>` with the actual name of the resource group containing your deployed Azure resources.

> **💡 Tip**: If the deployment metadata does not exist in Azure or has been deleted, the script will prompt you to manually enter the required configuration values.

**If you deployed using `azd up` command:**
```bash 
bash ./infra/scripts/process_sample_data.sh 
```
> **Note**: The script will automatically take required values from your `azd` environment.

> **💡 Tip**: Since this guide is for AVM deployments, you'll most likely use the first command with your resource group name.

### 3. Configure Authentication

Follow the steps in [App Authentication](./AppAuthentication.md) to configure authentication in App Service. 

> **Note**: Authentication changes can take up to 10 minutes to propagate.

### 4. Troubleshooting: Cleaning Up After a Failed Deployment

If your deployment fails and you need to clean up resources, follow the steps in [Delete Resource Group](./DeleteResourceGroup.md).

---

By following these steps, you'll ensure a smooth transition from deployment to hands-on usage.