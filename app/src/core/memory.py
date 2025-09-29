import logging
from bedrock_agentcore.memory import MemoryClient
from strands.hooks import (
    AgentInitializedEvent,
    HookProvider,
    HookRegistry,
    MessageAddedEvent,
)

logger = logging.getLogger(__name__)


class MemoryManager:
    """Manages Bedrock AgentCore memory operations"""

    def __init__(self, region_name: str, memory_name: str):
        self.client = MemoryClient(region_name=region_name)
        self.memory_name = memory_name
        self.memory_id = None

    def initialize_memory(self) -> str:
        """Initialize or retrieve existing memory"""
        try:
            # Create memory resource without strategies (short-term memory only)
            memory = self.client.create_memory_and_wait(
                name=self.memory_name,
                strategies=[],  # No strategies for short-term memory
                description="Short-term memory for hotel booking agent",
                event_expiry_days=7,
            )
            self.memory_id = memory["id"]
            logger.info(f"Created memory: {self.memory_id}")
            return self.memory_id
        except Exception as e:
            if "already exists" in str(e):
                # If memory already exists, retrieve its ID
                memories = self.client.list_memories()
                self.memory_id = next(
                    (m["id"] for m in memories if m["id"].startswith(self.memory_name)),
                    None,
                )
                logger.info(
                    f"Memory already exists. Using existing memory ID: {self.memory_id}"
                )
                return self.memory_id
            else:
                logger.error(f"Memory initialization error: {e}")
                raise


class MemoryHookProvider(HookProvider):
    """Provides memory hooks for agent lifecycle events"""

    def __init__(self, memory_client: MemoryClient, memory_id: str):
        self.memory_client = memory_client
        self.memory_id = memory_id

    def on_agent_initialized(self, event: AgentInitializedEvent):
        """Load recent conversation history when agent starts"""
        try:
            actor_id = event.agent.state.get("actor_id")
            session_id = event.agent.state.get("session_id")

            if not actor_id or not session_id:
                logger.warning("Missing actor_id or session_id in agent state")
                return

            # Load the last 10 conversation turns from memory
            recent_turns = self.memory_client.get_last_k_turns(
                memory_id=self.memory_id, actor_id=actor_id, session_id=session_id, k=10
            )

            if recent_turns:
                # Format conversation history for context
                context_messages = []
                for turn in recent_turns:
                    for message in turn:
                        role = message["role"]
                        content = message["content"]["text"]
                        context_messages.append(f"{role}: {content}")

                context = "\n".join(context_messages)
                # Add context to agent's system prompt
                event.agent.system_prompt += f"\n\nRecent conversation:\n{context}"
                logger.info(f"Loaded {len(recent_turns)} conversation turns")

        except Exception as e:
            logger.error(f"Memory load error: {e}")

    def on_message_added(self, event: MessageAddedEvent):
        """Store messages in memory"""
        try:
            messages = event.agent.messages
            actor_id = event.agent.state.get("actor_id")
            session_id = event.agent.state.get("session_id")

            if messages and messages[-1]["content"][0].get("text"):
                self.memory_client.create_event(
                    memory_id=self.memory_id,
                    actor_id=actor_id,
                    session_id=session_id,
                    messages=[
                        (messages[-1]["content"][0]["text"], messages[-1]["role"])
                    ],
                )
        except Exception as e:
            logger.error(f"Memory save error: {e}")

    def register_hooks(self, registry: HookRegistry):
        """Register memory hooks"""
        registry.add_callback(MessageAddedEvent, self.on_message_added)
        registry.add_callback(AgentInitializedEvent, self.on_agent_initialized)
