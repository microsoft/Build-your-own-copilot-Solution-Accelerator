# Guide to local development

## Requirements:

- Python 3.10 or higher + PIP
- Azure CLI, and an Azure Subscription
- Visual Studio Code IDE

## Local Setup:

Follow these steps to set up and run the application locally:

### 1. Open the src Folder
Navigate to the `src` folder of the repository using Visual Studio Code.

### 2. Configure Environment Variables
- Navigate to the `src` folder and create a `.env` file based on the provided `.env.sample` file.
- Update the `.env` file with the required values from your Azure resource group in Azure Portal App Service environment variables.
- Make sure to set APP_ENV to "**dev**" in `.env` file.

### 3. (Optional) Python Virtual Environment
- Navigate to the `src` folder, create and activate your virtual environment `venv` under `src` folder.

### 4. Start the Application
- Run `start.cmd` (Windows) or `start.sh` (Linux/Mac) to:
  - Install backend dependencies.
  - Install frontend dependencies.
  - Build the frontend.
  - Start the backend server.

### 5. Access the Application
Once the app is running, open your browser and navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000).
