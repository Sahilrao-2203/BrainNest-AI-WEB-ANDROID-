export interface ImageSearchResult {
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  sourceName?: string;
  googleSearchUrl: string;
}

/**
 * Builds a dynamic Google Images search URL from the search query.
 */
export function buildGoogleImagesUrl(query: string): string {
  return `https://www.google.com/search?udm=2&q=${encodeURIComponent(query)}`;
}

/**
 * Curated high-reliability educational & science image directory.
 * Uses permanent, public, high-resolution media URLs from Wikimedia Commons & Wikipedia.
 */
const CURATED_IMAGE_DATABASE: Record<string, Array<{ title: string; imageUrl: string; sourceUrl: string; sourceName: string }>> = {
  'google founders': [
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Larry_Page_in_2023.jpg/800px-Larry_Page_in_2023.jpg',
      title: 'Larry Page',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Larry_Page_in_2023.jpg',
      sourceName: 'Wikimedia Commons',
    },
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sergey_Brin_in_2023.jpg/800px-Sergey_Brin_in_2023.jpg',
      title: 'Sergey Brin',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sergey_Brin_in_2023.jpg',
      sourceName: 'Wikimedia Commons',
    },
  ],
  'founders of google': [
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Larry_Page_in_2023.jpg/800px-Larry_Page_in_2023.jpg',
      title: 'Larry Page',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Larry_Page_in_2023.jpg',
      sourceName: 'Wikimedia Commons',
    },
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sergey_Brin_in_2023.jpg/800px-Sergey_Brin_in_2023.jpg',
      title: 'Sergey Brin',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sergey_Brin_in_2023.jpg',
      sourceName: 'Wikimedia Commons',
    },
  ],
  'larry page': [
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Larry_Page_in_2023.jpg/800px-Larry_Page_in_2023.jpg',
      title: 'Larry Page',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Larry_Page_in_2023.jpg',
      sourceName: 'Wikimedia Commons',
    },
  ],
  'sergey brin': [
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sergey_Brin_in_2023.jpg/800px-Sergey_Brin_in_2023.jpg',
      title: 'Sergey Brin',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sergey_Brin_in_2023.jpg',
      sourceName: 'Wikimedia Commons',
    },
  ],
  cpu: [
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Intel_C4004.jpg/800px-Intel_C4004.jpg',
      title: 'Central Processing Unit (CPU)',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Intel_C4004.jpg',
      sourceName: 'Wikimedia Commons',
    },
  ],
  processor: [
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Intel_C4004.jpg/800px-Intel_C4004.jpg',
      title: 'Central Processing Unit (CPU)',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Intel_C4004.jpg',
      sourceName: 'Wikimedia Commons',
    },
  ],
  'harmonic oscillator': [
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Simple_harmonic_motion_animation.gif/600px-Simple_harmonic_motion_animation.gif',
      title: 'Harmonic Oscillator Motion',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Simple_harmonic_motion_animation.gif',
      sourceName: 'Wikimedia Commons',
    },
  ],
  recursion: [
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Sierpinski_triangle_recursion.png/800px-Sierpinski_triangle_recursion.png',
      title: 'Recursion Visual Diagram',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sierpinski_triangle_recursion.png',
      sourceName: 'Wikimedia Commons',
    },
  ],
  'ram vs rom': [
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/RAM_module_SDRAM.jpg/800px-RAM_module_SDRAM.jpg',
      title: 'Random Access Memory (RAM)',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:RAM_module_SDRAM.jpg',
      sourceName: 'Wikimedia Commons',
    },
  ],
};

/**
 * Asynchronously verifies whether an image URL actually exists and loads without error.
 */
function verifyImageUrl(url: string, timeoutMs: number = 3500): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let timer: any = null;

    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };

    timer = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, timeoutMs);

    img.src = url;
  });
}

/**
 * Queries Wikimedia Commons API for dynamic image searches.
 */
async function searchWikimediaCommons(query: string, maxCount: number): Promise<Array<{ title: string; imageUrl: string; sourceUrl: string; sourceName: string }>> {
  try {
    const cleanQuery = encodeURIComponent(query.trim());
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${cleanQuery}&gsrnamespace=6&prop=imageinfo&iiprop=url|mime&gsrlimit=${maxCount * 2}&format=json&origin=*`;

    const response = await fetch(apiUrl);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.query || !data.query.pages) return [];

    const pages = Object.values(data.query.pages) as Array<any>;
    const results: Array<{ title: string; imageUrl: string; sourceUrl: string; sourceName: string }> = [];

    for (const page of pages) {
      if (page.imageinfo && page.imageinfo[0]) {
        const info = page.imageinfo[0];
        const mime = info.mime || '';
        const url = info.url || '';

        if (url && (mime.startsWith('image/jpeg') || mime.startsWith('image/png') || mime.startsWith('image/webp') || mime.startsWith('image/gif'))) {
          const rawTitle = page.title ? page.title.replace(/^File:/i, '').replace(/\.[^/.]+$/, '').replace(/_/g, ' ') : query;
          const wikiFilePage = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`;
          results.push({
            imageUrl: url,
            title: rawTitle,
            sourceUrl: wikiFilePage,
            sourceName: 'Wikimedia Commons',
          });
        }
      }
      if (results.length >= maxCount) break;
    }

    return results;
  } catch (err) {
    console.warn('[ImageSearchService] Wikimedia search error:', err);
    return [];
  }
}

export const imageSearchService = {
  /**
   * Main function to search real, verified images returning structured ImageSearchResult objects.
   */
  async searchRealImages(query: string, maxCount: number = 2): Promise<ImageSearchResult[]> {
    const lowerQuery = query.toLowerCase().trim();
    const googleSearchUrl = buildGoogleImagesUrl(query);
    const rawMatches: Array<{ title: string; imageUrl: string; sourceUrl: string; sourceName: string }> = [];

    // 1. Check curated database first
    for (const [key, items] of Object.entries(CURATED_IMAGE_DATABASE)) {
      if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
        rawMatches.push(...items);
        break;
      }
    }

    // 2. Dynamic Wikimedia Commons API search if curated items are insufficient
    if (rawMatches.length < maxCount) {
      const dynamicItems = await searchWikimediaCommons(query, maxCount - rawMatches.length);
      rawMatches.push(...dynamicItems);
    }

    // 3. Verify each image URL asynchronously
    const verifiedResults: ImageSearchResult[] = [];
    for (const item of rawMatches) {
      const isValid = await verifyImageUrl(item.imageUrl);
      if (isValid) {
        verifiedResults.push({
          title: item.title,
          imageUrl: item.imageUrl,
          sourceUrl: item.sourceUrl,
          sourceName: item.sourceName || 'Wikimedia Commons',
          googleSearchUrl,
        });
      }
      if (verifiedResults.length >= maxCount) break;
    }

    return verifiedResults;
  },
};
