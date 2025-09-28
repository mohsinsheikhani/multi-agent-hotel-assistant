import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { CONFIG } from "../../config";

export class IAMRoles extends Construct {
  public readonly agentcoreGatewayRole: iam.Role;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const accountId = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    this.agentcoreGatewayRole = new iam.Role(this, "AgentCoreGatewayRole", {
      roleName: `agentcore-${CONFIG.gatewayName}-role`,
      assumedBy: new iam.ServicePrincipal("bedrock-agentcore.amazonaws.com", {
        conditions: {
          StringEquals: {
            "aws:SourceAccount": accountId,
          },
          ArnLike: {
            "aws:SourceArn": `arn:aws:bedrock-agentcore:${region}:${accountId}:*`,
          },
        },
      }),
    });

    this.agentcoreGatewayRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "VisualEditor0",
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock-agentcore:*",
          "bedrock:*",
          "agent-credential-provider:*",
          "iam:PassRole",
          "secretsmanager:GetSecretValue",
          "lambda:InvokeFunction",
        ],
        resources: ["*"],
      })
    );
  }
}
