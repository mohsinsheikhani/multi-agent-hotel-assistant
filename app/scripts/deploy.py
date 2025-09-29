#!/usr/bin/env python3
"""
Deployment script for Bedrock AgentCore
"""
import subprocess
import sys
import os
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"{description}...")
    try:
        result = subprocess.run(
            cmd, shell=True, check=True, capture_output=True, text=True
        )
        print(f"{description} completed")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"{description} failed: {e.stderr}")
        sys.exit(1)


def main():
    """Main deployment function"""
    # Ensure we're in the project directory
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    print("Starting Bedrock AgentCore deployment...")

    # Check if .env exists
    if not Path(".env").exists():
        print(".env file not found. Please copy .env.example to .env and configure it.")
        sys.exit(1)

    # Install dependencies
    run_command("uv sync", "Installing dependencies")

    # Deploy to AgentCore
    run_command("bedrock-agentcore deploy", "Deploying to Bedrock AgentCore")

    print("Deployment completed successfully!")
    print("\nNext steps:")
    print("1. Check the AgentCore console for deployment status")
    print("2. Test the deployed agent endpoints")
    print("3. Monitor logs for any issues")


if __name__ == "__main__":
    main()
