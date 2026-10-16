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

There is no `GET /poems`. The UI asks for one to show history, gets an error, and ignores it. This is harmless.

## How deployment works

### API: Azure Container Apps

- Resource group `rg-poetry`, environment `poetry-env`, app `poetry-api`, region West US 3.
- The workflow `.github/workflows/poetry-api-AutoDeployTrigger-*.yml` runs on every push to `master`. It builds `poetry-api/Dockerfile` on a GitHub server, pushes the image to the Azure Container Registry `poetryacr`, and updates the Container App.
- The app listens on port 8080. Ingress target port is set to 8080 in the workflow (`targetPort: 8080`).
- Settings live on the Container App itself, not in GitHub:
    - Secret `gemini-api-key` holds the Gemini key.
    - Environment variable `GEMINI_API_KEY` references that secret.
    - Environment variable `ALLOWED_ORIGINS` is set to the UI address above.
- The app scales to zero when idle, so the first request after a quiet period can take a minute while Java starts.

### UI: Azure Static Web Apps

- The workflow `.github/workflows/azure-static-web-apps-brave-pond-0e5370f1e.yml` builds `poetry-ui` and publishes it on every push to `master`.
- The API address is set in that workflow as `VITE_API_URL` under the `Build And Deploy` step.
- `poetry-ui/.env.production` is git-ignored and is **not** used by the GitHub build. Change the address in the workflow file instead.

## Common changes

**Change the Gemini key**: in the Azure portal open the Container App `poetry-api`, go to **Secrets**, edit `gemini-api-key`, then create a new revision (for example **Containers**, **Save as a new revision**) so the app restarts with it.

**Allow another website to call the API** (for example a custom domain): open the Container App, go to **Containers**, **Environment variables**, and edit `ALLOWED_ORIGINS`. Use a comma between addresses, for example `https://brave-pond-0e5370f1e.2.azurestaticapps.net,http://localhost:5173`. Then **Save as a new revision**.

**The API address changes** (for example if the Container App is recreated): edit `VITE_API_URL` in the Static Web Apps workflow and commit. The UI rebuilds with the new address.

## Troubleshooting

- **UI loads but no poem appears:** press F12, open the **Console** tab, and look for red text. A CORS error means `ALLOWED_ORIGINS` does not exactly match the UI address.
- **UI still calls `localhost`:** the Static Web Apps build has not finished since `VITE_API_URL` was set, or the browser is showing an old copy. Check the **Actions** tab on GitHub, then press Ctrl+F5.
- **API will not start (revision shows "Activation failed"):** in the Azure portal open the Container App, then **Log stream**. The usual causes are a missing `GEMINI_API_KEY` or a target port that is not 8080.
- **A build fails:** on GitHub open the **Actions** tab, click the failed run, then the step marked with a red cross.

## Security

Never commit your API key. Keep it in an IntelliJ environment variable locally and in the Container App secret `gemini-api-key` on Azure. The registry and Azure login details used by the workflow are stored as GitHub repository secrets (names beginning `POETRYAPI_`). Do not copy them into any file.

## Cost and clean-up

To remove everything this project created in Azure, delete the resource group `rg-poetry`. This deletes the Container App, the environment, the registry and the Static Web App.