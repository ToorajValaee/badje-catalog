'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type TouchEvent } from 'react';
import type { CatalogLink, CatalogManifest } from '@/lib/storage';
import type { StaticNavigationMode } from '@/lib/navigation';

type Props = {
  catalogId: string;
  slug: string;
  title: string;
  manifest: CatalogManifest;
  version: string;
  initialPage: number;
  staticPdf: boolean;
  navigationMode: StaticNavigationMode;
};

export default function CatalogViewer({
  catalogId,
  slug,
  title,
  manifest,
  version,
  initialPage,
  staticPdf,
  navigationMode,
}: Props) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const assetBase = `/_catalog_assets/${catalogId}/`;
  const page = manifest.pages[currentPage - 1];
  const freeScroll = staticPdf && navigationMode === 'free-scroll';

  const pageUrl = (pageNumber: number) => pageNumber === 1
    ? `/${encodeURIComponent(slug)}`
    : `/${encodeURIComponent(slug)}/p/${pageNumber}`;

  const imageUrl = (pageNumber: number) => {
    const target = manifest.pages[pageNumber - 1];
    return target ? `${assetBase}${target.image}?v=${encodeURIComponent(version)}` : '';
  };

  useEffect(() => {
    if (freeScroll) return;
    const oldHash = window.location.hash.match(/^#page-(\d+)$/);
    if (oldHash) {
      const target = Number(oldHash[1]);
      if (Number.isInteger(target) && target >= 1 && target <= manifest.pageCount) {
        window.history.replaceState({ catalogPage: target }, '', pageUrl(target));
        setCurrentPage(target);
      }
    }
  }, [freeScroll, manifest.pageCount]);

  useEffect(() => {
    if (freeScroll) {
      if (initialPage > 1) {
        requestAnimationFrame(() => document.getElementById(`catalog-page-${initialPage}`)?.scrollIntoView({ block: 'start' }));
      }
      return;
    }

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
  }, [freeScroll, initialPage, manifest.pageCount, slug]);

  const preloadTargets = useMemo(() => {
    if (freeScroll || !page) return [] as number[];
    if (staticPdf) {
      return [currentPage - 1, currentPage + 1].filter(target => target >= 1 && target <= manifest.pageCount);
    }
    return [...new Set(page.links
      .filter((link): link is Extract<CatalogLink, { kind: 'internal' }> => link.kind === 'internal')
      .map(link => link.page)
      .filter(target => target >= 1 && target <= manifest.pageCount && target !== currentPage))];
  }, [currentPage, freeScroll, manifest.pageCount, page, staticPdf]);

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

  const goToPage = (target: number) => {
    if (target === currentPage || target < 1 || target > manifest.pageCount) return;
    window.history.pushState({ catalogPage: target }, '', pageUrl(target));
    setCurrentPage(target);
  };

  const navigateInternal = (event: MouseEvent<HTMLAnchorElement>, target: number) => {
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey
    ) return;
    event.preventDefault();
    goToPage(target);
  };

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (!staticPdf || freeScroll || event.touches.length !== 1) return;
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !staticPdf || freeScroll || event.changedTouches.length !== 1) return;

    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    const threshold = 50;

    if (navigationMode === 'swipe-left' && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= threshold) {
      goToPage(currentPage + (dx < 0 ? 1 : -1));
    } else if (navigationMode === 'swipe-right' && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= threshold) {
      goToPage(currentPage + (dx > 0 ? 1 : -1));
    } else if (navigationMode === 'swipe-down' && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) >= threshold) {
      goToPage(currentPage + (dy > 0 ? 1 : -1));
    }
  };

  if (freeScroll) {
    return (
      <main className="staticCatalogScroll" aria-label={title} dir="ltr">
        {manifest.pages.map(item => (
          <section
            id={`catalog-page-${item.number}`}
            key={item.number}
            className="staticCatalogScrollPage"
            data-page={item.number}
          >
            <img
              src={imageUrl(item.number)}
              alt={`${title} — page ${item.number}`}
              width={item.pixelWidth}
              height={item.pixelHeight}
              loading={item.number <= 2 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          </section>
        ))}
      </main>
    );
  }

  if (!page) return null;

  const ratio = page.width / page.height;
  const canvasStyle: CSSProperties = {
    width: `min(100vw, ${(ratio * 100).toFixed(5)}dvh)`,
    aspectRatio: `${page.width} / ${page.height}`,
  };

  return (
    <main
      className={`screenCatalog${staticPdf ? ' screenCatalogStatic' : ''}`}
      aria-label={title}
      dir="ltr"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
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

        {!staticPdf && <div className="screenCatalogLinks" aria-hidden="false">
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
        </div>}
      </section>
    </main>
  );
}
