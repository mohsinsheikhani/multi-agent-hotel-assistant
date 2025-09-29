import os
import logging
from datetime import datetime
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from dotenv import load_dotenv

from .core.supervisor import SupervisorAgent
from .config.settings import Settings

load_dotenv(override=True)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hotel-booking-system")

app = BedrockAgentCoreApp()
settings = Settings()

# Initialize supervisor agent
supervisor = SupervisorAgent(settings)


@app.entrypoint
async def send_message(request):
    """Main entry point for the hotel booking system"""
    try:
        question = request.get("question")
        if not question:
            return {"error": "No question provided"}

        response = await supervisor.process_request(question)
        return response.message["content"]
    except Exception as e:
        logger.error(f"Failed to process request: {str(e)}")
        return {"error": f"Failed to process request: {str(e)}"}


if __name__ == "__main__":
    app.run()
