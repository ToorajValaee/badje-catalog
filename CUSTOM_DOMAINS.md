# Publio custom domains with Nginx

Paid plans can enable the `customDomain` entitlement. A catalog owner can then enter a hostname, point a CNAME to the configured Publio target, upload a PEM full chain and matching PEM private key, and activate the hostname.

## App container

The catalog Compose file mounts:

```yaml
- ./custom-domains:/data/custom-domains
```

Publio writes:

```text
custom-domains/
  certs/<catalog-id>/fullchain.pem
  certs/<catalog-id>/privkey.pem
  nginx/<catalog-id>.conf
  reload.request
```

Private keys are never exposed by an HTTP download route. Publio validates the hostname, CNAME, certificate hostname, certificate validity period, and certificate/private-key match before activation.

## Nginx container

Mount the same generated directories read-only into the separate Nginx container:

```yaml
volumes:
  - /ABSOLUTE/PATH/catalog.badje.ir/uploads/generated:/data/catalog-assets:ro
  - /ABSOLUTE/PATH/catalog.badje.ir/uploads/source:/data/catalog-source:ro
  - /ABSOLUTE/PATH/catalog.badje.ir/custom-domains/nginx:/etc/nginx/custom-domains:ro
  - /ABSOLUTE/PATH/catalog.badje.ir/custom-domains/certs:/data/custom-domains/certs:ro
```

The repository Nginx config includes:

```nginx
include /etc/nginx/custom-domains/*.conf;
```

Create the host directories before starting Nginx:

```bash
mkdir -p custom-domains/nginx custom-domains/certs
```

## Automatic reload on the host

The web container does not receive Docker socket access. Run the supplied host helper after changes:

```bash
chmod +x deploy/custom-domain-reloader.sh
NGINX_CONTAINER=your-nginx-container ./deploy/custom-domain-reloader.sh
```

For automatic self-service activation, invoke it periodically from host cron, for example once per minute:

```cron
* * * * * cd /ABSOLUTE/PATH/catalog.badje.ir && NGINX_CONTAINER=your-nginx-container ./deploy/custom-domain-reloader.sh >/dev/null 2>&1
```

The helper reloads Nginx only when `reload.request` is newer than the last successful reload and only after `nginx -t` succeeds.

## User flow

1. Admin enables **Custom domain** on a paid plan.
2. User edits a catalog and enters a hostname such as `catalog.example.com`.
3. Publio displays the required CNAME target, default `catalog.badje.ir`.
4. User creates the CNAME and clicks **Check DNS**.
5. User uploads `fullchain.pem` and `privkey.pem` and clicks **Activate domain**.
6. Publio validates the files, writes the Nginx virtual host and requests a reload.
7. After the host reloader runs, the catalog is available at `https://catalog.example.com/`, with pages at `/p/2`, `/p/3`, etc.

The normal Publio URL remains available as well.
