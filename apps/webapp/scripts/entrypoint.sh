#!/usr/bin/env sh

# Copy .env file to the working directory if it is mounted to the secrets folder
if [ -f /secrets/.env ]; then
  cp /secrets/.env ./apps/webapp/.env
fi

# Start the server
exec node apps/webapp/server.js