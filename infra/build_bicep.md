**Run below code to build bicep.json after changes**
az bicep build --file main.bicep


# Steps to create your own Web app docker
docker build --tag <your-username>/byc-wa-app:latest -f .\WebApp.Dockerfile .     
docker tag <your-username>/byc-wa-app:latest <your-container>.azurecr.io/byc-wa-app:latest 
az login
az acr login --name <your-container>     
docker push <your-container>.azurecr.io/byc-wa-app:latest
az acr update -n <your-container> --admin-enabled true
az acr update --name <your-container> --anonymous-pull-enabled


# # Steps to create your own Azure Function docker script
az login
docker build --tag <your-username>/byc-wa-fn:latest .
<!-- docker run -p 8080:80 -it <your-username>/byc-wa-fn:latest -->
az acr login --name <your-container>
docker tag <your-username>/byc-wa-fn:latest <your-container>.azurecr.io/byc-wa-fn:latest
docker push <your-container>.azurecr.io/byc-wa-fn:latest
az acr update -n <your-container> --admin-enabled true
az acr update --name <your-container> --anonymous-pull-enabled