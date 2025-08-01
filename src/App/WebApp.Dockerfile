# Frontend stage
FROM node:20-alpine AS frontend  
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app 
COPY ./App/frontend/package*.json ./  
USER node
RUN npm ci
COPY --chown=node:node ./App/frontend/ ./frontend  
COPY --chown=node:node ./App/static/ ./static  
WORKDIR /home/node/app/frontend
RUN npm install --save-dev @types/jest && npm run build

# Backend stage
FROM python:3.11-alpine 
RUN apk add --no-cache --virtual .build-deps \  
    build-base \  
    libffi-dev \  
    openssl-dev \  
    curl \  
    unixodbc-dev \ 
    && apk add --no-cache \  
    libpq \
    && curl -O https://download.microsoft.com/download/7/6/d/76de322a-d860-4894-9945-f0cc5d6a45f8/msodbcsql18_18.4.1.1-1_amd64.apk \
    && apk add --allow-untrusted msodbcsql18_18.4.1.1-1_amd64.apk \
    && rm msodbcsql18_18.4.1.1-1_amd64.apk 

COPY ./App/requirements.txt /usr/src/app/  

RUN pip install --upgrade pip setuptools wheel \  
    && pip install --no-cache-dir -r /usr/src/app/requirements.txt \  
    && rm -rf /root/.cache  

COPY ./App/ /usr/src/app/  
COPY --from=frontend /home/node/app/static  /usr/src/app/static/
WORKDIR /usr/src/app  
EXPOSE 80  

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "80", "--workers", "1", "--log-level", "info", "--access-log"]
