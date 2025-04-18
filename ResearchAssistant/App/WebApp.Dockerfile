FROM node:20-alpine AS frontend  
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app 
COPY ./ResearchAssistant/App/frontend/package*.json ./  
USER node
RUN npm ci  
COPY --chown=node:node ./ResearchAssistant/App/frontend/ ./frontend  
# COPY --chown=node:node ./static/ ./static  
WORKDIR /home/node/app/frontend
RUN npm run build
  
FROM python:3.11-alpine 
RUN apk add --no-cache --virtual .build-deps \  
    build-base \  
    libffi-dev \  
    openssl-dev \  
    curl \  
    && apk add --no-cache \  
    libpq
  
COPY ./ResearchAssistant/App/requirements.txt /usr/src/app/  
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /usr/src/app/requirements.txt \  
    && pip install --no-cache-dir uwsgi \ 
    && rm -rf /root/.cache  
  
COPY ./ResearchAssistant/App/ /usr/src/app/
COPY --from=frontend /home/node/app/static  /usr/src/app/static/
WORKDIR /usr/src/app  
EXPOSE 80  
CMD ["uwsgi", "--http", ":80", "--wsgi-file", "app.py", "--callable", "app", "-b","32768"]
