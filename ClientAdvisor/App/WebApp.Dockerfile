# Frontend stage
FROM node:20-alpine AS frontend  
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app 
COPY ./ClientAdvisor/App/frontend/package*.json ./  
USER node
RUN npm ci
COPY --chown=node:node ./ClientAdvisor/App/frontend/ ./frontend  
COPY --chown=node:node ./ClientAdvisor/App/static/ ./static  
WORKDIR /home/node/app/frontend
RUN npm install --save-dev @types/jest && npm run build

# Backend stage
FROM python:3.11-alpine 
RUN apk add --no-cache --virtual .build-deps \  
    build-base \  
    libffi-dev \  
    openssl-dev \  
    curl \  
    && apk add --no-cache \  
    libpq 

COPY ./ClientAdvisor/App/requirements.txt /usr/src/app/  
RUN pip install --no-cache-dir -r /usr/src/app/requirements.txt \  
    && rm -rf /root/.cache  

COPY ./ClientAdvisor/App/ /usr/src/app/  
COPY --from=frontend /home/node/app/static  /usr/src/app/static/
WORKDIR /usr/src/app  
EXPOSE 80  

CMD ["gunicorn", "-b", "0.0.0.0:80", "app:app"]