#!/bin/bash
# Start all agents in development mode

echo "Starting all hotel booking agents..."

# Start agents in background
python -m src.agents.run_agents search &
SEARCH_PID=$!

python -m src.agents.run_agents reservation &
RESERVATION_PID=$!

python -m src.agents.run_agents advisory &
ADVISORY_PID=$!

python -m src.agents.run_agents notification &
NOTIFICATION_PID=$!

echo "All agents started:"
echo "  Search Agent (PID: $SEARCH_PID) - http://localhost:9001"
echo "  Reservation Agent (PID: $RESERVATION_PID) - http://localhost:9002"
echo "  Advisory Agent (PID: $ADVISORY_PID) - http://localhost:9003"
echo "  Notification Agent (PID: $NOTIFICATION_PID) - http://localhost:9004"

# Wait for interrupt
trap "echo 'Stopping all agents...'; kill $SEARCH_PID $RESERVATION_PID $ADVISORY_PID $NOTIFICATION_PID; exit" INT

wait
