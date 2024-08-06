# Fabric Workspace Creation Guide 
Please follow the steps below to set up the Fabric Workspace and collect the id needed for next step. 

1. Launch Microsoft Fabric Data Engineering experience [Data Engineering](https://app.fabric.microsoft.com/home?experience=data-engineering).
2. Click on `Workspaces` from the left menu and click on `New Workspace` at the bottom of the menu.
    ![Create Workspace](/Deployment/images/fabric/workspaces.png)

3. Enter a Workspace Name and click on `Apply`.
    ![New Workspace](/Deployment/images/fabric/CreateWorkspace.png)

4. On the next page, click on `New`.
    ![Create Workspace](/Deployment/images/fabric/WorkspaceGuid.png)

5. Click on `Import Notebook`.

    ![Create Workspace](/Deployment/images/fabric/ImportNotebooks.png)

5. Navigate to the local folder where you cloned/downloaded this repository and select notebooks shown in screenshot from path `<Your Download Folder Path>/Deployment/scripts/fabric_scripts/`.
  ![Create Workspace](/Deployment/images/fabric/SelectNotebooks.png)

6. Downloaded Notebooks appear in the workspace.
    ![Create Workspace](/Deployment/images/fabric/Notebooks.png)

7. You can Click on each notebook to see the code. These notebooks can be scheduled to run periodically if you plan to upload new documents to the storage account.