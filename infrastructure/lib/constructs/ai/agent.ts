import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class AgentInfrastructure extends Construct {
  public readonly agentRole: iam.CfnRole;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.agentRole = new iam.CfnRole(this, "AgentRole", {
      roleName: "AmazonBedrockExecutionRoleForAgents_cdk",
      assumeRolePolicyDocument: {
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "bedrock.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      },
      managedPolicyArns: ["arn:aws:iam::aws:policy/AmazonBedrockFullAccess"],
    });
  }
}
