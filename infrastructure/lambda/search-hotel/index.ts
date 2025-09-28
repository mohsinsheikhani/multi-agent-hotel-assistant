import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  DynamoDBClient,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDBClient({});

interface Hotel {
  city: string;
  hotel_id: string;
  name: string;
  address: string;
  rating: number;
  price_per_night: number;
  amenities: string[];
  distance_from_center_km: number;
  available_rooms: number;
  images: string[];
  description: string;
}

const tableName = process.env.HOTEL_INVENTORY_TABLE;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    // STEP 1: Parse input filters
    const queryParams = event.queryStringParameters || {};
    const maxPrice = queryParams.maxPrice
      ? parseFloat(queryParams.maxPrice)
      : undefined;
    const minRating = queryParams.minRating
      ? parseFloat(queryParams.minRating)
      : undefined;
    const city = queryParams.city;
    const sortBy = queryParams.sortBy; // rating, price, distance
    const sortOrder = queryParams.sortOrder || "desc"; // desc (highest first) or asc
    const requiredAmenities = queryParams.amenities
      ? queryParams.amenities.split(",").map((a) => a.trim())
      : [];

    // STEP 2: Fetch hotels - use Query if city provided, otherwise Scan
    let hotels: Hotel[] = [];

    if (city) {
      // Use Query with city as partition key for efficient lookup
      const queryResp = await dynamo.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "city = :city",
          ExpressionAttributeValues: {
            ":city": { S: city },
          },
        })
      );
      hotels =
        queryResp.Items?.map((item: any) => unmarshall(item) as Hotel) || [];
    } else {
      // Fallback to Scan when no city specified
      const scanResp = await dynamo.send(
        new ScanCommand({
          TableName: tableName,
        })
      );
      hotels =
        scanResp.Items?.map((item: any) => unmarshall(item) as Hotel) || [];
    }

    // STEP 3: Filter (city already filtered if provided)
    let filtered = hotels.filter((hotel) => {
      if (maxPrice && hotel.price_per_night > maxPrice) return false;
      if (minRating && hotel.rating < minRating) return false;
      if (
        requiredAmenities.length > 0 &&
        !requiredAmenities.every((a) =>
          hotel.amenities.map((x) => x.toLowerCase()).includes(a.toLowerCase())
        )
      ) {
        return false;
      }
      return true;
    });

    // STEP 4: Ranking logic
    if (sortBy === "rating") {
      filtered.sort((a, b) =>
        sortOrder === "asc" ? a.rating - b.rating : b.rating - a.rating
      );
    } else if (sortBy === "price") {
      filtered.sort((a, b) =>
        sortOrder === "asc"
          ? a.price_per_night - b.price_per_night
          : b.price_per_night - a.price_per_night
      );
    } else if (sortBy === "distance") {
      filtered.sort((a, b) =>
        sortOrder === "asc"
          ? a.distance_from_center_km - b.distance_from_center_km
          : b.distance_from_center_km - a.distance_from_center_km
      );
    } else {
      // Default weighted scoring
      filtered.sort((a, b) => {
        const aScore =
          normalize(5 - a.price_per_night, filtered, "price_per_night") * 0.4 +
          normalize(a.rating, filtered, "rating") * 0.4 +
          normalize(
            -a.distance_from_center_km,
            filtered,
            "distance_from_center_km"
          ) *
            0.2;

        const bScore =
          normalize(5 - b.price_per_night, filtered, "price_per_night") * 0.4 +
          normalize(b.rating, filtered, "rating") * 0.4 +
          normalize(
            -b.distance_from_center_km,
            filtered,
            "distance_from_center_km"
          ) *
            0.2;

        return bScore - aScore;
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ results: filtered }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

/**
 * Utility to normalize values for ranking.
 * If all values are same, returns 0.5 to avoid NaN.
 */
function normalize(value: number, hotels: Hotel[], key: keyof Hotel): number {
  const numbers = hotels.map((h) => h[key] as number);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  if (min === max) return 0.5;
  return (value - min) / (max - min);
}
