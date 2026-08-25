import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import type { NavigationQuery, Page } from '../types/navigation';
import { getPageHash } from '../types/navigation';

interface InternalLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> {
  page: Page;
  query?: NavigationQuery;
  onNavigate(page: Page, query?: NavigationQuery): void;
  children: ReactNode;
}

export function InternalLink({
  page,
  query,
  onNavigate,
  children,
  target,
  ...props
}: InternalLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || (target && target !== '_self')
    ) {
      return;
    }

    event.preventDefault();
    onNavigate(page, query);
  };

  return (
    <a
      {...props}
      href={getPageHash(page, query)}
      target={target}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
