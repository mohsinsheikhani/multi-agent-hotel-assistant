import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class DynamoDBTables extends Construct {
  public readonly hotelInventoryTable: dynamodb.Table;
  public readonly hotelRoomReservationTable: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.hotelInventoryTable = new dynamodb.Table(this, "HotelInventory", {
      tableName: "HotelInventory",
      partitionKey: {
        name: "hotel_id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "city",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.hotelRoomReservationTable = new dynamodb.Table(
      this,
      "HotelRoomReservation",
      {
        tableName: "HotelRoomReservation",
        partitionKey: {
          name: "booking_id",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "guest_email",
          type: dynamodb.AttributeType.STRING,
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    this.hotelRoomReservationTable.addGlobalSecondaryIndex({
      indexName: "guest_email-index",
      partitionKey: {
        name: "guest_email",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "status",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
