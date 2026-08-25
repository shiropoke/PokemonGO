import type { NavigationQuery, Page } from '../types/navigation';
import { InternalLink } from './InternalLink';

interface LegalFooterProps {
  onNavigate(page: Page, query?: NavigationQuery): void;
}

export function LegalFooter({ onNavigate }: LegalFooterProps) {
  return (
    <nav className="legal-footer" aria-label="サイトポリシー">
      <InternalLink page="terms" onNavigate={onNavigate}>利用規約</InternalLink>
      <span aria-hidden="true">｜</span>
      <InternalLink page="privacy" onNavigate={onNavigate}>プライバシーポリシー</InternalLink>
      <span aria-hidden="true">｜</span>
      <InternalLink page="contact" onNavigate={onNavigate}>お問い合わせ</InternalLink>
    </nav>
  );
}
