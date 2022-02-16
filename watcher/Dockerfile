# Dockerfile for SimulationQueue API

# Start from Node 16
FROM node:16-alpine

WORKDIR /app

# Copy application code over
COPY ./watcher .

# Copy shared code over
COPY ./shared .

# Install dependencies
RUN npm install

# CMD [ "npm", "start" ]
CMD [ "npm", "start" ]