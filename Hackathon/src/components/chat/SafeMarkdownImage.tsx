import React, { useState, useEffect } from 'react';

interface SafeMarkdownImageProps {
  src?: string;
  alt?: string;
  onImageClick?: (src: string, alt: string) => void;
}

export const SafeMarkdownImage: React.FC<SafeMarkdownImageProps> = ({
  src,
  alt = 'Study reference image',
  onImageClick,
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!src || src.startsWith('javascript:')) {
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

    img.src = src;

    return () => {
      isMounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (status === 'error' || !src) {
    return (
      <div className="my-2.5 p-3 rounded-xl bg-surface-container/70 border border-white/10 flex items-center gap-3 text-xs text-on-surface-variant max-w-sm">
        <span className="material-symbols-outlined text-amber-400 text-lg">image_not_supported</span>
        <div className="flex flex-col">
          <span className="font-semibold text-on-surface text-xs">Image unavailable</span>
          <span className="text-[10px] text-on-surface-variant/70 font-mono truncate max-w-[200px]">
            {alt || 'Reference image could not be loaded'}
          </span>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="my-2.5 w-full max-w-md min-h-[160px] rounded-xl bg-surface-container-high/60 border border-white/10 p-4 flex flex-col items-center justify-center gap-2 animate-pulse">
        <span className="material-symbols-outlined text-primary text-xl animate-spin">sync</span>
        <span className="text-xs text-on-surface-variant font-mono">Loading image reference...</span>
      </div>
    );
  }

  return (
    <figure className="my-3 block group text-left max-w-md">
      <div
        onClick={() => onImageClick?.(src, alt)}
        className="relative rounded-xl overflow-hidden border border-white/20 hover:border-primary/80 transition-all shadow-lg cursor-pointer bg-surface-container-lowest"
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="w-full max-h-80 object-contain group-hover:scale-[1.02] transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <span className="material-symbols-outlined text-white text-2xl drop-shadow-md">zoom_in</span>
        </div>
      </div>
      {alt && (
        <figcaption className="mt-1.5 text-[11px] text-on-surface-variant px-1 font-medium truncate max-w-md">
          📷 {alt}
        </figcaption>
      )}
    </figure>
  );
};
