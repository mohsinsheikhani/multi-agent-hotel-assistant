import os
import logging
from abc import ABC, abstractmethod
from strands import Agent
from strands.models.litellm import LiteLLMModel
from strands.multiagent.a2a import A2AServer
from ..utils.mcp_client import create_mcp_client

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Base class for all specialized agents"""

    def __init__(self, port: str):
        self.port = port
        self.agent = self._create_agent()

    def _create_agent(self) -> Agent:
        """Create the agent with MCP tools"""
        try:
            mcp_client = create_mcp_client()

            with mcp_client:
                mcp_tools = mcp_client.list_tools_sync()

                model = LiteLLMModel(
                    client_args={"api_key": os.getenv("GOOGLE_API_KEY")},
                    model_id="gemini/gemini-2.5-flash",
                )

                agent = Agent(
                    model,
                    name=self.get_agent_name(),
                    description=self.get_agent_description(),
                    system_prompt=self.get_system_prompt(),
                    tools=mcp_tools,
                )

                return agent
        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            raise

    @abstractmethod
    def get_agent_name(self) -> str:
        """Get the agent name"""
        pass

    @abstractmethod
    def get_agent_description(self) -> str:
        """Get the agent description"""
        pass

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Get the system prompt for the agent"""
        pass

    def serve(self, host: str = "0.0.0.0"):
        """Start the A2A server for this agent"""
        try:
            mcp_client = create_mcp_client()

            with mcp_client:
                mcp_tools = mcp_client.list_tools_sync()

                # Update agent tools
                self.agent.tools = mcp_tools

                # Create and serve A2A server within MCP context
                a2a_server = A2AServer(self.agent, port=self.port)
                logger.info(f"Starting {self.get_agent_name()} on {host}:{self.port}")
                a2a_server.serve(host=host, port=int(self.port))
        except KeyboardInterrupt:
            logger.info(f"{self.get_agent_name()} shutting down...")
        except Exception as e:
            logger.error(f"{self.get_agent_name()} error: {e}")
            raise
