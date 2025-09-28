import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDBClient({});
const tableName = process.env.ROOM_RESERVATION_TABLE!;

interface RoomReservationInput {
  guest_email: string;
  status?: string;
}

export const handler = async (
  event: RoomReservationInput
): Promise<APIGatewayProxyResult> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    if (!event || !event.guest_email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "guest_email is required",
        }),
      };
    }

    const guestEmail = event.guest_email;
    const status = event.status; // optional

    // Construct KeyConditionExpression
    let filterExpression;
    let expressionAttributeValues: Record<string, any> = {
      ":guestEmail": { S: guestEmail },
    };

    if (status) {
      filterExpression = "#status = :status";
      expressionAttributeValues[":status"] = { S: status };
    }

    const queryParams = {
      TableName: tableName,
      IndexName: "guest_email-index",
      KeyConditionExpression: "guest_email = :guestEmail",
      FilterExpression: filterExpression,
      ExpressionAttributeNames: filterExpression
        ? { "#status": "status" }
        : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false, // return latest first
    };

    console.log("Query params:", JSON.stringify(queryParams, null, 2));

    const result = await dynamo.send(new QueryCommand(queryParams));
    const reservations = (result.Items ?? []).map((item) => unmarshall(item));

    return {
      statusCode: 200,
      body: JSON.stringify({
        count: reservations.length,
        reservations,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error",
      }),
    };
  }
};
