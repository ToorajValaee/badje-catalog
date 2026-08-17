# Add this volume to your existing Nginx service

Your Nginx container must be able to read the same host directory used by the catalog app:

```yaml
services:
  nginx:
    # keep your existing image, ports, cert mounts, extra_hosts, etc.
    volumes:
      - /srv/badje-catalog/uploads:/data/catalogs:ro
```

If your server uses SELinux and access is denied, use a shared SELinux label (`:z`) or label the host directory appropriately.

Do not expose `/data/catalogs` publicly through another Nginx location. The included catalog config uses an `internal` location and only serves files after Next.js resolves a valid active catalog slug.
