import React from 'react';
import { Play, ExternalLink } from 'lucide-react';

const URL_REGEX = /(https?:\/\/[^\s)<>]+)/g;

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'wistia.com', 'dailymotion.com'];

function isVideoUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return VIDEO_HOSTS.some(h => hostname.includes(h));
  } catch {
    return false;
  }
}

export function parseTextWithLinks(text: string, className?: string): React.ReactNode {
  const parts = text.split(URL_REGEX);
  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={className || 'text-primary underline underline-offset-2 hover:text-primary/80'}
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

/** Extract all URLs from text and return as link button descriptors */
export function extractLinkButtons(text: string | null | undefined): { url: string; isVideo: boolean }[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return matches.map(url => ({ url, isVideo: isVideoUrl(url) }));
}

/** Render extracted link buttons */
export function LinkButtons({ links }: { links: { url: string; isVideo: boolean }[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {links.map((link, i) =>
        link.isVideo ? (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Play className="h-3 w-3" />
            WATCH DEMO
          </a>
        ) : (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 px-3 py-1.5 text-[11px] font-bold tracking-wider text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            OPEN RESOURCE
          </a>
        )
      )}
    </div>
  );
}
