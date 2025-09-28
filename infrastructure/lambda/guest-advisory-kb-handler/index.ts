import { APIGatewayProxyResult } from "aws-lambda";
import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

interface RoomReservationInput {
  query: string;
}

const client = new BedrockAgentRuntimeClient({ region: process.env.REGION });

export const handler = async (
  event: RoomReservationInput
): Promise<APIGatewayProxyResult> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    if (!event || !event.query) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "query is required",
        }),
      };
    }

    const command = new RetrieveAndGenerateCommand({
      input: {
        text: event.query,
      },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID!,
          modelArn: process.env.MODEL_ARN!,
        },
      },
    });

    const response = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        answer: response.output?.text,
        citations: response.citations,
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
