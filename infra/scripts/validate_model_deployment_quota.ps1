param (
    [string]$SubscriptionId,
    [string]$Location,
    [string]$ModelsParameter
)

$AiFoundryName = $env:AZURE_AIFOUNDRY_NAME
$ResourceGroup = $env:AZURE_RESOURCE_GROUP

# Validate required parameters
$MissingParams = @()
if (-not $SubscriptionId) { $MissingParams += "SubscriptionId" }
if (-not $Location) { $MissingParams += "Location" }
if (-not $ModelsParameter) { $MissingParams += "ModelsParameter" }

if ($MissingParams.Count -gt 0) {
    Write-Error "❌ ERROR: Missing required parameters: $($MissingParams -join ', ')"
    exit 1
}

# Check Azure login
try {
    $accountCheck = az account show --output none 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ ERROR: You are not logged in to Azure CLI. Please run 'az login'."
        exit 1
    }
} catch {
    Write-Error "❌ ERROR: Failed to verify Azure login."
    exit 1
}

# Load model deployments from parameter file
$JsonContent = Get-Content -Path "./infra/main.parameters.json" -Raw | ConvertFrom-Json
$availableKeys = $JsonContent.parameters.PSObject.Properties.Name

if (-not $JsonContent.parameters.$ModelsParameter) {
    Write-Error "❌ ERROR: '$ModelsParameter' not found in main.parameters.json"
    Write-Host "Available Parameters: $($availableKeys -join ', ')"
    exit 1
}

$aiModelDeployments = $JsonContent.parameters.$ModelsParameter.value

if (-not $aiModelDeployments -or $aiModelDeployments.Count -lt 2) {
    Write-Error "❌ ERROR: Expected at least 2 model deployments in '$ModelsParameter'"
    exit 1
}

Write-Host "ℹ️ Loaded AI model deployments from main.parameters.json"
$aiModelDeployments | ConvertTo-Json -Depth 10 | Write-Host

# Extract both model configs
$gpt4o = $aiModelDeployments | Where-Object { $_.model.name -like "gpt-4o*" }
$embed = $aiModelDeployments | Where-Object { $_.model.name -like "text-embedding-ada-002" }

if (-not $gpt4o -or -not $embed) {
    Write-Error "❌ ERROR: Could not find both gpt-4o and text-embedding-ada-002 models."
    exit 1
}

$GPT4O_Name = if ($env:AZURE_ENV_MODEL_NAME) { $env:AZURE_ENV_MODEL_NAME } else { $gpt4o.model.name }
$GPT4O_Capacity = if ($env:AZURE_ENV_MODEL_CAPACITY) { $env:AZURE_ENV_MODEL_CAPACITY } else { $gpt4o.sku.capacity }
$GPT4O_DeploymentType = if ($env:AZURE_ENV_MODEL_DEPLOYMENT_TYPE) { $env:AZURE_ENV_MODEL_DEPLOYMENT_TYPE } else { $gpt4o.sku.name }

$Embedding_Name = if ($env:AZURE_ENV_EMBEDDING_MODEL_NAME) { $env:AZURE_ENV_EMBEDDING_MODEL_NAME } else { $embed.model.name }
$Embedding_Capacity = if ($env:AZURE_ENV_EMBEDDING_MODEL_CAPACITY) { $env:AZURE_ENV_EMBEDDING_MODEL_CAPACITY } else { $embed.sku.capacity }
$Embedding_DeploymentType = $embed.sku.name

# Optional: Check if already deployed
if (-not $AiFoundryName -and $ResourceGroup) {
    $AiFoundryName = az cognitiveservices account list `
        --resource-group $ResourceGroup `
        --query "sort_by([?kind=='AIServices'], &name)[0].name" `
        -o tsv 2>$null
}

if ($AiFoundryName -and $ResourceGroup) {
    $existing = az cognitiveservices account show `
        --name $AiFoundryName `
        --resource-group $ResourceGroup `
        --query "name" --output tsv 2>$null

    if ($existing) {
        azd env set AZURE_AIFOUNDRY_NAME $existing | Out-Null

        $deployedModelsOutput = az cognitiveservices account deployment list `
            --name $AiFoundryName `
            --resource-group $ResourceGroup `
            --query "[].name" --output tsv 2>$null

        $deployedModels = @()
        if ($deployedModelsOutput -is [string]) {
            $deployedModels += $deployedModelsOutput
        } elseif ($deployedModelsOutput) {
            $deployedModels = $deployedModelsOutput -split "`r?`n"
        }

        $missingDeployments = @($gpt4o.name, $embed.name) | Where-Object { $_ -notin $deployedModels }

        if ($missingDeployments.Count -eq 0) {
            Write-Host "⏭️ All models already deployed in AI Foundry '$AiFoundryName'. Skipping validation."
            exit 0
        } else {
            Write-Host "🔍 Missing models: $($missingDeployments -join ', ')"
        }
    }
}

# Set subscription and call inner script
az account set --subscription $SubscriptionId
Write-Host "🎯 Active Subscription: $(az account show --query '[name, id]' --output tsv)"

# ✅ CALL INNER SCRIPT ONCE with all values together
& .\infra\scripts\validate_model_quota.ps1 `
    -Location $Location `
    -GPT4O_Name $GPT4O_Name `
    -GPT4O_Capacity $GPT4O_Capacity `
    -GPT4O_DeploymentType $GPT4O_DeploymentType `
    -Embedding_Name $Embedding_Name `
    -Embedding_Capacity $Embedding_Capacity `
    -Embedding_DeploymentType $Embedding_DeploymentType

$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
    Write-Error "❌ ERROR: Quota validation failed."
    exit 1
} else {
    Write-Host "✅ All model deployments passed quota validation successfully."
    exit 0
}
