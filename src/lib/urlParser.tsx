import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s)<>]+)/g;

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
