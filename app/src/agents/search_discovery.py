from .base import BaseAgent

# The agent uses MCP tools to access real hotel inventory
# def search_hotels(location, dates, preferences):
# Leverages AgentCore Gateway for secure API access
# Returns structured data with pricing, availability, amenities


class SearchDiscoveryAgent(BaseAgent):
    """Agent responsible for hotel search and discovery operations"""

    def __init__(self):
        super().__init__(port="9001")

    def get_agent_name(self) -> str:
        return "SearchDiscoveryAgent"

    def get_agent_description(self) -> str:
        return "Handles hotel search, availability checking, and price comparisons using AgentCore Lambda tools"

    def get_system_prompt(self) -> str:
        return """
You are the Search & Discovery Agent for hotel booking. Your role is to:
1. Process hotel search requests with location, dates, and preferences
2. Return structured hotel availability data with pricing
3. Generate cost breakdowns and comparisons
4. Filter results based on user criteria (price, rating, amenities)

Use the available MCP tools to search for hotels and return structured data.
Always provide comprehensive search results with relevant details like:
- Hotel name and location
- Available room types
- Pricing information
- Amenities and ratings
- Availability for requested dates

Be helpful and thorough in your responses while maintaining accuracy.
"""


if __name__ == "__main__":
    agent = SearchDiscoveryAgent()
    agent.serve()
