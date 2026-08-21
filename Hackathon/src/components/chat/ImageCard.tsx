import React, { useState, useEffect } from 'react';
import type { ImageSearchResult } from '../../services/imageSearchService';

interface ImageCardProps {
  item: ImageSearchResult;
  onImageClick?: (item: ImageSearchResult) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ item, onImageClick }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!item.imageUrl || item.imageUrl.startsWith('javascript:')) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    let isMounted = true;
    const img = new Image();

    img.onload = () => {
      if (isMounted) setStatus('success');
    };
    img.onerror = () => {
      if (isMounted) setStatus('error');
    };

    img.src = item.imageUrl;

    return () => {
      isMounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [item.imageUrl]);

  return (
    <div className="flex flex-col rounded-2xl bg-surface-container-low/70 border border-white/15 overflow-hidden shadow-xl transition-all hover:border-primary/50 group">
      {/* Image Render / Skeleton / Error Fallback */}
      <div
        className="relative w-full h-48 bg-surface-container-lowest flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => status === 'success' && onImageClick?.(item)}
      >
        {status === 'loading' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 animate-pulse bg-surface-container-high/40">
            <span className="material-symbols-outlined text-primary text-xl animate-spin">sync</span>
            <span className="text-[11px] font-mono text-on-surface-variant">Loading image...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-1.5 bg-surface-container-high/30 text-center">
            <span className="material-symbols-outlined text-amber-400 text-2xl">image_not_supported</span>
            <span className="text-xs font-semibold text-on-surface">Image unavailable</span>
            <span className="text-[10px] text-on-surface-variant/70 font-mono truncate max-w-[90%]">
              {item.title}
            </span>
          </div>
        )}

        {status === 'success' && (
          <>
            <img
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="material-symbols-outlined text-white text-2xl drop-shadow-md">zoom_in</span>
            </div>
          </>
        )}
      </div>

      {/* Card Details & Action Buttons */}
      <div className="p-3 flex flex-col gap-2 bg-surface-container-low">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-xs font-bold text-on-surface truncate" title={item.title}>
            {item.title}
          </h4>
          <span className="text-[10px] text-on-surface-variant font-mono">
            Source: {item.sourceName || 'Wikimedia Commons'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10">
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-surface-variant border border-white/10 hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-xs">open_in_new</span>
              <span>View Source</span>
            </a>
          )}

          <a
            href={item.googleSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg bg-primary-container/30 border border-primary/30 hover:bg-primary-container/50 text-primary text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-xs">search</span>
            <span>🔎 Search on Google Images</span>
          </a>
        </div>
      </div>
    </div>
  );
};
