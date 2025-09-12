	#!/bin/bash

	# Variables
	resourceGroupName="$1"
	cosmosDbAccountName="$2"
	storageAccount="$3"
	fileSystem="$4"
	keyvaultName="$5"
	sqlServerName="$6"
	SqlDatabaseName="$7"
	webAppManagedIdentityClientId="$8"
	webAppManagedIdentityDisplayName="$9"
	aiSearchName="${10}"
	aif_resource_id="${11}"

	# Global variables to track original network access states
	original_storage_public_access=""
	original_storage_default_action=""
	original_foundry_public_access=""
	aif_resource_group=""
	aif_account_resource_id=""
	# Add global variable for SQL Server public access
	original_sql_public_access=""
	created_sql_allow_all_firewall_rule="false"
	original_full_range_rule_present="false"

	# Function to enable public network access temporarily
	enable_public_access() {
		echo "=== Temporarily enabling public network access for services ==="
		
		# Enable public access for Storage Account
		echo "Enabling public access for Storage Account: $storageAccount"
		original_storage_public_access=$(az storage account show \
			--name "$storageAccount" \
			--resource-group "$resourceGroupName" \
			--query "publicNetworkAccess" \
			-o tsv)
		original_storage_default_action=$(az storage account show \
			--name "$storageAccount" \
			--resource-group "$resourceGroupName" \
			--query "networkRuleSet.defaultAction" \
			-o tsv)
		
		if [ "$original_storage_public_access" != "Enabled" ]; then
			az storage account update \
				--name "$storageAccount" \
				--resource-group "$resourceGroupName" \
				--public-network-access Enabled \
				--output none
			if [ $? -eq 0 ]; then
				echo "✓ Storage Account public access enabled"
			else
				echo "✗ Failed to enable Storage Account public access"
				return 1
			fi
		else
			echo "✓ Storage Account public access already enabled"
		fi
		
		# Also ensure the default network action allows access
		if [ "$original_storage_default_action" != "Allow" ]; then
			echo "Setting Storage Account network default action to Allow"
			az storage account update \
				--name "$storageAccount" \
				--resource-group "$resourceGroupName" \
				--default-action Allow \
				--output none
			if [ $? -eq 0 ]; then
				echo "✓ Storage Account network default action set to Allow"
			else
				echo "✗ Failed to set Storage Account network default action"
				return 1
			fi
		else
			echo "✓ Storage Account network default action already set to Allow"
		fi

		# Enable public access for AI Foundry
		# Extract the account resource ID (remove /projects/... part if present)
		aif_account_resource_id=$(echo "$aif_resource_id" | sed 's|/projects/.*||')
		aif_resource_name=$(basename "$aif_account_resource_id")
		# Extract resource group from the AI Foundry account resource ID
		aif_resource_group=$(echo "$aif_account_resource_id" | sed -n 's|.*/resourceGroups/\([^/]*\)/.*|\1|p')
		
		original_foundry_public_access=$(az cognitiveservices account show \
			--name "$aif_resource_name" \
			--resource-group "$aif_resource_group" \
			--query "properties.publicNetworkAccess" \
			--output tsv)
		if [ -z "$original_foundry_public_access" ] || [ "$original_foundry_public_access" = "null" ]; then
			echo "⚠ Info: Could not retrieve AI Foundry network access status."
			echo "  AI Foundry network access might be managed differently."
		elif [ "$original_foundry_public_access" != "Enabled" ]; then
			echo "Current AI Foundry public access: $original_foundry_public_access"
			echo "Enabling public access for AI Foundry resource: $aif_resource_name (Resource Group: $aif_resource_group)"
			if MSYS_NO_PATHCONV=1 az resource update \
				--ids "$aif_account_resource_id" \
				--api-version 2024-10-01 \
				--set properties.publicNetworkAccess=Enabled properties.apiProperties="{}" \
				--output none; then
				echo "✓ AI Foundry public access enabled"
			else
				echo "⚠ Warning: Failed to enable AI Foundry public access automatically."
			fi
		else
			echo "✓ AI Foundry public access already enabled"
		fi


		# Enable public access for SQL Server
		echo "Enabling public access for SQL Server: $sqlServerName"
		original_sql_public_access=$(az sql server show \
			--name "$sqlServerName" \
			--resource-group "$resourceGroupName" \
			--query "publicNetworkAccess" \
			-o tsv)
		if [ "$original_sql_public_access" != "Enabled" ]; then
			az sql server update \
				--name "$sqlServerName" \
				--resource-group "$resourceGroupName" \
				--enable-public-network true \
				--output none
			if [ $? -eq 0 ]; then
				echo "✓ SQL Server public access enabled"
			else
				echo "✗ Failed to enable SQL Server public access"
				return 1
			fi
		else
			echo "✓ SQL Server public access already enabled"
		fi

		# Add (or verify) a firewall rule allowing all IPs (TEMPORARY)
        echo "Ensuring temporary wide-open firewall rule exists for data load"
        sql_allow_all_rule_name="temp-allow-all-ip"

        # Detect if a full-range rule (any name) already existed before we potentially create one
        pre_existing_full_range_rule=$(az sql server firewall-rule list \
            --server "$sqlServerName" \
            --resource-group "$resourceGroupName" \
            --query "[?startIpAddress=='0.0.0.0' && endIpAddress=='255.255.255.255'] | [0].name" \
            -o tsv 2>/dev/null)
        if [ -n "$pre_existing_full_range_rule" ]; then
            original_full_range_rule_present="true"
        fi

        existing_allow_all_rule=$(az sql server firewall-rule list \
            --server "$sqlServerName" \
            --resource-group "$resourceGroupName" \
            --query "[?name=='${sql_allow_all_rule_name}'] | [0].name" \
            -o tsv 2>/dev/null)

        if [ -z "$existing_allow_all_rule" ]; then
            if [ -n "$pre_existing_full_range_rule" ]; then
                echo "✓ Existing rule ($pre_existing_full_range_rule) already allows full IP range."
            else
                echo "Creating temporary allow-all firewall rule ($sql_allow_all_rule_name)..."
                if az sql server firewall-rule create \
                    --resource-group "$resourceGroupName" \
                    --server "$sqlServerName" \
                    --name "$sql_allow_all_rule_name" \
                    --start-ip-address 0.0.0.0 \
                    --end-ip-address 255.255.255.255 \
                    --output none; then
                    created_sql_allow_all_firewall_rule="true"
                    echo "✓ Temporary allow-all firewall rule created"
                else
                    echo "⚠ Warning: Failed to create allow-all firewall rule"
                fi
            fi
        else
            echo "✓ Temporary allow-all firewall rule already present"
            # Since it was present beforehand, mark that a full-range rule existed originally
            original_full_range_rule_present="true"
        fi
		
		# Wait a bit for changes to take effect
		echo "Waiting for network access changes to propagate..."
		sleep 10
		echo "=== Public network access enabled successfully ==="
		return 0
	}

	# Function to restore original network access settings
	restore_network_access() {
		echo "=== Restoring original network access settings ==="
		
		# Restore Storage Account access
		if [ -n "$original_storage_public_access" ] && [ "$original_storage_public_access" != "Enabled" ]; then
			echo "Restoring Storage Account public access to: $original_storage_public_access"
			# Handle case sensitivity - convert to proper case
			case "$original_storage_public_access" in
				"enabled"|"Enabled") restore_value="Enabled" ;;
				"disabled"|"Disabled") restore_value="Disabled" ;;
				*) restore_value="$original_storage_public_access" ;;
			esac
			az storage account update \
				--name "$storageAccount" \
				--resource-group "$resourceGroupName" \
				--public-network-access "$restore_value" \
				--output none
			if [ $? -eq 0 ]; then
				echo "✓ Storage Account access restored"
			else
				echo "✗ Failed to restore Storage Account access"
			fi
		else
			echo "Storage Account access unchanged (already at desired state)"
		fi
		
		# Restore Storage Account network default action
		if [ -n "$original_storage_default_action" ] && [ "$original_storage_default_action" != "Allow" ]; then
			echo "Restoring Storage Account network default action to: $original_storage_default_action"
			az storage account update \
				--name "$storageAccount" \
				--resource-group "$resourceGroupName" \
				--default-action "$original_storage_default_action" \
				--output none
			if [ $? -eq 0 ]; then
				echo "✓ Storage Account network default action restored"
			else
				echo "✗ Failed to restore Storage Account network default action"
			fi
		else
			echo "Storage Account network default action unchanged (already at desired state)"
		fi
		
		# Restore AI Foundry access
		if [ -n "$original_foundry_public_access" ] && [ "$original_foundry_public_access" != "Enabled" ]; then
			echo "Restoring AI Foundry public access to: $original_foundry_public_access"
			# Try using the working approach to restore the original setting
			if MSYS_NO_PATHCONV=1 az resource update \
				--ids "$aif_account_resource_id" \
				--api-version 2024-10-01 \
				--set properties.publicNetworkAccess="$original_foundry_public_access" \
            	--set properties.apiProperties.qnaAzureSearchEndpointKey="" \
            	--set properties.networkAcls.bypass="AzureServices" \
				--output none 2>/dev/null; then
				echo "✓ AI Foundry access restored"
			else
				echo "⚠ Warning: Failed to restore AI Foundry access automatically."
				echo "  Please manually restore network access in the Azure portal if needed."
			fi
		else
			echo "AI Foundry access unchanged (already at desired state)"
		fi

		# Restore SQL Server public access
		if [ -n "$original_sql_public_access" ] && [ "$original_sql_public_access" != "Enabled" ]; then
			echo "Restoring SQL Server public access to: $original_sql_public_access"
			# Handle case sensitivity
			case "$original_sql_public_access" in
				"enabled"|"Enabled") restore_value=true ;;
				"disabled"|"Disabled") restore_value=false ;;
				*) restore_value="$original_sql_public_access" ;;
			esac
			az sql server update \
				--name "$sqlServerName" \
				--resource-group "$resourceGroupName" \
				--enable-public-network $restore_value \
				--output none
			if [ $? -eq 0 ]; then
				echo "✓ SQL Server access restored"
			else
				echo "✗ Failed to restore SQL Server access"
			fi
		else
			echo "SQL Server access unchanged (already at desired state)"
		fi

	}
	echo "=== Network access restoration completed ==="
	
	# Function to handle script cleanup on exit
	cleanup_on_exit() {
		exit_code=$?
		echo ""
		if [ $exit_code -ne 0 ]; then
			echo "Script failed with exit code: $exit_code"
		fi
		echo "Performing cleanup..."
		restore_network_access
		exit $exit_code
	}

	# Set up trap to ensure cleanup happens on exit
	trap cleanup_on_exit EXIT INT TERM

	# get parameters from azd env, if not provided
	if [ -z "$resourceGroupName" ]; then
		resourceGroupName=$(azd env get-value RESOURCE_GROUP_NAME)
	fi


	if [ -z "$cosmosDbAccountName" ]; then
		cosmosDbAccountName=$(azd env get-value COSMOSDB_ACCOUNT_NAME)
	fi

	if [ -z "$storageAccount" ]; then
		storageAccount=$(azd env get-value STORAGE_ACCOUNT_NAME)
	fi

	if [ -z "$fileSystem" ]; then
		fileSystem=$(azd env get-value STORAGE_CONTAINER_NAME)
	fi

	if [ -z "$keyvaultName" ]; then
		keyvaultName=$(azd env get-value KEY_VAULT_NAME)
	fi

	if [ -z "$sqlServerName" ]; then
		sqlServerName=$(azd env get-value SQLDB_SERVER_NAME)
	fi

	if [ -z "$SqlDatabaseName" ]; then
		SqlDatabaseName=$(azd env get-value SQLDB_DATABASE)
	fi

	if [ -z "$webAppManagedIdentityClientId" ]; then
		webAppManagedIdentityClientId=$(azd env get-value MANAGEDIDENTITY_WEBAPP_CLIENTID)
	fi

	if [ -z "$webAppManagedIdentityDisplayName" ]; then
		webAppManagedIdentityDisplayName=$(azd env get-value MANAGEDIDENTITY_WEBAPP_NAME)
	fi

	if [ -z "$aiSearchName" ]; then
		aiSearchName=$(azd env get-value AI_SEARCH_SERVICE_NAME)
	fi

	if [ -z "$aif_resource_id" ]; then
		aif_resource_id=$(azd env get-value AI_FOUNDRY_RESOURCE_ID)
	fi

	azSubscriptionId=$(azd env get-value AZURE_SUBSCRIPTION_ID)

	# Check if all required arguments are provided
	if  [ -z "$resourceGroupName" ] || [ -z "$cosmosDbAccountName" ] || [ -z "$storageAccount" ] || [ -z "$fileSystem" ] || [ -z "$keyvaultName" ] || [ -z "$sqlServerName" ] || [ -z "$SqlDatabaseName" ] || [ -z "$webAppManagedIdentityClientId" ] || [ -z "$webAppManagedIdentityDisplayName" ] || [ -z "$aiSearchName" ] || [ -z "$aif_resource_id" ]; then
		echo "Usage: $0 <resourceGroupName> <cosmosDbAccountName> <storageAccount> <storageContainerName> <keyvaultName> <sqlServerName> <sqlDatabaseName> <webAppUserManagedIdentityClientId> <webAppUserManagedIdentityDisplayName> <aiSearchName> <aiFoundryResourceGroup> <aif_resource_id>"
		exit 1
	fi

	# Authenticate with Azure
	if az account show &> /dev/null; then
		echo "Already authenticated with Azure."
	else
		echo "Not authenticated with Azure. Attempting to authenticate..."
		if [ -n "$managedIdentityClientId" ]; then
			# Use managed identity if running in Azure
			echo "Authenticating with Managed Identity..."
			az login --identity --client-id ${managedIdentityClientId}
		else
			# Use Azure CLI login if running locally
			echo "Authenticating with Azure CLI..."
			az login
		fi
	fi

	#check if user has selected the correct subscription
	currentSubscriptionId=$(az account show --query id -o tsv)
	currentSubscriptionName=$(az account show --query name -o tsv)
	if [ "$currentSubscriptionId" != "$azSubscriptionId" ]; then
		echo "Current selected subscription is $currentSubscriptionName ( $currentSubscriptionId )."
		read -rp "Do you want to continue with this subscription?(y/n): " confirmation
		if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
			echo "Fetching available subscriptions..."
			availableSubscriptions=$(az account list --query "[?state=='Enabled'].[name,id]" --output tsv)
			while true; do
				echo ""
				echo "Available Subscriptions:"
				echo "========================"
				echo "$availableSubscriptions" | awk '{printf "%d. %s ( %s )\n", NR, $1, $2}'
				echo "========================"
				echo ""
				read -rp "Enter the number of the subscription (1-$(echo "$availableSubscriptions" | wc -l)) to use: " subscriptionIndex
				if [[ "$subscriptionIndex" =~ ^[0-9]+$ ]] && [ "$subscriptionIndex" -ge 1 ] && [ "$subscriptionIndex" -le $(echo "$availableSubscriptions" | wc -l) ]; then
					selectedSubscription=$(echo "$availableSubscriptions" | sed -n "${subscriptionIndex}p")
					selectedSubscriptionName=$(echo "$selectedSubscription" | cut -f1)
					selectedSubscriptionId=$(echo "$selectedSubscription" | cut -f2)

					# Set the selected subscription
					if  az account set --subscription "$selectedSubscriptionId"; then
						echo "Switched to subscription: $selectedSubscriptionName ( $selectedSubscriptionId )"
						break
					else
						echo "Failed to switch to subscription: $selectedSubscriptionName ( $selectedSubscriptionId )."
					fi
				else
					echo "Invalid selection. Please try again."
				fi
			done
		else
			echo "Proceeding with the current subscription: $currentSubscriptionName ( $currentSubscriptionId )"
			az account set --subscription "$currentSubscriptionId"
		fi
	else
		echo "Proceeding with the subscription: $currentSubscriptionName ( $currentSubscriptionId )"
		az account set --subscription "$currentSubscriptionId"
	fi


	# Enable public network access for required services
	enable_public_access
	if [ $? -ne 0 ]; then
		echo "Error: Failed to enable public network access for services."
		exit 1
	fi


	# Call add_cosmosdb_access.sh
	echo "Running add_cosmosdb_access.sh"
	bash infra/scripts/add_cosmosdb_access.sh "$resourceGroupName" "$cosmosDbAccountName"
	if [ $? -ne 0 ]; then
		echo "Error: add_cosmosdb_access.sh failed."
		exit 1
	fi
	echo "add_cosmosdb_access.sh completed successfully."

	# Call copy_kb_files.sh
	echo "Running copy_kb_files.sh"
	bash infra/scripts/copy_kb_files.sh "$storageAccount" "$fileSystem"
	if [ $? -ne 0 ]; then
		echo "Error: copy_kb_files.sh failed."
		exit 1
	fi
	echo "copy_kb_files.sh completed successfully."

	# Call run_create_index_scripts.sh
	echo "Running run_create_index_scripts.sh"
	bash infra/scripts/run_create_index_scripts.sh "$keyvaultName" "" "" "$resourceGroupName" "$sqlServerName" "$aiSearchName" "$aif_resource_id"
	if [ $? -ne 0 ]; then
		echo "Error: run_create_index_scripts.sh failed."
		exit 1
	fi
	echo "run_create_index_scripts.sh completed successfully."

	# Call create_sql_user_and_role.sh
	echo "Running create_sql_user_and_role.sh"
	bash infra/scripts/add_user_scripts/create_sql_user_and_role.sh "$sqlServerName.database.windows.net" "$SqlDatabaseName" '[
		{"clientId":"'"$webAppManagedIdentityClientId"'", "displayName":"'"$webAppManagedIdentityDisplayName"'", "role":"db_datareader"},
		{"clientId":"'"$webAppManagedIdentityClientId"'", "displayName":"'"$webAppManagedIdentityDisplayName"'", "role":"db_datawriter"}
	]'
	if [ $? -ne 0 ]; then
		echo "Error: create_sql_user_and_role.sh failed."
		exit 1
	fi
	echo "create_sql_user_and_role.sh completed successfully."

	echo "All scripts executed successfully."
	echo "Network access will be restored to original settings..."
	# Note: cleanup_on_exit will be called automatically via the trap