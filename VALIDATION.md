# Validation — v3.2.0

Validation performed in the build workspace:

- Python generator compiles successfully with `python3 -m py_compile`.
- TypeScript/TSX source parses/transpiles successfully with TypeScript 5.8 syntax validation.
- `samples/hello-world.pdf` generated successfully at 150 DPI / lossy WebP quality 85.
- The same source generated successfully at 300 DPI / lossless WebP.
- Both generations kept 4 pages and 72 extracted link hotspots.
- The 150 DPI sample produced a first page of 1241 × 1754 pixels.
- The 300 DPI sample produced a first page of 2481 × 3508 pixels.

A full `npm install` / `next build` could not be run in this workspace because outbound npm registry DNS is unavailable. The Docker build remains the authoritative production build check on a machine with registry access.
