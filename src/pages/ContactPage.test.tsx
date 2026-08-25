import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CONTACT_FORM_ENDPOINT, CONTACT_IFRAME_NAME } from '../services/contact';
import { ContactPage } from './ContactPage';

describe('ContactPage', () => {
  it('GASへhidden iframe POSTするフォーム項目を表示する', () => {
    const markup = renderToStaticMarkup(<ContactPage onNavigate={() => undefined} />);

    expect(markup).toContain(`action="${CONTACT_FORM_ENDPOINT.replaceAll('&', '&amp;')}"`);
    expect(markup).toContain('method="POST"');
    expect(markup).toContain(`target="${CONTACT_IFRAME_NAME}"`);
    expect(markup).toContain(`name="${CONTACT_IFRAME_NAME}"`);
    for (const name of ['category', 'email', 'message', 'pageUrl', 'userAgent', 'website']) {
      expect(markup).toContain(`name="${name}"`);
    }
  });

  it('入力制約、honeypot、プライバシーポリシー導線を持つ', () => {
    const markup = renderToStaticMarkup(<ContactPage onNavigate={() => undefined} />);

    expect(markup).toContain('maxLength="254"');
    expect(markup).toContain('minLength="10"');
    expect(markup).toContain('maxLength="2000"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain('autoComplete="off"');
    expect(markup).toContain('href="#/privacy"');
    expect(markup).toContain('送信する');
  });
});
