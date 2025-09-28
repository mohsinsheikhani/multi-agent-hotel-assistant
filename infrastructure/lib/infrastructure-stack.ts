import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DynamoDBTables } from "./constructs/database/dynamodb";
import { LambdaFunctions } from "./constructs/compute/lambda-functions";
import { StackOutputs } from "./constructs/outputs/stack-outputs";
import { IAMRoles } from "./constructs/security/iam-roles";

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

    // Stack Outputs
    new StackOutputs(this, "StackOutputs", {
      searchHotelLambda: lambdaFunctions.searchHotelLambda,
      roomReservationLambda: lambdaFunctions.roomReservationLambda,
      queryReservationsLambda: lambdaFunctions.queryReservationsLambda,
      guestAdvisoryKbLambda: lambdaFunctions.guestAdvisoryKbLambda,
      modifyReservationLambda: lambdaFunctions.modifyReservationLambda,
    });
  }
}
