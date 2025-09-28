import { APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});
const tableName = process.env.ROOM_RESERVATION_TABLE;

interface ReservationModificationInput {
  booking_id: string;
  guest_email: string;
  check_in_date?: string;
  nights?: number;
  rooms_booked?: number;
  price_per_night?: number;
  total_price?: number;
  status?: string;
}

export const handler = async (
  event: ReservationModificationInput
): Promise<APIGatewayProxyResult> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    if (!tableName) {
      throw new Error("ROOM_RESERVATION_TABLE environment variable is not set");
    }

    if (!event) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing request body" }),
      };
    }

    const input: ReservationModificationInput = event;

    if (!input.booking_id || !input.guest_email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "booking_id & guest_email is required" }),
      };
    }

    // Validate check_in_date if provided
    if (input.check_in_date) {
      const checkIn = new Date(input.check_in_date);
      if (isNaN(checkIn.getTime())) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid check_in_date" }),
        };
      }

      const today = new Date();
      const minCheckIn = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      if (checkIn < minCheckIn) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "check_in_date must be at least 24 hours from now",
          }),
        };
      }
    }

    if (input.nights !== undefined && input.nights <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "nights must be > 0" }),
      };
    }

    // Build update expression
    const updateExpressions = [];
    const expressionAttributeValues: any = {};
    const expressionAttributeNames: any = {};

    if (input.check_in_date) {
      updateExpressions.push("#check_in_date = :check_in_date");
      expressionAttributeNames["#check_in_date"] = "check_in_date";
      expressionAttributeValues[":check_in_date"] = { S: input.check_in_date };
    }

    if (input.nights !== undefined) {
      updateExpressions.push("nights = :nights");
      expressionAttributeValues[":nights"] = { N: input.nights.toString() };
    }

    if (input.rooms_booked !== undefined) {
      updateExpressions.push("rooms_booked = :rooms_booked");
      expressionAttributeValues[":rooms_booked"] = {
        N: input.rooms_booked.toString(),
      };
    }

    if (input.price_per_night !== undefined) {
      updateExpressions.push("price_per_night = :price_per_night");
      expressionAttributeValues[":price_per_night"] = {
        N: input.price_per_night.toString(),
      };
    }

    if (input.total_price !== undefined) {
      updateExpressions.push("total_price = :total_price");
      expressionAttributeValues[":total_price"] = {
        N: input.total_price.toString(),
      };
    }

    if (input.status) {
      updateExpressions.push("#status = :status");
      expressionAttributeNames["#status"] = "status";
      expressionAttributeValues[":status"] = { S: input.status };
    }

    updateExpressions.push("updated_at = :updated_at");
    expressionAttributeValues[":updated_at"] = { S: new Date().toISOString() };

    if (updateExpressions.length === 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No fields to update" }),
      };
    }

    await dynamo.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          booking_id: { S: input.booking_id },
          guest_email: { S: input.guest_email },
        },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ...(Object.keys(expressionAttributeNames).length > 0 && {
          ExpressionAttributeNames: expressionAttributeNames,
        }),
        ConditionExpression:
          "attribute_exists(booking_id) AND attribute_exists(guest_email)",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Reservation modified successfully",
        booking_id: input.booking_id,
      }),
    };
  } catch (error) {
    console.error("Error modifying reservation:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to modify reservation",
        details: (error as Error).message,
      }),
    };
  }
};
