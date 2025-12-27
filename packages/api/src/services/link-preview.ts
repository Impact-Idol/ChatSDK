/**
 * Link Preview Service
 * Fetches OpenGraph metadata and video embed information
 */

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  video?: {
    url: string;
    type?: string;
    width?: number;
    height?: number;
    embedUrl?: string;
  };
}

/**
 * Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Check if URL is a YouTube video
 */
function isYouTubeUrl(url: string): { videoId: string } | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { videoId: match[1] };
    }
  }

  return null;
}

/**
 * Check if URL is a Vimeo video
 */
function isVimeoUrl(url: string): { videoId: string } | null {
  const pattern = /vimeo\.com\/(?:video\/)?(\d+)/;
  const match = url.match(pattern);
  if (match) {
    return { videoId: match[1] };
  }
  return null;
}

/**
 * Generate YouTube embed preview
 */
function generateYouTubePreview(url: string, videoId: string): LinkPreview {
  return {
    url,
    title: `YouTube Video: ${videoId}`,
    description: 'YouTube video',
    image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    siteName: 'YouTube',
    video: {
      url,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      type: 'video/mp4',
      width: 1280,
      height: 720,
    },
  };
}

/**
 * Generate Vimeo embed preview
 */
function generateVimeoPreview(url: string, videoId: string): LinkPreview {
  return {
    url,
    title: `Vimeo Video: ${videoId}`,
    description: 'Vimeo video',
    siteName: 'Vimeo',
    video: {
      url,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      type: 'video/mp4',
    },
  };
}

/**
 * Fetch OpenGraph metadata from URL
 */
async function fetchOpenGraphData(url: string): Promise<Partial<LinkPreview>> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChatSDK LinkPreview/1.0)',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.statusText}`);
      return {};
    }

    const html = await response.text();

    // Parse OpenGraph tags
    const ogTags: Record<string, string> = {};

    const metaTagRegex = /<meta\s+(?:property|name)="(og:[^"]+)"\s+content="([^"]+)"/gi;
    let match;

    while ((match = metaTagRegex.exec(html)) !== null) {
      ogTags[match[1]] = match[2];
    }

    // Also check for standard meta tags
    const standardMetaRegex = /<meta\s+name="([^"]+)"\s+content="([^"]+)"/gi;
    while ((match = standardMetaRegex.exec(html)) !== null) {
      if (match[1] === 'description' && !ogTags['og:description']) {
        ogTags['og:description'] = match[2];
      }
    }

    // Also try to get title from <title> tag
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = ogTags['og:title'] || (titleMatch ? titleMatch[1] : undefined);

    return {
      url,
      title,
      description: ogTags['og:description'],
      image: ogTags['og:image'],
      siteName: ogTags['og:site_name'],
      video: ogTags['og:video']
        ? {
            url: ogTags['og:video'],
            type: ogTags['og:video:type'],
            width: ogTags['og:video:width'] ? parseInt(ogTags['og:video:width']) : undefined,
            height: ogTags['og:video:height'] ? parseInt(ogTags['og:video:height']) : undefined,
          }
        : undefined,
    };
  } catch (error) {
    console.error(`Error fetching OpenGraph data for ${url}:`, error);
    return {};
  }
}

/**
 * Generate link preview for a URL
 */
export async function generateLinkPreview(url: string): Promise<LinkPreview> {
  // Check for YouTube
  const youtubeMatch = isYouTubeUrl(url);
  if (youtubeMatch) {
    const preview = generateYouTubePreview(url, youtubeMatch.videoId);
    // Try to fetch more metadata from OpenGraph
    const ogData = await fetchOpenGraphData(url);
    return {
      ...preview,
      title: ogData.title || preview.title,
      description: ogData.description || preview.description,
    };
  }

  // Check for Vimeo
  const vimeoMatch = isVimeoUrl(url);
  if (vimeoMatch) {
    const preview = generateVimeoPreview(url, vimeoMatch.videoId);
    // Try to fetch more metadata from OpenGraph
    const ogData = await fetchOpenGraphData(url);
    return {
      ...preview,
      title: ogData.title || preview.title,
      description: ogData.description || preview.description,
      image: ogData.image,
    };
  }

  // Generic URL - fetch OpenGraph data
  const ogData = await fetchOpenGraphData(url);
  return {
    url,
    ...ogData,
  } as LinkPreview;
}

/**
 * Generate previews for all URLs in text
 */
export async function generateLinkPreviews(text: string): Promise<LinkPreview[]> {
  const urls = extractUrls(text);

  // Limit to first 3 URLs to avoid performance issues
  const limitedUrls = urls.slice(0, 3);

  const previews = await Promise.allSettled(limitedUrls.map(generateLinkPreview));

  return previews
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<LinkPreview>).value);
}
