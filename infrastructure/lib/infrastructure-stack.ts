import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DynamoDBTables } from "./constructs/database/dynamodb";
import { LambdaFunctions } from "./constructs/compute/lambda-functions";

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
  }
}
