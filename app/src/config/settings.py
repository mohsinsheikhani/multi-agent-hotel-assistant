import os
from pydantic import BaseModel
from typing import List

class Settings(BaseModel):
    """Application configuration settings"""
    
    # AWS Configuration
    aws_region: str = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
    
    # Bedrock AgentCore Configuration
    user_pool_client_id: str = os.getenv("USER_POOL_CLIENT_ID", "")
    user_pool_client_secret: str = os.getenv("USER_POOL_CLIENT_SECRET", "")
    user_pool_id: str = os.getenv("USER_POOL_ID", "")
    resource_server_id: str = os.getenv("AGENTCORE_RESOURCE_SERVER_ID", "")
    cognito_domain_url: str = os.getenv("COGNITO_DOMAIN_URL", "")
    gateway_url: str = os.getenv("AGENTCORE_GATEWAY_URL", "")
    
    # Model Configuration
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    
    # Agent Configuration
    actor_id: str = os.getenv("ACTOR_ID", "user_123")
    session_id: str = os.getenv("SESSION_ID", "personal_session_001")
    memory_name: str = "HotelBookingAgentMemory"
    
    # Agent URLs
    agent_urls: List[str] = [
        "http://127.0.0.1:9001",  # Search Agent
        "http://127.0.0.1:9002",  # Reservation Agent
        "http://127.0.0.1:9003",  # Guest Advisory Agent
        "http://127.0.0.1:9004",  # Notification Agent
    ]
    
    class Config:
        env_file = ".env"
