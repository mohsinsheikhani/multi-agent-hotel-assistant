import os
from mcp.client.streamable_http import streamablehttp_client
from strands.tools.mcp.mcp_client import MCPClient
from .auth import TokenManager

def create_mcp_client() -> MCPClient:
    """Create an MCP client with authentication"""
    gateway_url = os.getenv("AGENTCORE_GATEWAY_URL")
    token_manager = TokenManager()
    token = token_manager.get_fresh_token()
    
    def create_mcp_transport():
        return streamablehttp_client(
            gateway_url, 
            headers={"Authorization": f"Bearer {token}"}
        )
    
    return MCPClient(create_mcp_transport)
