# Server setup checklist

1. Create `/srv/badje-catalog/uploads`.
2. Make it writable by UID/GID `1001:1001` for the catalog container.
3. Put `DATABASE_URL`, admin credentials and session secret in `.env`.
4. Load the PC-built `badje-catalog:latest` image.
5. Start the catalog Compose stack.
6. Mount `/srv/badje-catalog/uploads:/data/catalogs:ro` into the Nginx container.
7. Install `nginx/catalog.badje.ir.conf` and reload Nginx.
8. Check `http://127.0.0.1:8000/health`.
9. Upload `samples/hello-world.pdf` and visit `/hello-world`.

Important: the Nginx container and the catalog container must mount the same host upload directory, but under the paths shown above.
