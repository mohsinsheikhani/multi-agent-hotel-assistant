import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

const dynamo = new DynamoDBClient({});
const tableName = process.env.ROOM_RESERVATION_TABLE;

interface RoomReservationInput {
  guest_email: string;
  hotel_id: string;
  city: string;
  hotel_name: string;
  check_in_date: string; // ISO date string
  nights: number; // Provided by user
  rooms_booked: number;
  price_per_night: number;
}

export const handler = async (
  event: RoomReservationInput
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

    const input: RoomReservationInput = event;

    // --- Validation ---
    if (
      !input.guest_email ||
      !input.hotel_id ||
      !input.check_in_date ||
      !input.nights
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const checkIn = new Date(input.check_in_date);
    if (isNaN(checkIn.getTime())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid check_in_date" }),
      };
    }

    if (input.nights <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "nights must be > 0" }),
      };
    }

    // --- Calculate check-out date ---
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + input.nights);

    const bookingId = uuidv4();
    const totalPrice =
      input.nights * input.rooms_booked * input.price_per_night;
    const timestamp = new Date().toISOString();

    const reservationItem = {
      booking_id: { S: bookingId },
      guest_email: { S: input.guest_email },
      hotel_id: { S: input.hotel_id },
      city: { S: input.city },
      hotel_name: { S: input.hotel_name },
      check_in_date: { S: input.check_in_date },
      check_out_date: { S: checkOut.toISOString().split("T")[0] },
      nights: { N: input.nights.toString() },
      rooms_booked: { N: input.rooms_booked.toString() },
      price_per_night: { N: input.price_per_night.toString() },
      total_price: { N: totalPrice.toFixed(2) },
      status: { S: "CONFIRMED" },
      created_at: { S: timestamp },
      updated_at: { S: timestamp },
    };

    await dynamo.send(
      new PutItemCommand({
        TableName: tableName,
        Item: reservationItem,
        ConditionExpression: "attribute_not_exists(booking_id)",
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Reservation created successfully",
        booking_id: bookingId,
        check_in_date: input.check_in_date,
        check_out_date: checkOut.toISOString().split("T")[0],
        total_price: totalPrice,
      }),
    };
  } catch (error) {
    console.error("Error creating reservation:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to create reservation",
        details: (error as Error).message,
      }),
    };
  }
};
