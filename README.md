# Poetry demo

A small poem generator.

- `poetry-api/` is a Spring Boot 4 + Spring AI (Google Gemini) API, built with JDK 25. It exposes `POST /poems`.
- `poetry-ui/` is a React + Vite + Bootstrap front end.

| Part | Where it runs | Address |
|------|---------------|---------|
| UI | Azure Static Web App `poetry-ui-final` | https://brave-pond-0e5370f1e.2.azurestaticapps.net |
| API | Azure Container App `poetry-api` | https://poetry-api.thankfulground-87deb36a.westus3.azurecontainerapps.io |

Both parts deploy automatically from GitHub whenever you push to the `master` branch.

## Configuration

| Setting | Used by | What it is | Default |
|---------|---------|------------|---------|
| `GEMINI_API_KEY` | API | Your Google Gemini API key. Required. | none |
| `ALLOWED_ORIGINS` | API | Web addresses allowed to call the API (CORS). Separate several with commas. No trailing `/`. | `http://localhost:5173` |
| `VITE_API_URL` | UI | Address of the API. It is baked into the UI when it is built. | `http://localhost:8080` |

## Run locally

You need JDK 25 or newer and Node.js.

**API** (PowerShell):

    $env:GEMINI_API_KEY = "<your key>"
    cd poetry-api
    ./mvnw.cmd spring-boot:run

The API listens on http://localhost:8080. Check it with http://localhost:8080/actuator/health, which should show `"status":"UP"`.

**UI** (a second terminal):

    cd poetry-ui
    npm install
    npm run dev

Open http://localhost:5173. The UI talks to http://localhost:8080 by default, and the API allows http://localhost:5173 by default, so no extra setup is needed.

In IntelliJ, put `GEMINI_API_KEY` in the run configuration's environment variables so it is never written to a file in the project.

## API

`POST /poems` with a JSON body:

    { "genre": "haiku", "theme": "autumn rain" }

Genres used by the UI: `haiku`, `playful`, `melancholy`, `frustrated`, `epic`.

`GET /actuator/health` returns the health of the app.

There is no `GET /poems`. The UI asks for one to show history, gets a 405 error, and ignores it. The red error this causes in the browser console is harmless.

## How deployment works

### API: Azure Container Apps

- Resource group `rg-poetry`, environment `poetry-env`, app `poetry-api`, region West US 3.
- The workflow `.github/workflows/poetry-api-AutoDeployTrigger-*.yml` runs on every push to `master`. It builds `poetry-api/Dockerfile` on a GitHub server, pushes the image to the Azure Container Registry `poetryacr`, and updates the Container App.
- The app listens on port 8080. The ingress target port is set to 8080 in the workflow (`targetPort: 8080`).
- **Size: the container needs at least 1 CPU and 2 Gi of memory.** Java apps start slowly and use a lot of memory. With less (for example 0.25 CPU and 512 MiB) the app crashes or fails its health check in a loop, Azure keeps serving an older version, and changes appear to have no effect. Set this under **Containers**, **Properties**, **CPU and memory**.
- Settings live on the Container App itself, not in GitHub:
    - Secret `gemini-api-key` holds the Gemini key.
    - Environment variable `GEMINI_API_KEY` references that secret.
    - Environment variable `ALLOWED_ORIGINS` is set to the UI address above.
- The container is still called `simple-hello-world-container` in the portal. That is a leftover name from when the app was created and it does not matter.
- The app scales to zero when idle, so the first request after a quiet period can take a minute while Java starts. To avoid this, set **Scale**, **Min replicas** to 1 (it uses a little more Azure credit).

### UI: Azure Static Web Apps

- The workflow `.github/workflows/azure-static-web-apps-brave-pond-0e5370f1e.yml` builds `poetry-ui` and publishes it on every push to `master`.
- The API address is set in that workflow as `VITE_API_URL` under the `Build And Deploy` step.
- `poetry-ui/.env.production` is git-ignored and is **not** used by the GitHub build. Change the address in the workflow file instead.

## Common changes

**Change the Gemini key**: in the Azure portal open the Container App `poetry-api`, go to **Secrets**, edit `gemini-api-key`, then create a new revision (for example **Containers**, **Save as a new revision**) so the app restarts with it.

**Allow another website to call the API** (for example a custom domain): open the Container App, go to **Containers**, **Environment variables**, and edit `ALLOWED_ORIGINS`. Use a comma between addresses, for example `https://brave-pond-0e5370f1e.2.azurestaticapps.net,http://localhost:5173`. Then **Save as a new revision**.

**The API address changes** (for example if the Container App is recreated): edit `VITE_API_URL` in the Static Web Apps workflow and commit. The UI rebuilds with the new address.

**Before you push from IntelliJ**: press Ctrl+T (Git, Update Project) first. The Azure workflows add and change files on GitHub, so your PC can be behind.

## Troubleshooting

- **UI loads but no poem appears:** press F12, open the **Console** tab, and look for red text. A CORS error means either `ALLOWED_ORIGINS` does not exactly match the UI address, or the API is not healthy (see the next point).
- **A CORS error but the setting looks right:** open the API's `/actuator/health` address in a browser. If it does not show `"status":"UP"`, the app is crashing. In the portal, open **Revisions and replicas**. A newest revision showing **Unhealthy** or **Activation failed** usually means the container is too small (see the size note above).
- **Test CORS directly** (PowerShell, in the IntelliJ Terminal):

      curl.exe -i -X OPTIONS "https://poetry-api.thankfulground-87deb36a.westus3.azurecontainerapps.io/poems" -H "Origin: https://brave-pond-0e5370f1e.2.azurestaticapps.net" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"

  `HTTP/1.1 200` with an `access-control-allow-origin` line means CORS is working. `403 Invalid CORS request` means the running app does not have the right `ALLOWED_ORIGINS`.
- **UI still calls `localhost`:** the Static Web Apps build has not finished since `VITE_API_URL` was set, or the browser is showing an old copy. Check the **Actions** tab on GitHub, then press Ctrl+F5.
- **API will not start:** in the Azure portal open the Container App, then **Log stream**. The usual causes are a missing `GEMINI_API_KEY`, a target port that is not 8080, or too little CPU and memory.
- **A build fails:** on GitHub open the **Actions** tab, click the failed run, then the step marked with a red cross.

## Security

- Never commit your API key. Keep it in an IntelliJ environment variable locally and in the Container App secret `gemini-api-key` on Azure. If a key is ever shown in a screenshot or file you have shared, create a new one in Google AI Studio and update the secret.
- The registry and Azure login details used by the workflow are stored as GitHub repository secrets (names beginning `POETRYAPI_`). Do not copy them into any file.
- CORS only stops other **websites** from using the API in a browser. It does not stop someone calling the API address directly, which would use up your Gemini quota. Set a usage limit on the key in Google AI Studio, and consider adding rate limiting or an API key to the Spring app if you share the link widely.

## Cost and clean-up

- Set a budget alert in Azure under **Cost Management**, **Budgets**.
- If the old App Service version of the API still exists, delete both the App Service and its App Service plan. The plan keeps billing even when the app is deleted.
- To remove everything this project created in Azure, delete the resource group `rg-poetry`. This deletes the Container App, the environment, the registry and the Static Web App.