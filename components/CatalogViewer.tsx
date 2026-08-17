'use client';

import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import type { CatalogLink, CatalogManifest } from '@/lib/storage';

type Props = {
  catalogId: string;
  slug: string;
  title: string;
  manifest: CatalogManifest;
  version: string;
  initialPage: number;
};

export default function CatalogViewer({ catalogId, slug, title, manifest, version, initialPage }: Props) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const assetBase = `/_catalog_assets/${catalogId}/`;
  const page = manifest.pages[currentPage - 1];

  const pageUrl = (pageNumber: number) => pageNumber === 1
    ? `/${encodeURIComponent(slug)}`
    : `/${encodeURIComponent(slug)}/p/${pageNumber}`;

  const imageUrl = (pageNumber: number) => {
    const target = manifest.pages[pageNumber - 1];
    return target ? `${assetBase}${target.image}?v=${encodeURIComponent(version)}` : '';
  };

  useEffect(() => {
    // Backward compatibility for links copied from the old scrolling viewer.
    const oldHash = window.location.hash.match(/^#page-(\d+)$/);
    if (oldHash) {
      const target = Number(oldHash[1]);
      if (Number.isInteger(target) && target >= 1 && target <= manifest.pageCount) {
        window.history.replaceState({ catalogPage: target }, '', pageUrl(target));
        setCurrentPage(target);
      }
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.replace(/\/+$/, '');
      const encodedSlug = `/${encodeURIComponent(slug)}`;
      if (path === encodedSlug || path === `/${slug}`) {
        setCurrentPage(1);
        return;
      }
      const match = path.match(/\/p\/(\d+)$/);
      if (!match) return;
      const nextPage = Number(match[1]);
      if (Number.isInteger(nextPage) && nextPage >= 1 && nextPage <= manifest.pageCount) {
        setCurrentPage(nextPage);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [manifest.pageCount, slug]);

  const preloadTargets = useMemo(() => {
    if (!page) return [] as number[];
    return [...new Set(page.links
      .filter((link): link is Extract<CatalogLink, { kind: 'internal' }> => link.kind === 'internal')
      .map(link => link.page)
      .filter(target => target >= 1 && target <= manifest.pageCount && target !== currentPage))];
  }, [currentPage, manifest.pageCount, page]);

  useEffect(() => {
    const images: HTMLImageElement[] = [];
    for (const target of preloadTargets) {
      const src = imageUrl(target);
      if (!src) continue;
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      images.push(image);
    }
    return () => { images.length = 0; };
  }, [preloadTargets, version]);

  if (!page) return null;

  const navigateInternal = (event: MouseEvent<HTMLAnchorElement>, target: number) => {
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey
    ) return;

    event.preventDefault();
    if (target === currentPage || target < 1 || target > manifest.pageCount) return;
    window.history.pushState({ catalogPage: target }, '', pageUrl(target));
    setCurrentPage(target);
  };

  const ratio = page.width / page.height;
  const canvasStyle: CSSProperties = {
    width: `min(100vw, ${(ratio * 100).toFixed(5)}dvh)`,
    aspectRatio: `${page.width} / ${page.height}`,
  };

  return (
    <main className="screenCatalog" aria-label={title} dir="ltr">
      <section
        className="screenCatalogCanvas"
        key={page.number}
        data-page={page.number}
        style={canvasStyle}
      >
        <img
          className="screenCatalogImage"
          src={imageUrl(page.number)}
          alt={`${title} — page ${page.number}`}
          width={page.pixelWidth}
          height={page.pixelHeight}
          decoding="sync"
          draggable={false}
        />

        <div className="screenCatalogLinks" aria-hidden="false">
          {page.links.map((link, linkIndex) => {
            const style: CSSProperties = {
              left: `${link.x * 100}%`,
              top: `${link.y * 100}%`,
              width: `${link.width * 100}%`,
              height: `${link.height * 100}%`,
            };

            if (link.kind === 'internal') {
              return (
                <a
                  key={`${page.number}-${linkIndex}`}
                  className="screenCatalogHotspot"
                  href={pageUrl(link.page)}
                  style={style}
                  aria-label={`Go to page ${link.page}`}
                  onClick={event => navigateInternal(event, link.page)}
                />
              );
            }

            return (
              <a
                key={`${page.number}-${linkIndex}`}
                className="screenCatalogHotspot"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={style}
                aria-label="Open link"
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}
