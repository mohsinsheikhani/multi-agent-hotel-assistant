import os
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class TokenManager:
    """Manages Cognito authentication tokens for AgentCore gateway access"""
    
    def __init__(self):
        self.client_id = os.getenv("USER_POOL_CLIENT_ID")
        self.client_secret = os.getenv("USER_POOL_CLIENT_SECRET")
        self.user_pool_id = os.getenv("USER_POOL_ID")
        self.resource_server_id = os.getenv("AGENTCORE_RESOURCE_SERVER_ID")
        self.cognito_domain_url = os.getenv("COGNITO_DOMAIN_URL")
        self.scope_string = f"{self.resource_server_id}/gateway:read {self.resource_server_id}/gateway:write"

    def get_fresh_token(self) -> Optional[str]:
        """Get a fresh access token from Cognito"""
        try:
            url = f"{self.cognito_domain_url}/oauth2/token"

            response = requests.post(
                url,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": self.scope_string,
                },
            )
            response.raise_for_status()
            token = response.json()["access_token"]
            logger.info("Successfully obtained fresh token")
            return token
        except requests.exceptions.RequestException as err:
            logger.error(f"Failed to get token: {str(err)}")
            return None
