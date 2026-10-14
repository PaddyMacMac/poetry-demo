# Poetry demo

- `poetry-api/` Spring Boot 4 + Spring AI (Google Gemini), `POST /poems`
- `poetry-ui/`  React + Vite + Bootstrap

## Run locally

API (JDK 25 or newer; compiles with `--release 25`):

    $env:GEMINI_API_KEY = "<your key>"
    cd poetry-api
    ./mvnw.cmd spring-boot:run

UI (in a second terminal):

    cd poetry-ui
    npm install
    npm run dev          # http://localhost:5173

## Deploy to Azure

Follow Parts 5-7 of the tutorial doc. Quick reference:

    cd poetry-api
    ./mvnw.cmd clean package
    az webapp deploy -g $RG -n $API --src-path target/poetry-api-0.0.1-SNAPSHOT.jar --type jar

    cd ../poetry-ui
    Set-Content .env.production "VITE_API_URL=https://$API.azurewebsites.net"
    npm install
    npm run build
    swa deploy ./dist --deployment-token $TOKEN --env production

App settings required on the web app: `GEMINI_API_KEY`, `ALLOWED_ORIGINS`
(the Static Web App URL), `WEBSITES_PORT=8080`.

Never commit your API key. Keep it in an IntelliJ environment variable locally
and an App Service setting on Azure.

