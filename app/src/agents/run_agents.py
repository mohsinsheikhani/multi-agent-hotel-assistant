#!/usr/bin/env python3
"""
Script to run individual agents for development and testing
"""
import sys
import argparse
from dotenv import load_dotenv

from .search_discovery import SearchDiscoveryAgent
from .reservation import ReservationAgent
from .guest_advisory import GuestAdvisoryAgent
from .notification import NotificationAgent

load_dotenv(override=True)

AGENTS = {
    "search": SearchDiscoveryAgent,
    "reservation": ReservationAgent,
    "advisory": GuestAdvisoryAgent,
    "notification": NotificationAgent,
}

def main():
    parser = argparse.ArgumentParser(description="Run individual hotel booking agents")
    parser.add_argument(
        "agent", 
        choices=AGENTS.keys(),
        help="Agent to run"
    )
    parser.add_argument(
        "--host", 
        default="0.0.0.0",
        help="Host to bind to (default: 0.0.0.0)"
    )
    
    args = parser.parse_args()
    
    agent_class = AGENTS[args.agent]
    agent = agent_class()
    
    print(f"Starting {agent.get_agent_name()}...")
    agent.serve(host=args.host)

if __name__ == "__main__":
    main()
