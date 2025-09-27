import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DynamoDBTables } from "./constructs/database/dynamodb";

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Database Layer
    const database = new DynamoDBTables(this, "Database");
  }
}
