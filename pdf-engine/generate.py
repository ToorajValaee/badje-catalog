#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

import pymupdf
from PIL import Image


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: generate.py INPUT.pdf OUTPUT_DIR", file=sys.stderr)
        return 2

    source = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    pages_dir = output / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    dpi = int(os.getenv("CATALOG_RENDER_DPI", "200"))
    quality = int(os.getenv("CATALOG_WEBP_QUALITY", "96"))
    lossless = os.getenv("CATALOG_WEBP_LOSSLESS", "true").lower() in {"1", "true", "yes", "on"}
    if not 100 <= dpi <= 400:
        raise RuntimeError("INVALID_DPI")
    if not 70 <= quality <= 100:
        raise RuntimeError("INVALID_WEBP_QUALITY")

    document = pymupdf.open(source)
    if document.page_count < 1:
        raise RuntimeError("PDF_HAS_NO_PAGES")

    manifest_pages = []
    total_links = 0
    total_image_bytes = 0

    for index in range(document.page_count):
        page = document.load_page(index)
        rect = page.rect
        if rect.width <= 0 or rect.height <= 0:
            raise RuntimeError(f"INVALID_PAGE_SIZE:{index + 1}")

        pix = page.get_pixmap(dpi=dpi, alpha=False, colorspace=pymupdf.csRGB)
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        filename = f"{index + 1:04d}.webp"
        target = pages_dir / filename
        if lossless:
            image.save(target, "WEBP", lossless=True, method=6)
        else:
            image.save(target, "WEBP", quality=quality, method=6)
        image_bytes = target.stat().st_size
        total_image_bytes += image_bytes

        seen = set()
        links = []
        for raw in page.get_links():
            link_rect = raw.get("from")
            if not link_rect:
                continue

            x = clamp((link_rect.x0 - rect.x0) / rect.width)
            y = clamp((link_rect.y0 - rect.y0) / rect.height)
            right = clamp((link_rect.x1 - rect.x0) / rect.width)
            bottom = clamp((link_rect.y1 - rect.y0) / rect.height)
            width = max(0.0, right - x)
            height = max(0.0, bottom - y)
            if width <= 0 or height <= 0:
                continue

            item = None
            target_page = raw.get("page", -1)
            if isinstance(target_page, int) and 0 <= target_page < document.page_count:
                item = {
                    "kind": "internal",
                    "page": target_page + 1,
                    "x": round(x, 8), "y": round(y, 8),
                    "width": round(width, 8), "height": round(height, 8),
                }
            elif raw.get("uri"):
                uri = str(raw["uri"]).strip()
                if uri:
                    item = {
                        "kind": "external", "url": uri,
                        "x": round(x, 8), "y": round(y, 8),
                        "width": round(width, 8), "height": round(height, 8),
                    }

            if not item:
                continue

            key = json.dumps(item, sort_keys=True, ensure_ascii=False)
            if key in seen:
                continue
            seen.add(key)
            links.append(item)

        total_links += len(links)
        manifest_pages.append({
            "number": index + 1,
            "width": round(rect.width, 4),
            "height": round(rect.height, 4),
            "pixelWidth": pix.width,
            "pixelHeight": pix.height,
            "image": f"pages/{filename}",
            "imageBytes": image_bytes,
            "links": links,
        })

    manifest = {
        "version": 2,
        "pageCount": document.page_count,
        "renderDpi": dpi,
        "webpQuality": quality,
        "webpLossless": lossless,
        "format": "webp",
        "linkCount": total_links,
        "generatedImageBytes": total_image_bytes,
        "pages": manifest_pages,
    }
    manifest_path = output / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({
        "pageCount": document.page_count,
        "linkCount": total_links,
        "generatedImageBytes": total_image_bytes,
        "renderDpi": dpi,
        "webpQuality": quality,
        "webpLossless": lossless,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
