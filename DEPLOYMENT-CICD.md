# GitHub CI/CD deployment

The repository contains `.github/workflows/ci-cd.yml`.

## What it does

For every pull request and push it:

1. installs Node dependencies,
2. runs `npm run typecheck`,
3. compiles `pdf-engine/generate.py`,
4. builds Next.js,
5. builds the production Docker image.

For pushes to `main` (and manual `workflow_dispatch`) it also deploys to the VPS when the required GitHub Actions secrets are configured.

Deployment deliberately follows the existing Badje server model instead of requiring a container registry:

1. GitHub Actions builds `badje-catalog:latest`,
2. saves it as `badje-catalog-image.tar.gz`,
3. copies the image and `docker-compose.yml` to the VPS over SSH,
4. loads the Docker image,
5. runs `docker compose up -d --force-recreate`,
6. verifies `http://127.0.0.1:8000/health`,
7. prints Compose logs and fails the workflow if health does not become ready.

The workflow does not replace the VPS `.env` or `uploads/` directory, so database credentials, admin credentials, original PDFs, and generated catalog assets remain server-side.

## Required GitHub Actions secrets

Create these in **Repository → Settings → Secrets and variables → Actions**:

- `VPS_HOST` — VPS IP address or SSH hostname.
- `VPS_USER` — SSH account used for deployment.
- `VPS_SSH_KEY` — private SSH key for that account. Use a dedicated deployment key where possible.
- `VPS_APP_DIR` — absolute server directory containing the production `.env` and `uploads/`, for example `/srv/badje-catalog`.
- `VPS_PORT` — optional SSH port. If omitted, port 22 is used.

Until these are configured, CI still runs successfully and the deployment job reports that deployment is skipped.

## VPS prerequisites

The deployment SSH user must be able to run:

```bash
docker load
docker compose up -d --force-recreate
curl http://127.0.0.1:8000/health
```

The server directory must already contain the production `.env`. The workflow creates the upload subdirectories if necessary but never deletes or replaces their contents.

Example layout:

```text
/srv/badje-catalog/
├── .env
├── docker-compose.yml
└── uploads/
    ├── source/
    ├── generated/
    └── .processing/
```

The separately-running Nginx container must continue to mount the same host storage using:

```yaml
volumes:
  - /srv/badje-catalog/uploads/generated:/data/catalog-assets:ro
  - /srv/badje-catalog/uploads/source:/data/catalog-source:ro
```

Adjust `/srv/badje-catalog` to the real `VPS_APP_DIR`.

## First deployment

After the secrets are configured, either push a commit to `main` or open **Actions → CI/CD → Run workflow**.

A successful deploy ends with the JSON response from `/health` in the Actions log.
