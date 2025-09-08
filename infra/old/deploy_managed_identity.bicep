// ========== Managed Identity ========== //
targetScope = 'resourceGroup'

@minLength(3)
@maxLength(15)
@description('Required. Name of the solution.')
param solutionName string

@description('Required. Deployment location for the solution.')
param solutionLocation string

@description('Required. Name of the managed identity.')
param miName string

@description('Optional. Tags to be applied to the resources.')
param tags object = {}

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: miName
  location: solutionLocation
  tags: {
    ...tags
    app: solutionName
    location: solutionLocation
  }
}

@description('This is the built-in owner role. See https://docs.microsoft.com/azure/role-based-access-control/built-in-roles#owner')
resource ownerRoleDefinition 'Microsoft.Authorization/roleDefinitions@2018-01-01-preview' existing = {
  scope: resourceGroup()
  name: '8e3af657-a8ff-443c-a75c-2fe8c4bcb635'
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, managedIdentity.id, ownerRoleDefinition.id)
  properties: {
    principalId: managedIdentity.properties.principalId
    roleDefinitionId:  ownerRoleDefinition.id
    principalType: 'ServicePrincipal' 
  }
}

resource managedIdentityWebApp 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${miName}-webapp'
  location: solutionLocation
  tags: {
    ...tags
    app: solutionName
    location: solutionLocation
  }
}


// @description('Array of actions for the roleDefinition')
// param actions array = [
//   'Microsoft.Synapse/workspaces/write'
//   'Microsoft.Synapse/workspaces/read'
// ]

// @description('Array of notActions for the roleDefinition')
// param notActions array = []

// @description('Friendly name of the role definition')
// param roleName string = 'Synapse Administrator-${solutionName}'

// @description('Detailed description of the role definition')
// param roleDescription string = 'Synapse Administrator-${solutionName}'

// var roleDefName = guid(resourceGroup().id, string(actions), string(notActions))

// resource synadminRoleDef 'Microsoft.Authorization/roleDefinitions@2018-07-01' = {
//   name: roleDefName
//   properties: {
//     roleName: roleName
//     description: roleDescription
//     type: 'customRole'
//     permissions: [
//       {
//         actions: actions
//         notActions: notActions
//       }
//     ]
//     assignableScopes: [
//       resourceGroup().id
//     ]
//   }
// }

// resource synAdminroleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
//   name: guid(resourceGroup().id, managedIdentity.id, synadminRoleDef.id)
//   properties: {
//     principalId: managedIdentity.properties.principalId
//     roleDefinitionId:  synadminRoleDef.id
//     principalType: 'ServicePrincipal' 
//   }
// }

@description('Details of the managed identity resource.')
output managedIdentityOutput object = {
  id: managedIdentity.id
  objectId: managedIdentity.properties.principalId
  clientId: managedIdentity.properties.clientId
  name: miName
}

@description('Details of the managed identity for the web app.')
output managedIdentityWebAppOutput object = {
  id: managedIdentityWebApp.id
  objectId: managedIdentityWebApp.properties.principalId
  clientId: managedIdentityWebApp.properties.clientId
  name: managedIdentityWebApp.name
}
