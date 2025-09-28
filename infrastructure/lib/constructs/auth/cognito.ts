import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { CONFIG, SCOPES } from "../../config";

export class CognitoAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly resourceServer: cognito.UserPoolResourceServer;
  public readonly m2mClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: CONFIG.userPool.name,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.resourceServer = this.userPool.addResourceServer(
      "AgentcoreResourceServer",
      {
        identifier: CONFIG.userPool.resourceServerId,
        userPoolResourceServerName: CONFIG.userPool.resourceServerName,
        scopes: SCOPES,
      }
    );

    this.m2mClient = this.userPool.addClient("M2MClient", {
      userPoolClientName: CONFIG.userPool.clientName,
      generateSecret: true,
      oAuth: {
        flows: {
          clientCredentials: true,
        },
        scopes: [
          cognito.OAuthScope.resourceServer(this.resourceServer, {
            scopeName: "gateway:read",
            scopeDescription: "Read access",
          }),
          cognito.OAuthScope.resourceServer(this.resourceServer, {
            scopeName: "gateway:write",
            scopeDescription: "Write access",
          }),
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      authFlows: {
        userPassword: true,
      },
    });

    const domainPrefix = CONFIG.userPool.name.toLowerCase().replace(
      /[^a-z0-9-]/g,
      "-"
    );

    this.userPoolDomain = this.userPool.addDomain("UserPoolDomain", {
      cognitoDomain: {
        domainPrefix: domainPrefix,
      },
    });
  }
}
