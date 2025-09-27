import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

import { createLambda } from "../common/compute/lambda-factory";
import { CONFIG } from "../../config";

export interface LambdaFunctionsProps {
  hotelInventoryTable: dynamodb.Table;
  hotelRoomReservationTable: dynamodb.Table;
}

export class LambdaFunctions extends Construct {
  public readonly searchHotelLambda: lambda.Function;
  public readonly roomReservationLambda: lambda.Function;
  public readonly queryReservationsLambda: lambda.Function;
  public readonly guestAdvisoryKbLambda: lambda.Function;
  public readonly modifyReservationLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionsProps) {
    super(scope, id);

    const { hotelInventoryTable, hotelRoomReservationTable } = props;

    this.searchHotelLambda = createLambda(this, {
      id: "SearchHotelLambda",
      functionName: "SearchHotelLambda",
      description: "Process search query and hotel data",
      entryFile: "./lambda/search-hotel/index.ts",
      environment: {
        REGION: cdk.Stack.of(this).region,
        HOTEL_INVENTORY_TABLE: hotelInventoryTable.tableName,
      },
    });

    this.roomReservationLambda = createLambda(this, {
      id: "RoomReservationLambda",
      functionName: "RoomReservationLambda",
      description:
        "Handles hotel room reservations requests and stores reservations in DynamoDB",
      entryFile: "./lambda/room-reservation/index.ts",
      environment: {
        REGION: cdk.Stack.of(this).region,
        ROOM_RESERVATION_TABLE: hotelRoomReservationTable.tableName,
      },
    });

    this.queryReservationsLambda = createLambda(this, {
      id: "QueryReservations",
      functionName: "QueryReservations",
      description:
        "Retrieves a guest prior reservations from DynamoDB based on their email address",
      entryFile: "./lambda/query-reservations/index.ts",
      environment: {
        REGION: cdk.Stack.of(this).region,
        ROOM_RESERVATION_TABLE: hotelRoomReservationTable.tableName,
      },
    });

    this.guestAdvisoryKbLambda = createLambda(this, {
      id: "GuestAdvisoryKb",
      functionName: "GuestAdvisoryKb",
      description: "Query Bedrock Knowledge Base and return results",
      entryFile: "./lambda/guest-advisory-kb-handler/index.ts",
      environment: {
        REGION: cdk.Stack.of(this).region,
        KNOWLEDGE_BASE_ID: CONFIG.knowledgeBase.id,
        MODEL_ARN: CONFIG.knowledgeBase.modelArn,
      },
    });

    this.modifyReservationLambda = createLambda(this, {
      id: "ModifyReservation",
      functionName: "ModifyReservation",
      description: "Modify or cancel hotel room reservations",
      entryFile: "./lambda/modify-reservation/index.ts",
      environment: {
        REGION: cdk.Stack.of(this).region,
        ROOM_RESERVATION_TABLE: hotelRoomReservationTable.tableName,
      },
    });

    this.setupPermissions(hotelInventoryTable, hotelRoomReservationTable);
  }

  private setupPermissions(
    hotelInventoryTable: dynamodb.Table,
    hotelRoomReservationTable: dynamodb.Table
  ) {
    hotelInventoryTable.grantReadData(this.searchHotelLambda);
    hotelRoomReservationTable.grantReadWriteData(this.roomReservationLambda);
    hotelRoomReservationTable.grantReadData(this.queryReservationsLambda);

    this.guestAdvisoryKbLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:RetrieveAndGenerate",
          "bedrock:Retrieve",
          "bedrock:InvokeModel",
        ],
        resources: ["*"],
      })
    );

    this.modifyReservationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:UpdateItem"],
        resources: [hotelRoomReservationTable.tableArn],
      })
    );
  }
}
