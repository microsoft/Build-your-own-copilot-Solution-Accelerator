@description('Solution Name')
param solutionName string = 'abdmuji'
@description('Specifies the location for resources.')
param solutionLocation string //= 'northcentralus'
param baseUrl string //='https://raw.githubusercontent.com/microsoft/Build-your-own-copilot-Solution-Accelerator/main/ClientAdvisor/'
param managedIdentityObjectId string //= '/subscriptions/1d5876cd-7603-407a-96d2-ae5ca9a9c5f3/resourcegroups/rg-psl-ab-sfisql2/providers/Microsoft.ManagedIdentity/userAssignedIdentities/abd02-managed-identity'
param managedIdentityClientId string //= '0e317066-685b-40bf-973b-9b5e19aad440'
param storageAccountName string //='abd02storageaccount'
param containerName string //='data'
param containerAppName string = '${ solutionName }containerapp'
param environmentName string = '${ solutionName }containerappenv'
param imageName string = 'python:3.11-alpine'
param setupCopyKbFiles string = '${baseUrl}Deployment/scripts/copy_kb_files.sh'
param setupCreateIndexScriptsUrl string = '${baseUrl}Deployment/scripts/run_create_index_scripts.sh'
param createSqlUserAndRoleScriptsUrl string = '${baseUrl}Deployment/scripts/add_user_scripts/create-sql-user-and-role.ps1'
param keyVaultName string //='abd02-kv-ne7y2sapfmnic'
param sqlServerName string //='abd02-sql-server'
param sqlDbName string //= 'abd02-sql-db'
param sqlUsers array = [
]
param logAnalyticsWorkspaceResourceName string //='workspace-abd02'
var resourceGroupName = resourceGroup().name

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2020-10-01' existing = {
  name: logAnalyticsWorkspaceResourceName
  scope: resourceGroup()
}

resource containerAppEnv 'Microsoft.App/managedEnvironments@2022-03-01' = {
  name: environmentName
  location: solutionLocation
  properties: {
    zoneRedundant: false
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource containerApp 'Microsoft.App/containerApps@2022-03-01' = {
  name: containerAppName
  location: solutionLocation
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityObjectId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: null
      activeRevisionsMode: 'Single'
    }
    template: {
      scale:{
        minReplicas: 1
        maxReplicas: 1
      }
      containers: [
        {
          name: containerAppName
          image: imageName
          resources: {
            cpu: 2
            memory: '4.0Gi'
          }
          command: [
            '/bin/sh', '-c', 'mkdir -p /scripts && apk add --no-cache curl bash jq py3-pip gcc musl-dev libffi-dev openssl-dev python3-dev && pip install --upgrade azure-cli && apk add --no-cache --virtual .build-deps build-base unixodbc-dev && curl -s -o msodbcsql18_18.4.1.1-1_amd64.apk https://download.microsoft.com/download/7/6/d/76de322a-d860-4894-9945-f0cc5d6a45f8/msodbcsql18_18.4.1.1-1_amd64.apk && curl -s -o mssql-tools18_18.4.1.1-1_amd64.apk https://download.microsoft.com/download/7/6/d/76de322a-d860-4894-9945-f0cc5d6a45f8/mssql-tools18_18.4.1.1-1_amd64.apk && apk add --allow-untrusted msodbcsql18_18.4.1.1-1_amd64.apk && apk add --allow-untrusted mssql-tools18_18.4.1.1-1_amd64.apk && curl -s -o /scripts/copy_kb_files.sh ${setupCopyKbFiles} && chmod +x /scripts/copy_kb_files.sh && sh -x /scripts/copy_kb_files.sh ${storageAccountName} ${containerName} ${baseUrl} ${managedIdentityClientId} && curl -s -o /scripts/run_create_index_scripts.sh ${setupCreateIndexScriptsUrl} && chmod +x /scripts/run_create_index_scripts.sh && sh -x /scripts/run_create_index_scripts.sh ${baseUrl} ${keyVaultName} ${managedIdentityClientId} && apk add --no-cache ca-certificates less ncurses-terminfo-base krb5-libs libgcc libintl libssl3 libstdc++ tzdata userspace-rcu zlib icu-libs curl && apk -X https://dl-cdn.alpinelinux.org/alpine/edge/main add --no-cache lttng-ust openssh-client && curl -L https://github.com/PowerShell/PowerShell/releases/download/v7.5.0/powershell-7.5.0-linux-musl-x64.tar.gz -o /tmp/powershell.tar.gz && mkdir -p /opt/microsoft/powershell/7 && tar zxf /tmp/powershell.tar.gz -C /opt/microsoft/powershell/7 && chmod +x /opt/microsoft/powershell/7/pwsh && ln -s /opt/microsoft/powershell/7/pwsh /usr/bin/pwsh && curl -s -o /scripts/create-sql-user-and-role.ps1 ${createSqlUserAndRoleScriptsUrl} && chmod +x /scripts/create-sql-user-and-role.ps1 && pwsh -File /scripts/create-sql-user-and-role.ps1 -SqlServerName ${sqlServerName} -SqlDatabaseName ${sqlDbName} -ClientId ${sqlUsers[0].principalId} -DisplayName ${sqlUsers[0].principalName} -ManagedIdentityClientId ${managedIdentityClientId} -DatabaseRole ${sqlUsers[0].databaseRoles[0]} && pwsh -File /scripts/create-sql-user-and-role.ps1 -SqlServerName ${sqlServerName} -SqlDatabaseName ${sqlDbName} -ClientId ${sqlUsers[1].principalId} -DisplayName ${sqlUsers[1].principalName} -ManagedIdentityClientId ${managedIdentityClientId} -DatabaseRole ${sqlUsers[1].databaseRoles[0]} && pwsh -File /scripts/create-sql-user-and-role.ps1 -SqlServerName ${sqlServerName} -SqlDatabaseName ${sqlDbName} -ClientId ${sqlUsers[2].principalId} -DisplayName ${sqlUsers[2].principalName} -ManagedIdentityClientId ${managedIdentityClientId} -DatabaseRole ${sqlUsers[2].databaseRoles[0]} && pwsh -File /scripts/create-sql-user-and-role.ps1 -SqlServerName ${sqlServerName} -SqlDatabaseName ${sqlDbName} -ClientId ${sqlUsers[2].principalId} -DisplayName ${sqlUsers[2].principalName} -ManagedIdentityClientId ${managedIdentityClientId} -DatabaseRole ${sqlUsers[2].databaseRoles[1]} && az login --identity --client-id ${managedIdentityClientId} && az containerapp update --name ${containerAppName} --resource-group ${resourceGroupName} --min-replicas 0 --cpu 0.25 --memory 0.5Gi && az containerapp revision deactivate -g ${resourceGroupName} --revision $(az containerapp revision list -n ${containerAppName} -g ${resourceGroupName} --query "[0].name" -o tsv) && echo "Container app setup completed successfully."'
          ]
          env: [
            {
              name: 'STORAGE_ACCOUNT_NAME'
              value: storageAccountName
            }
            {
              name: 'CONTAINER_NAME'
              value: containerName
            }
            {
              name:'APPSETTING_WEBSITE_SITE_NAME'
              value:'DUMMY'
            }
          ]
        }
      ]
    }
  }
}
