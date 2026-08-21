import React from 'react';
import type { ImageSearchResult } from '../../services/imageSearchService';
import { ImageCard } from './ImageCard';

interface ImageGalleryProps {
  imageResults: ImageSearchResult[];
  onImageClick?: (item: ImageSearchResult) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ imageResults, onImageClick }) => {
  if (!imageResults || imageResults.length === 0) return null;

  const globalGoogleUrl = imageResults[0]?.googleSearchUrl;

  return (
    <div className="my-4 flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-primary uppercase font-mono tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">collections</span>
          <span>Verified Image Results ({imageResults.length})</span>
        </span>

        {globalGoogleUrl && (
          <a
            href={globalGoogleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-xs">open_in_new</span>
            <span>More on Google Images</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {imageResults.map((item, idx) => (
          <ImageCard key={idx} item={item} onImageClick={onImageClick} />
        ))}
      </div>
    </div>
  );
};
