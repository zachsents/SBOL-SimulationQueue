# Dockerfile for SimulationQueue API

# Start from Node 16
FROM node:16-alpine

WORKDIR /app

# Copy application code over
COPY ./api .

# Copy shared code over
COPY ./shared .

# Install dependencies
RUN npm install

EXPOSE 3000

CMD [ "npm", "start" ]