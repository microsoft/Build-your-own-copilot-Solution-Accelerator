#!/bin/bash

SUBSCRIPTION_ID=""
LOCATION=""
MODELS_PARAMETER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --SubscriptionId)
      SUBSCRIPTION_ID="$2"
      shift 2
      ;;
    --Location)
      LOCATION="$2"
      shift 2
      ;;
    --ModelsParameter)
      MODELS_PARAMETER="$2"
      shift 2
      ;;
    *)
      echo "❌ ERROR: Unknown option: $1"
      exit 1
      ;;
  esac
done

AIFOUNDRY_NAME="${AZURE_AIFOUNDRY_NAME}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP}"

# Validate required parameters
MISSING_PARAMS=()
[[ -z "$SUBSCRIPTION_ID" ]] && MISSING_PARAMS+=("SubscriptionId")
[[ -z "$LOCATION" ]] && MISSING_PARAMS+=("Location")
[[ -z "$MODELS_PARAMETER" ]] && MISSING_PARAMS+=("ModelsParameter")

if [[ ${#MISSING_PARAMS[@]} -ne 0 ]]; then
  echo "❌ ERROR: Missing required parameters: ${MISSING_PARAMS[*]}"
  echo "Usage: $0 --SubscriptionId <SUBSCRIPTION_ID> --Location <LOCATION> --ModelsParameter <MODELS_PARAMETER>"
  exit 1
fi

# Check Azure login
if ! az account show > /dev/null 2>&1; then
  echo "❌ ERROR: You are not logged in to Azure CLI. Run 'az login'."
  exit 1
fi

# Load models from parameters file
model_json=$(jq -c ".parameters.$MODELS_PARAMETER.value[]" ./infra/main.parameters.json 2>/dev/null)
if [[ $? -ne 0 || -z "$model_json" ]]; then
  echo "❌ ERROR: '$MODELS_PARAMETER' not found in main.parameters.json"
  exit 1
fi

echo "ℹ️ Loaded AI model deployments:"
echo "$model_json" | jq

gpt4o=$(echo "$model_json" | jq -c 'select(.model.name | test("gpt-4o"))' | head -n1)
embedding=$(echo "$model_json" | jq -c 'select(.model.name == "text-embedding-ada-002")' | head -n1)

if [[ -z "$gpt4o" || -z "$embedding" ]]; then
  echo "❌ ERROR: Both gpt-4o and text-embedding-ada-002 must be present."
  exit 1
fi

GPT4O_NAME="${AZURE_ENV_MODEL_NAME:-$(echo "$gpt4o" | jq -r '.model.name')}"
GPT4O_CAPACITY="${AZURE_ENV_MODEL_CAPACITY:-$(echo "$gpt4o" | jq -r '.sku.capacity')}"
GPT4O_TYPE="${AZURE_ENV_MODEL_DEPLOYMENT_TYPE:-$(echo "$gpt4o" | jq -r '.sku.name')}"

EMBED_NAME="${AZURE_ENV_EMBEDDING_MODEL_NAME:-$(echo "$embedding" | jq -r '.model.name')}"
EMBED_CAPACITY="${AZURE_ENV_EMBEDDING_MODEL_CAPACITY:-$(echo "$embedding" | jq -r '.sku.capacity')}"
EMBED_TYPE="${AZURE_ENV_EMBEDDING_MODEL_DEPLOYMENT_TYPE:-$(echo "$embedding" | jq -r '.sku.name')}"

# Try to discover AI Foundry if not provided
if [[ -z "$AIFOUNDRY_NAME" && -n "$RESOURCE_GROUP" ]]; then
  AIFOUNDRY_NAME=$(az cognitiveservices account list \
    --resource-group "$RESOURCE_GROUP" \
    --query "sort_by([?kind=='AIServices'], &name)[0].name" -o tsv 2>/dev/null)
fi

if [[ -n "$AIFOUNDRY_NAME" && -n "$RESOURCE_GROUP" ]]; then
  existing=$(az cognitiveservices account show \
    --name "$AIFOUNDRY_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "name" -o tsv 2>/dev/null)

  if [[ -n "$existing" ]]; then
    azd env set AZURE_AIFOUNDRY_NAME "$existing" > /dev/null

    deployedModels=$(az cognitiveservices account deployment list \
      --name "$AIFOUNDRY_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --query "[].name" -o tsv 2>/dev/null)

    missing_models=()
    for model in "$GPT4O_NAME" "$EMBED_NAME"; do
      if ! grep -qw "$model" <<< "$deployedModels"; then
        missing_models+=("$model")
      fi
    done

    if [[ ${#missing_models[@]} -eq 0 ]]; then
      echo "⏭️ All models already deployed in AI Foundry '$AIFOUNDRY_NAME'. Skipping quota validation."
      exit 0
    else
      echo "🔍 Missing model deployments: ${missing_models[*]}"
    fi
  fi
fi

# Proceed with quota validation
az account set --subscription "$SUBSCRIPTION_ID"
echo "🎯 Active Subscription: $(az account show --query '[name, id]' --output tsv)"

./infra/scripts/validate_model_quota.sh \
  --location "$LOCATION" \
  --GPT4O_Name "$GPT4O_NAME" \
  --GPT4O_Capacity "$GPT4O_CAPACITY" \
  --GPT4O_DeploymentType "$GPT4O_TYPE" \
  --Embedding_Name "$EMBED_NAME" \
  --Embedding_Capacity "$EMBED_CAPACITY" \
  --Embedding_DeploymentType "$EMBED_TYPE"

exit_code=$?
if [[ $exit_code -ne 0 ]]; then
  echo "❌ ERROR: Quota validation failed."
  exit 1
else
  echo "✅ All model deployments passed quota validation successfully."
  exit 0
fi