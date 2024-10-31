# Stage 1: Build the frontend
FROM node:20-alpine AS frontend  

# Create app directory and set ownership
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

# Set working directory
WORKDIR /home/node/app 

# Copy package.json files and install dependencies
COPY ./frontend/package*.json ./  
USER node
RUN npm ci

# Copy frontend files
COPY --chown=node:node ./frontend/ ./frontend  

# Ensure static directory exists and copy if present
RUN mkdir -p ./static && cp -r ./static/* ./static/ || echo "No static directory found"

# Set working directory for frontend build
WORKDIR /home/node/app/frontend

# Build the frontend
RUN npm run build
  
# Stage 2: Build the Python backend
FROM python:3.11-alpine 

# Install dependencies
RUN apk add --no-cache --virtual .build-deps \  
    build-base \  
    libffi-dev \  
    openssl-dev \  
    curl \  
    && apk add --no-cache \  
    libpq 

# Copy requirements file and install Python dependencies
COPY requirements.txt /usr/src/app/  
RUN pip install --no-cache-dir -r /usr/src/app/requirements.txt \  
    && rm -rf /root/.cache  

# Copy all files to the app directory
COPY . /usr/src/app/  

# Copy static files from the frontend stage if they exist
COPY --from=frontend /home/node/app/static/ /usr/src/app/static/

# Set working directory for the backend
WORKDIR /usr/src/app  

# Expose port 80
EXPOSE 80  

# Start the application
CMD ["gunicorn", "-b", "0.0.0.0:80", "app:app"]
