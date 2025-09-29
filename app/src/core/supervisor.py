import boto3
import logging
from datetime import datetime
from strands import Agent
from strands.models import BedrockModel
from strands_tools.a2a_client import A2AClientToolProvider

from ..config.settings import Settings
from .memory import MemoryManager, MemoryHookProvider

logger = logging.getLogger(__name__)

class SupervisorAgent:
    """Supervisor agent that orchestrates multi-agent hotel booking workflows"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.agent = self._initialize_agent()
        
    def _initialize_agent(self) -> Agent:
        """Initialize the supervisor agent with memory and tools"""
        
        # Initialize memory
        memory_manager = MemoryManager(
            region_name=self.settings.aws_region,
            memory_name=self.settings.memory_name
        )
        memory_id = memory_manager.initialize_memory()
        
        # Initialize A2A client tool provider
        provider = A2AClientToolProvider(self.settings.agent_urls)
        
        # Initialize Bedrock model
        session = boto3.Session()
        bedrock_model = BedrockModel(
            model_id="anthropic.claude-3-haiku-20240307-v1:0", 
            boto_session=session
        )
        
        # Create agent with memory hooks
        agent = Agent(
            model=bedrock_model,
            tools=provider.tools,
            system_prompt=self._get_system_prompt(),
            hooks=[MemoryHookProvider(memory_manager.client, memory_id)],
            state={
                "actor_id": self.settings.actor_id, 
                "session_id": self.settings.session_id
            },
        )
        
        return agent
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for the supervisor agent"""
        return f"""
You are the Supervisor Agent for a multi-agent hotel booking concierge system.

Your role is to:
1. Analyze the user request carefully and determine its intent.
2. Select and invoke the most appropriate specialized agent (without asking the user which one).
3. Pass all relevant context (e.g., booking_id, guest_email, filters) to the selected agent.
4. If the request requires multiple steps (e.g., lookup booking then cancel), orchestrate those steps across agents.

Available agents:
- SearchAndDiscoveryAgent: Searches for hotels based on hotel name, city, price, amenities, rating, or other filters.
- ReservationAgent: Creates, modifies, cancels, or retrieves bookings using booking_id or guest_email.
- GuestAdvisoryAgent: Retrieves hotel policies, rules, and advisory information (e.g., cancellation penalties, check-in/out times).
- NotificationAgent: Composes and sends booking confirmation, modification, or cancellation emails.

Agents are hosted at these urls:
- SearchAndDiscoveryAgent at "http://127.0.0.1:9001"
- ReservationAgent at "http://127.0.0.1:9002"
- GuestAdvisoryAgent at "http://127.0.0.1:9003"
- NotificationAgent at "http://127.0.0.1:9004"

Policy-aware behavior:
- Before performing any booking, modification, or cancellation, check relevant hotel policies (using the Guest Advisory Agent or Knowledge Base) to determine if there are penalties, restrictions, or special conditions.
- Present the user with a summary of what will happen and the relevant policy (e.g., "Cancelling within 24 hours will incur a 20% fee").
- Ask for explicit confirmation before taking action.

Guidelines:
- If the user asks about hotel availability, hotel listing, filters, or options, route to SearchAndDiscoveryAgent.
- If the user asks to book, modify, cancel, or retrieve a reservation, route to ReservationAgent, and if cancellation or policy-related action is requested, also query GuestAdvisoryAgent first to check applicable rules.
- If the user asks about hotel policies, rules, or FAQs, route to GuestAdvisoryAgent.
- After a booking is created, modified, or cancelled, trigger NotificationAgent to send an email confirmation.
- Always provide a cohesive summary if multiple agents are involved.
- Always prioritize accuracy and context-awareness. Do not guess if the users request is ambiguous; instead, ask a clarifying question before routing.
- Never answer questions yourself unless no agent is appropriate.

Today's date: {datetime.today().strftime('%Y-%m-%d')}
"""
    
    async def process_request(self, question: str):
        """Process a user request through the supervisor agent"""
        try:
            logger.info(f"Processing request: {question}")
            response = await self.agent.invoke_async(question)
            logger.info("Request processed successfully")
            return response
        except Exception as e:
            logger.error(f"Error processing request: {e}")
            raise
