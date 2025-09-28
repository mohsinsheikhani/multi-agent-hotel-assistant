import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DynamoDBTables } from "./constructs/database/dynamodb";
import { LambdaFunctions } from "./constructs/compute/lambda-functions";
import { StackOutputs } from "./constructs/outputs/stack-outputs";
import { IAMRoles } from "./constructs/security/iam-roles";
import { CognitoAuth } from "./constructs/auth/cognito";
import { KnowledgeBaseInfrastructure } from "./constructs/ai/knowledge-base";
import { AgentInfrastructure } from "./constructs/ai/agent";

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Database Layer
    const database = new DynamoDBTables(this, "Database");

    // Compute Layer
    const lambdaFunctions = new LambdaFunctions(this, "LambdaFunctions", {
      hotelInventoryTable: database.hotelInventoryTable,
      hotelRoomReservationTable: database.hotelRoomReservationTable,
    });

    // Security Layer
    const iamRoles = new IAMRoles(this, "IAMRoles");

    // Authentication Layer
    const cognitoAuth = new CognitoAuth(this, "CognitoAuth");

    // Uncomment to enable Knowledge Base infrastructure
    const knowledgeBase = new KnowledgeBaseInfrastructure(
      this,
      "KnowledgeBase"
    );

    // Uncomment to enable Agent infrastructure
    const agent = new AgentInfrastructure(this, "Agent");

    // Stack Outputs
    new StackOutputs(this, "StackOutputs", {
      cognitoAuth,
      agentcoreGatewayRole: iamRoles.agentcoreGatewayRole,
      searchHotelLambda: lambdaFunctions.searchHotelLambda,
      roomReservationLambda: lambdaFunctions.roomReservationLambda,
      queryReservationsLambda: lambdaFunctions.queryReservationsLambda,
      guestAdvisoryKbLambda: lambdaFunctions.guestAdvisoryKbLambda,
      modifyReservationLambda: lambdaFunctions.modifyReservationLambda,
      knowledgeBase,
      knowledgeBaseRef: knowledgeBase.knowledgeBase.ref,
    });
  }
}
