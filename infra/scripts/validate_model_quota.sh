#!/bin/bash

while [[ $# -gt 0 ]]; do
  case "$1" in
    --location)
      LOCATION="$2"
      shift 2
      ;;
    --GPT4O_Name)
      GPT4O_NAME="$2"
      shift 2
      ;;
    --GPT4O_Capacity)
      GPT4O_CAPACITY="$2"
      shift 2
      ;;
    --GPT4O_DeploymentType)
      GPT4O_DEPLOYMENT_TYPE="$2"
      shift 2
      ;;
    --Embedding_Name)
      EMBED_NAME="$2"
      shift 2
      ;;
    --Embedding_Capacity)
      EMBEDDING_CAPACITY="$2"
      shift 2
      ;;
    --Embedding_DeploymentType)
      EMBEDDING_DEPLOYMENT_TYPE="$2"
      shift 2
      ;;
    *)
      echo "❌ Unknown argument: $1"
      exit 1
      ;;
  esac
done

# Optional: Debug print to verify variables
echo "🔍 LOCATION: $LOCATION"
echo "🔍 GPT4O_NAME: $GPT4O_NAME"
echo "🔍 GPT4O_CAPACITY: $GPT4O_CAPACITY"
echo "🔍 GPT4O_DEPLOYMENT_TYPE: $GPT4O_DEPLOYMENT_TYPE"
echo "🔍 EMBED_NAME: $EMBED_NAME"
echo "🔍 EMBEDDING_CAPACITY: $EMBEDDING_CAPACITY"
echo "🔍 EMBEDDING_DEPLOYMENT_TYPE: $EMBEDDING_DEPLOYMENT_TYPE"

GPT4O_MODEL="gpt-4o"
EMBEDDING_MODEL="text-embedding-ada-002"
RECOMMENDED_TOKENS=200
EMBEDDING_RECOMMENDED_TOKENS=80
MINIMUM_CAPACITY=50
BICEP_PARAMS_FILE="main.bicepparams"
PARAMETERS_JSON_FILE="./infra/main.parameters.json"
PREFERRED_REGIONS=(australiaeast eastus eastus2 francecentral japaneast norwayeast southindia swedencentral uksouth westus westus3)

ALL_RESULTS=()
ELIGIBLE_FALLBACKS=()

print_usage() {
    echo "Usage: $0 <LOCATION> <GPT4O_CAPACITY> <EMBEDDING_CAPACITY> [GPT4O_DEPLOYMENT_TYPE] [EMBEDDING_DEPLOYMENT_TYPE]"
    exit 1
}

validate_inputs() {
    if [[ -z "$LOCATION" || -z "$GPT4O_CAPACITY" || -z "$EMBEDDING_CAPACITY" ]]; then
        echo "❌ ERROR: Missing required parameters."
        print_usage
    fi

    if [[ "$GPT4O_DEPLOYMENT_TYPE" != "Standard" && "$GPT4O_DEPLOYMENT_TYPE" != "GlobalStandard" ]]; then
        echo "❌ ERROR: Invalid GPT-4o deployment type: $GPT4O_DEPLOYMENT_TYPE"
        exit 1
    fi

    if [[ "$EMBEDDING_DEPLOYMENT_TYPE" != "Standard" && "$EMBEDDING_DEPLOYMENT_TYPE" != "GlobalStandard" ]]; then
        echo "❌ ERROR: Invalid embedding model deployment type: $EMBEDDING_DEPLOYMENT_TYPE"
        exit 1
    fi
}

check_model_quota() {
    local region="$1"
    local model_name="$2"
    local deployment_type="$3"
    local model_type="OpenAI.${deployment_type}.${model_name}"
    local json
    json=$(az cognitiveservices usage list --location "$region" --query "[?name.value=='$model_type']" --output json 2>/dev/null)

    if [[ -z "$json" || "$json" == "[]" ]]; then
        echo ""
        return
    fi

    local current limit available
    current=$(echo "$json" | jq -r '.[0].currentValue')
    limit=$(echo "$json" | jq -r '.[0].limit')
    available=$((limit - current))

    echo "$region,$model_type,$limit,$current,$available"
}

check_quota() {
    local region="$1"
    local gpt_line embed_line

    gpt_line=$(check_model_quota "$region" "$GPT4O_MODEL" "$GPT4O_DEPLOYMENT_TYPE")
    embed_line=$(check_model_quota "$region" "$EMBEDDING_MODEL" "$EMBEDDING_DEPLOYMENT_TYPE")

    IFS=',' read -r _ _ _ _ gpt_avail <<< "$gpt_line"
    IFS=',' read -r _ _ _ _ embed_avail <<< "$embed_line"

    [[ -z "$gpt_line" || -z "$embed_line" ]] && return

    if (( gpt_avail < MINIMUM_CAPACITY || embed_avail < MINIMUM_CAPACITY )); then
        return
    fi

    echo "$gpt_line|$embed_line"
}

check_fallback_regions() {
    local skip_region="$1"
    ALL_RESULTS=()
    ELIGIBLE_FALLBACKS=()

    echo "🌍 Preferred regions: ${PREFERRED_REGIONS[*]}"
    
    for region in "${PREFERRED_REGIONS[@]}"; do
        [[ "$region" == "$skip_region" ]] && continue

        echo "🔍 Checking quota in '$region'..."
        result=$(check_quota "$region")

        if [[ -n "$result" ]]; then
            IFS='|' read -r gpt embed <<< "$result"
            IFS=',' read -r _ _ _ _ gpt_avail <<< "$gpt"
            IFS=',' read -r _ _ _ _ embed_avail <<< "$embed"

            ALL_RESULTS+=("$result")

            if (( gpt_avail >= GPT4O_CAPACITY && embed_avail >= EMBEDDING_CAPACITY )); then
                ELIGIBLE_FALLBACKS+=("$region")
            fi
        fi
    done

    if (( ${#ELIGIBLE_FALLBACKS[@]} > 0 )); then
        show_table
        echo -e "\n👉 Eligible fallback regions:"
        for region in "${ELIGIBLE_FALLBACKS[@]}"; do
            echo "  - $region"
        done

        if confirm_action "❓ Proceed with manual region '$manual_region'?"; then
            set_deployment_values "$manual_region" "$gpt_cap" "$embed_cap"
            echo "✅ Deployment values set. Exiting."
            exit 0
        else
            manual_prompt
            return
        fi
    else
        echo "❌ No eligible fallback regions found."
        echo "🔁 Let's try again..."
        manual_prompt
        return
    fi
}


show_table() {
    echo -e "\n📊 Validating model deployment: gpt-4o"
    echo "--------------------------------------------------------------------------------------------------"
    printf "| %-3s | %-15s | %-35s | %-5s | %-5s | %-9s |\n" "No." "Region" "Model Name" "Limit" "Used" "Available"
    echo "--------------------------------------------------------------------------------------------------"
    i=1
    for entry in "${ALL_RESULTS[@]}"; do
        IFS='|' read -r gpt embed <<< "$entry"
        IFS=',' read -r region model limit used avail <<< "$gpt"
        printf "| %-3s | %-15s | %-35s | %-5s | %-5s | %-9s |\n" "$i" "$region" "$model" "$limit" "$used" "$avail"
        ((i++))
    done
    echo "--------------------------------------------------------------------------------------------------"

    echo -e "\n📊 Validating model deployment: text-embedding"
    echo "--------------------------------------------------------------------------------------------------"
    printf "| %-3s | %-15s | %-35s | %-5s | %-5s | %-9s |\n" "No." "Region" "Model Name" "Limit" "Used" "Available"
    echo "--------------------------------------------------------------------------------------------------"
    i=1
    for entry in "${ALL_RESULTS[@]}"; do
        IFS='|' read -r gpt embed <<< "$entry"
        IFS=',' read -r region model limit used avail <<< "$embed"
        printf "| %-3s | %-15s | %-35s | %-5s | %-5s | %-9s |\n" "$i" "$region" "$model" "$limit" "$used" "$avail"
        ((i++))
    done
    echo "--------------------------------------------------------------------------------------------------"
}

set_deployment_values() {
    local region="$1"
    local gpt="$2"
    local embed="$3"

    azd env set AZURE_ENV_OPENAI_LOCATION "$region"
    azd env set AZURE_ENV_MODEL_CAPACITY "$gpt"
    azd env set AZURE_ENV_EMBEDDING_MODEL_CAPACITY "$embed"

    if [[ -f "$PARAMETERS_JSON_FILE" ]]; then
        jq --argjson gpt "$gpt" '.parameters.aiModelDeployments.value[0].sku.capacity = $gpt' "$PARAMETERS_JSON_FILE" > tmp.$$.json && mv tmp.$$.json "$PARAMETERS_JSON_FILE"
        echo "✅ Updated '$PARAMETERS_JSON_FILE' with capacity $gpt."
    else
        echo "⚠️  '$PARAMETERS_JSON_FILE' not found. Skipping update."
    fi
}

confirm_action() {
    local prompt="$1"
    read -rp "$prompt (y/n): " resp
    [[ "$resp" =~ ^[Yy]$ ]]
}

manual_prompt() {
    while true; do
        echo -e "\n📍 Please enter a region to try manually"
        read -rp "Enter region: " manual_region
        [[ -z "$manual_region" ]] && echo "❌ No region entered. Exiting." && exit 1

        read -rp "Enter GPT-4o capacity: " gpt_cap
        read -rp "Enter Embedding capacity: " embed_cap

        [[ ! "$gpt_cap" =~ ^[0-9]+$ || ! "$embed_cap" =~ ^[0-9]+$ ]] && echo "❌ Invalid input. Try again." && continue

        (( gpt_cap < RECOMMENDED_TOKENS )) && echo "⚠️ GPT-4o capacity ($gpt_cap) is below recommended ($RECOMMENDED_TOKENS)"
        (( embed_cap < EMBEDDING_RECOMMENDED_TOKENS )) && echo "⚠️ Embedding capacity ($embed_cap) is below recommended ($EMBEDDING_RECOMMENDED_TOKENS)"

        if (( gpt_cap < RECOMMENDED_TOKENS || embed_cap < EMBEDDING_RECOMMENDED_TOKENS )); then
            confirm_action "❓ Proceed anyway?" || continue
        fi

        result=$(check_quota "$manual_region")
        echo -e "\n🔍 Checking quota in '$manual_region'..."
        if [[ -z "$result" ]]; then
            echo "❌ No quota data retrieved for region '$manual_region'"
            continue
        fi

        IFS='|' read -r gpt embed <<< "$result"
        IFS=',' read -r _ _ _ _ gpt_avail <<< "$gpt"
        IFS=',' read -r _ _ _ _ embed_avail <<< "$embed"

        if (( gpt_avail < gpt_cap )); then
            echo "❌ Insufficient GPT-4o quota: $gpt_avail"
        fi

        if (( embed_avail < embed_cap )); then
            echo "❌ Insufficient Embedding quota: $embed_avail"
        fi

        check_fallback_regions "$manual_region"
        echo -e "\n✅ Sufficient quota found in '${ELIGIBLE_FALLBACKS[*]}'."

    done
}

# --- Main ---
validate_inputs

echo -e "\n🔍 Checking quota in the requested region '$LOCATION'..."
primary_result=$(check_quota "$LOCATION")

if [[ -n "$primary_result" ]]; then
    IFS='|' read -r gpt embed <<< "$primary_result"
    IFS=',' read -r _ _ _ _ gpt_avail <<< "$gpt"
    IFS=',' read -r _ _ _ _ embed_avail <<< "$embed"

    if (( gpt_avail >= GPT4O_CAPACITY && embed_avail >= EMBEDDING_CAPACITY )); then
        ALL_RESULTS+=("$primary_result")
        show_table
        set_deployment_values "$LOCATION" "$GPT4O_CAPACITY" "$EMBEDDING_CAPACITY"
        echo "✅ Proceeding with '$LOCATION'."
        exit 0
    else
        echo -e "\n❌ Insufficient quota in '$LOCATION'."
        echo "   📉 GPT-4o: Required = $GPT4O_CAPACITY, Available = $gpt_avail"
        echo "   📉 Embedding: Required = $EMBEDDING_CAPACITY, Available = $embed_avail"
        echo "   📍 Checking fallback regions..."
    fi
else
    echo -e "\n❌ No quota data retrieved for '$LOCATION'."
fi

check_fallback_regions "$LOCATION"

if (( ${#ALL_RESULTS[@]} > 0 )); then
    show_table
fi

if (( ${#ELIGIBLE_FALLBACKS[@]} > 0 )); then
    echo -e "\n👉 Eligible fallback regions with sufficient quota:"
    for region in "${ELIGIBLE_FALLBACKS[@]}"; do
        echo "  - $region"
    done
else
    echo -e "\n❌ No fallback region has sufficient quota."
    echo "📍 Please enter another region manually."
fi

manual_prompt