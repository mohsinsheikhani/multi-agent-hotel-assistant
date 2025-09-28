export const CONFIG = {
  // Bedrock Configuration
  knowledgeBase: {
    id: "",
    modelArn: "anthropic.claude-3-haiku-20240307-v1:0",
  },

  // Cognito Configuration
  userPool: {
    name: "agentcore-hotel-gateway-pool",
    resourceServerId: "agentcore-hotel-gateway-id",
    resourceServerName: "agentcore-hotel-gateway-name",
    clientName: "agentcore-hotel-gateway-client",
  },

  // Gateway Configuration
  gatewayName: "hotel-gateway",

  // OpenSearch Configuration
  collectionName: "cdk-collection",
  indexName: "cdk-index",
  iamUserArn: "arn:aws:iam::886708163575:role/iamrole",
  accountId: "886708163575",
} as const;

export const SCOPES = [
  { scopeName: "gateway:read", scopeDescription: "Read access" },
  { scopeName: "gateway:write", scopeDescription: "Write access" },
] as const;
