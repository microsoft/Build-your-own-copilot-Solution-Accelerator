# --- validate_model_quota.ps1 ---
param (
    [string]$Location,
    [int]$GPT4O_Capacity,
    [int]$Embedding_Capacity,
    [string]$GPT4O_DeploymentType = "Standard",
    [string]$Embedding_DeploymentType = "GlobalStandard"
)

$GPT4O_Model = "gpt-4o"
$Embedding_Model = "text-embedding-ada-002"
$RECOMMENDED_TOKENS = 200
$Embedding_RECOMMENDED_TOKENS = 80
$minimumCapacity = 50
$BicepParamsFile = "main.bicepparams"
$ParametersJsonFile = "./infra/main.parameters.json"
$PreferredRegions = @('australiaeast', 'eastus', 'eastus2', 'francecentral', 'japaneast', 'norwayeast', 'southindia', 'swedencentral', 'uksouth', 'westus', 'westus3')

$AllResults = @()
$EligibleFallbacks = @()

function Validate-Inputs {
    $MissingParams = @()
    if (-not $Location) { $MissingParams += "location" }
    if (-not $GPT4O_Capacity -or $GPT4O_Capacity -le 0) { $MissingParams += "gpt4o_capacity" }
    if (-not $Embedding_Capacity -or $Embedding_Capacity -le 0) { $MissingParams += "embedding_capacity" }

    if ($MissingParams.Count -gt 0) {
        Write-Error "❌ ERROR: Missing or invalid parameters: $($MissingParams -join ', ')"
        Write-Host "Usage: .\validate_model_quota.ps1 -Location <LOCATION> -GPT4O_Capacity <CAPACITY> -Embedding_Capacity <CAPACITY> [-GPT4O_DeploymentType <DEPLOYMENT_TYPE>] [-Embedding_DeploymentType <DEPLOYMENT_TYPE>]"
        exit 1
    }

    if ($GPT4O_DeploymentType -notin @("Standard", "GlobalStandard")) {
        Write-Error "❌ ERROR: Invalid GPT-4o deployment type: $GPT4O_DeploymentType"
        exit 1
    }

    if ($Embedding_DeploymentType -notin @("Standard", "GlobalStandard")) {
        Write-Error "❌ ERROR: Invalid embedding model deployment type: $Embedding_DeploymentType"
        exit 1
    }
}

function Confirm-Action ($message) {
    do {
        $response = Read-Host "$message (y/n)"
        if ($response -notmatch "^[YyNn]$") {
            Write-Host "❌ Invalid input. Please enter 'y' or 'n'."
        }
    } while ($response -notmatch "^[YyNn]$")
    return $response -match "^[Yy]$"
}

function Check-ModelQuota {
    param (
        [string]$Region,
        [string]$ModelName,
        [string]$DeploymentType
    )
    try {
        $ModelType = "OpenAI.$DeploymentType.$ModelName"
        $ModelInfoRaw = az cognitiveservices usage list --location $Region --query "[?name.value=='$ModelType']" --output json 2>$null
        $ModelInfo = $ModelInfoRaw | ConvertFrom-Json
        if (-not $ModelInfo -or $ModelInfo.Count -eq 0) { return $null }

        $Current = [int]$ModelInfo[0].currentValue
        $Limit = [int]$ModelInfo[0].limit
        $Available = $Limit - $Current

        return [PSCustomObject]@{
            Region    = $Region
            Model     = $ModelType
            Limit     = $Limit
            Used      = $Current
            Available = $Available
        }
    } catch {
        return $null
    }
}

function Check-Quota {
    param ([string]$Region)

    $gptResult = Check-ModelQuota -Region $Region -ModelName $GPT4O_Model -DeploymentType $GPT4O_DeploymentType
    $embedResult = Check-ModelQuota -Region $Region -ModelName $Embedding_Model -DeploymentType $Embedding_DeploymentType

    if (-not $gptResult -or $gptResult.Available -lt $minimumCapacity) {
        # Write-Host "❌ Insufficient quota for GPT-4o in region '$Region'. Available: $($gptResult?.Available ?? 0), Required: $GPT4O_Capacity"
        return $null
    }

    if (-not $embedResult -or $embedResult.Available -lt $minimumCapacity) {
        # Write-Host "❌ Insufficient quota for embedding model in region '$Region'. Available: $($embedResult?.Available ?? 0), Required: $Embedding_Capacity"
        return $null
    }



    return [PSCustomObject]@{
        Region              = $Region
        GPT4O_Name          = $gptResult.Model
        GPT4O_Limit         = $gptResult.Limit
        GPT4O_Used          = $gptResult.Used
        GPT4O_Available     = $gptResult.Available
        Embedding_Name      = $embedResult.Model
        Embedding_Limit     = $embedResult.Limit
        Embedding_Used      = $embedResult.Used
        Embedding_Available = $embedResult.Available
    }
}

function Show-Table {
    # GPT-4o Table
    Write-Host "`n📊 Validating model deployment: gpt-4o"
    Write-Host "--------------------------------------------------------------------------------------------------"
    Write-Host "| No. | Region          | Model Name                          | Limit | Used  | Available |"
    Write-Host "--------------------------------------------------------------------------------------------------"
    $i = 1
    foreach ($entry in $AllResults | Where-Object { $_.GPT4O_Available -gt 0 }) {
        Write-Host ("| {0,-3} | {1,-15} | {2,-35} | {3,-5} | {4,-5} | {5,-9} |" -f $i, $entry.Region, $entry.GPT4O_Name, $entry.GPT4O_Limit, $entry.GPT4O_Used, $entry.GPT4O_Available)
        $i++
    }
    Write-Host "--------------------------------------------------------------------------------------------------"

    # Embedding Model Table
    Write-Host "`n📊 Validating model deployment: text-embedding"
    Write-Host "--------------------------------------------------------------------------------------------------"
    Write-Host "| No. | Region          | Model Name                          | Limit | Used  | Available |"
    Write-Host "--------------------------------------------------------------------------------------------------"
    $i = 1
    foreach ($entry in $AllResults | Where-Object { $_.Embedding_Available -gt 0 }) {
        Write-Host ("| {0,-3} | {1,-15} | {2,-35} | {3,-5} | {4,-5} | {5,-9} |" -f $i, $entry.Region, $entry.Embedding_Name, $entry.Embedding_Limit, $entry.Embedding_Used, $entry.Embedding_Available)
        $i++
    }
    Write-Host "--------------------------------------------------------------------------------------------------"
}

function Set-DeploymentValues($Region, $GPTCapacity, $EmbedCapacity) {
    azd env set AZURE_ENV_OPENAI_LOCATION "$Region" | Out-Null
    azd env set AZURE_ENV_EMBEDDING_MODEL_CAPACITY "$EmbedCapacity" | Out-Null
    azd env set AZURE_ENV_MODEL_CAPACITY "$GPTCapacity" | Out-Null

    if (Test-Path $ParametersJsonFile) {
        try {
            $json = Get-Content $ParametersJsonFile -Raw | ConvertFrom-Json
            if ($json.parameters.aiModelDeployments.value.Count -gt 0) {
                $json.parameters.aiModelDeployments.value[0].sku.capacity = $GPTCapacity
                $json | ConvertTo-Json -Depth 20 | Set-Content $ParametersJsonFile -Force
                Write-Host "✅ Updated '$ParametersJsonFile' with capacity $GPTCapacity."
            } else {
                Write-Host "⚠️  'aiModelDeployments.value' array is empty. No changes made."
            }
        } catch {
            Write-Host "❌ Failed to update '$ParametersJsonFile': $_"
        }
    } else {
        Write-Host "⚠️  '$ParametersJsonFile' not found. Skipping update."
    }
}

function Manual-Prompt {
    while ($true) {
        Write-Host "`n📍 Please enter a region to try manually"
        $ManualRegion = Read-Host "Enter region"
        if (-not $ManualRegion) {
            Write-Host "❌ No region entered. Exiting."
            exit 1
        }

        $GPTCapStr = Read-Host "Enter GPT-4o capacity"
        $EmbedCapStr = Read-Host "Enter Embedding capacity"
        if (-not ($GPTCapStr -as [int]) -or -not ($EmbedCapStr -as [int])) {
            Write-Host "❌ Invalid input. Try again."
            continue
        }

        $GPTCap = [int]$GPTCapStr
        $EmbedCap = [int]$EmbedCapStr

        if ($GPTCap -lt $RECOMMENDED_TOKENS -or $EmbedCap -lt $Embedding_RECOMMENDED_TOKENS) {
            if ($GPTCap -lt $RECOMMENDED_TOKENS) {
                Write-Host "`n⚠️  GPT-4o capacity ($GPTCap) is below the recommended minimum ($RECOMMENDED_TOKENS)."
            }
            if ($EmbedCap -lt $Embedding_RECOMMENDED_TOKENS) {
                Write-Host "`n⚠️  Embedding model capacity ($EmbedCap) is below the recommended minimum ($Embedding_RECOMMENDED_TOKENS)."
            }
            if (-not (Confirm-Action "❓ Proceed anyway?")) { continue }
        }

        $ManualResult = Check-Quota -Region $ManualRegion
        Write-Host "`n🔍 Checking quota in the manually entered region '$ManualRegion'..."
        Write-Host "$ManualResult | Format-Table -AutoSize"

        if (-not $ManualResult) {
            Write-Host "❌ No quota data retrieved for the manually entered region '$ManualRegion'."
            continue
        }else {
            if($ManualResult.GPT4O_Available -lt $GPTCap) {
                Write-Host "❌ Insufficient GPT-4o quota in region '$ManualRegion'. Available: $($ManualResult.GPT4O_Available), Required: $GPTCap"
                continue
            }
            if($ManualResult.Embedding_Available -lt $EmbedCap) {
                Write-Host "❌ Insufficient embedding model quota in region '$ManualRegion'. Available: $($ManualResult.Embedding_Available), Required: $EmbedCap"
                continue
            }
        }

        Manual-Prompt
    
        Set-DeploymentValues $ManualRegion $GPTCap $EmbedCap
        Write-Host "✅ Deployment values set. Exiting."
        exit 0
    }
}

# --- Start validation ---
Validate-Inputs

Write-Host "`n🔍 Checking quota in the requested region '$Location'..."
$PrimaryResult = Check-Quota -Region $Location

if ($PrimaryResult -and $PrimaryResult.GPT4O_Available -ge $GPT4O_Capacity -and $PrimaryResult.Embedding_Available -ge $Embedding_Capacity) {
    $AllResults += $PrimaryResult
    Show-Table
    Set-DeploymentValues $Location $GPT4O_Capacity $Embedding_Capacity
    Write-Host "✅ Proceeding with '$Location' as selected."
    exit 0
}

# Write-Host "❌ Insufficient quota in the requested region '$Location'. Checking fallback regions..."
if ($PrimaryResult) {
    Write-Host "`n❌ Insufficient quota in the requested region '$Location'."
    Write-Host "   📉 GPT-4o: Required = $GPT4O_Capacity, Available = $($PrimaryResult.GPT4O_Available)"
    Write-Host "   📉 Text Embedding: Required = $Embedding_Capacity, Available = $($PrimaryResult.Embedding_Available)"
    Write-Host "   📍 Checking fallback regions...  "
} else {
    Write-Host "`n❌ No quota data retrieved for the requested region '$Location'."
}

foreach ($region in $PreferredRegions) {
    if ($region -ne $Location) {
        $result = Check-Quota -Region $region
        if ($result) {
            $AllResults += $result
            if ($result.GPT4O_Available -ge $GPT4O_Capacity -and $result.Embedding_Available -ge $Embedding_Capacity) {
                $EligibleFallbacks += $region
            }
        }
    }
}

if ($AllResults.Count -gt 0) {
    Show-Table
}


if ($EligibleFallbacks.Count -gt 0) {
    Write-Host "`n👉 Eligible fallback regions with sufficient quota:"
    $EligibleFallbacks | ForEach-Object { Write-Host "  - $_" }
} else {
    Write-Host "`n❌ No fallback region has sufficient quota."
    Write-Host "📍 Please enter another region manually that has sufficient quota."
}

Manual-Prompt