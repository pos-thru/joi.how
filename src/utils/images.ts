import { useCallback, useEffect } from 'react';
import { ImageItem, ImageSize, ImageType } from '../types';
import { useLocalImages } from '../local/LocalProvider';

export interface ImagePreloadEntry {
  item: ImageItem;
  size: ImageSize;
}

const usePreloadItems = () => {
  const { resolveUrl } = useLocalImages();

  // useCallback so the function reference is stable across renders,
  // preventing useImagePreloader's effect from firing on every render.
  return useCallback(
    async (
      entries: ImagePreloadEntry[],
      maxItems: number,
      signal: { cancelled: boolean }
    ) => {
      // Preload all items in parallel, not sequentially.
      const tasks = entries.slice(0, maxItems).map(async entry => {
        if (signal.cancelled) return;

        try {
          let src: string;
          let type: 'image' | 'video';

          if (entry.size === ImageSize.thumbnail) {
            src = entry.item.thumbnail;
            type = 'image';
          } else if (entry.size === ImageSize.preview) {
            src = entry.item.preview;
            type = 'image';
          } else {
            src = entry.item.full;
            type = entry.item.type === ImageType.video ? 'video' : 'image';
          }

          const url = await resolveUrl(src);
          if (signal.cancelled) return;

          if (type === 'image') {
            await new Promise<void>(resolve => {
              const img = new Image();
              // Already in cache
              if (img.complete) {
                resolve();
                return;
              }
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = url;
            });
          } else {
            // For videos: kick off browser buffering and move on immediately.
            // Waiting for loadeddata would block the parallel queue for seconds.
            // The browser will buffer the video in the background.
            const video = document.createElement('video');
            video.preload = 'auto';
            video.muted = true;
            video.playsInline = true;
            video.src = url;
            video.load();
          }
        } catch {
          // Ignore preload failures and keep rendering flow intact
        }
      });

      await Promise.allSettled(tasks);
    },
    [resolveUrl]
  );
};

export const useImagePreloader = (
  entries: ImagePreloadEntry[],
  maxItems = 4
) => {
  const preloadItems = usePreloadItems();

  useEffect(() => {
    const signal = { cancelled: false };
    void preloadItems(entries, maxItems, signal);
    return () => {
      signal.cancelled = true;
    };
  }, [entries, maxItems, preloadItems]);
};
