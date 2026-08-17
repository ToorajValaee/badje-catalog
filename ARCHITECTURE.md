# Architecture

```text
Admin upload
   ↓
Next.js
   ├─ PostgreSQL metadata
   ├─ /data/uploads/source/<id>.pdf
   └─ Python generator
        ├─ PyMuPDF page rasterization
        ├─ PDF link extraction
        └─ /data/uploads/generated/<id>/...

Visitor /<slug>
   ↓
Next.js validates active catalog + reads manifest
   ↓
HTML page containing responsive page images and transparent link hotspots
   ↓
Nginx serves /_catalog_assets/... directly from generated storage
```

The visual catalog is not reconstructed from text or DOM elements. Each original PDF page becomes a single image, so typography/layout do not depend on the visitor's fonts or PDF viewer. Only the PDF's link rectangles are recreated as transparent HTML anchors.


## v3.1 screen navigation

Public rendering is screen-based rather than continuous-scroll. Only one manifest page is rendered at a time. `/slug` opens page 1 and `/slug/p/N` is a refresh-safe deep link to page N. Internal PDF annotations are ordinary anchors with valid deep-link hrefs; client-side navigation uses `history.pushState` so transitions do not require a full document reload. `popstate` restores browser Back/Forward behavior.

The page canvas is constrained by both `100vw` and `100dvh` while preserving the PDF page aspect ratio. Transparent hotspot percentages therefore continue to match the rasterized page at every viewport size.
