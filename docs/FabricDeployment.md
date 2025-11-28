# Fabric Workspace Creation Guide 
Please follow the steps below to set up the Fabric Workspace and collect the id needed for next step. 

1. Launch Microsoft Fabric Data Engineering experience [Data Engineering](https://app.fabric.microsoft.com/home?experience=data-engineering).
2. Click on `Workspaces` from the left menu and click on `New Workspace` at the bottom of the menu.
    ![Create Workspace](/docs/images/fabric/workspaces.png)

3. Enter a Workspace Name and click on `Apply`.
    ![New Workspace](/docs/images/fabric/CreateWorkspace.png)

5. On the next page, click on `Import`.
    ![Create Workspace](/docs/images/fabric/WorkspaceGuid.png)

6. Click on `Notebook`.
    ![Create Workspace](/docs/images/fabric/ImportNotebooks.png)

7. Navigate to the local folder where you cloned/downloaded this repository and select notebooks shown in screenshot from path `<Your Download Folder Path>/infra/scripts/fabric_scripts/`.
    ![Create Workspace](/docs/images/fabric/SelectNotebooks.png)

8. Downloaded Notebooks appear in the workspace.
    ![Create Workspace](/docs/images/fabric/Notebooks.png)

9. You can Click on each notebook to see the code. These notebooks can be scheduled to run periodically if you plan to upload new documents to the storage account.
