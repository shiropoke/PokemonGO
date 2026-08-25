import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { InternalLink } from '../components/InternalLink';
import {
  CONTACT_CATEGORIES,
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_FORM_ENDPOINT,
  CONTACT_IFRAME_NAME,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  CONTACT_SUBMIT_TIMEOUT_MS,
  parseContactResponseMessage,
  validateContactForm,
} from '../services/contact';
import type { NavigationQuery, Page } from '../types/navigation';

interface ContactPageProps {
  onNavigate(page: Page, query?: NavigationQuery): void;
}

interface SubmissionFeedback {
  kind: 'success' | 'error';
  title: string;
  description?: string;
}

export function ContactPage({ onNavigate }: ContactPageProps) {
  const [category, setCategory] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof validateContactForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<SubmissionFeedback | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const submittingRef = useRef(false);

  const clearSubmissionTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setSubmittingState = useCallback((value: boolean) => {
    submittingRef.current = value;
    setSubmitting(value);
  }, []);

  const finishSubmission = useCallback((status: 'ok' | 'error') => {
    if (!submittingRef.current) return;

    clearSubmissionTimeout();
    setSubmittingState(false);

    if (status === 'ok') {
      setCategory('');
      setEmail('');
      setMessage('');
      setWebsite('');
      setErrors({});
      setFeedback({
        kind: 'success',
        title: 'お問い合わせを送信しました',
        description: 'お問い合わせありがとうございます。内容を確認いたします。',
      });
      return;
    }

    setFeedback({
      kind: 'error',
      title: 'お問い合わせを送信できませんでした。',
      description: '時間をおいてもう一度お試しください。',
    });
  }, [clearSubmissionTimeout, setSubmittingState]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const response = parseContactResponseMessage(event.data);
      if (!response || !submittingRef.current) return;

      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;

      finishSubmission(response.status);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [finishSubmission]);

  useEffect(() => () => clearSubmissionTimeout(), [clearSubmissionTimeout]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }

    const validationErrors = validateContactForm({ category, email, message });
    setErrors(validationErrors);
    setFeedback(null);

    if (Object.keys(validationErrors).length > 0) {
      event.preventDefault();
      return;
    }

    setSubmittingState(true);
    clearSubmissionTimeout();
    timeoutRef.current = window.setTimeout(() => {
      if (!submittingRef.current) return;
      setSubmittingState(false);
      setFeedback({
        kind: 'error',
        title: '送信結果を確認できませんでした。',
        description: '通信状況を確認して、もう一度お試しください。',
      });
    }, CONTACT_SUBMIT_TIMEOUT_MS);
  };

  const pageUrl = typeof window === 'undefined' ? '' : window.location.href;
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;

  return (
    <section className="contact-page" aria-labelledby="contact-page-title">
      <header className="contact-page__heading">
        <span>サポート</span>
        <h1 id="contact-page-title">お問い合わせ</h1>
        <p>GO Scopeに関する不具合、機能の要望、情報の誤りなどを送信できます。</p>
      </header>

      <div className="contact-form-card">
        {feedback ? (
          <div
            className={`contact-feedback contact-feedback--${feedback.kind}`}
            role={feedback.kind === 'success' ? 'status' : 'alert'}
            aria-live="polite"
          >
            <strong>{feedback.title}</strong>
            {feedback.description ? <p>{feedback.description}</p> : null}
            {feedback.kind === 'success' ? (
              <button type="button" onClick={() => setFeedback(null)}>
                別のお問い合わせを送る
              </button>
            ) : null}
          </div>
        ) : null}

        <form
          className="contact-form"
          action={CONTACT_FORM_ENDPOINT}
          method="POST"
          target={CONTACT_IFRAME_NAME}
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="contact-field">
            <label htmlFor="contact-category">
              <span>お問い合わせ種別</span>
              <span className="contact-required">必須</span>
            </label>
            <select
              id="contact-category"
              name="category"
              value={category}
              required
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? 'contact-category-error' : undefined}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">選択してください</option>
              {CONTACT_CATEGORIES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.category ? (
              <p id="contact-category-error" className="contact-field__error">
                {errors.category}
              </p>
            ) : null}
          </div>

          <div className="contact-field">
            <label htmlFor="contact-email">メールアドレス</label>
            <p id="contact-email-hint" className="contact-field__hint">
              返信を希望する場合のみ入力してください。
            </p>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={CONTACT_EMAIL_MAX_LENGTH}
              value={email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={`contact-email-hint${errors.email ? ' contact-email-error' : ''}`}
              onChange={(event) => setEmail(event.target.value)}
            />
            {errors.email ? (
              <p id="contact-email-error" className="contact-field__error">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="contact-field">
            <label htmlFor="contact-message">
              <span>お問い合わせ内容</span>
              <span className="contact-required">必須</span>
            </label>
            <textarea
              id="contact-message"
              name="message"
              minLength={CONTACT_MESSAGE_MIN_LENGTH}
              maxLength={CONTACT_MESSAGE_MAX_LENGTH}
              value={message}
              required
              rows={9}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={`contact-message-count${errors.message ? ' contact-message-error' : ''}`}
              onChange={(event) => setMessage(event.target.value)}
            />
            <div className="contact-field__meta">
              {errors.message ? (
                <p id="contact-message-error" className="contact-field__error">
                  {errors.message}
                </p>
              ) : <span />}
              <output id="contact-message-count" htmlFor="contact-message">
                {message.length} / {CONTACT_MESSAGE_MAX_LENGTH}
              </output>
            </div>
          </div>

          <div className="contact-form__honeypot" aria-hidden="true">
            <label htmlFor="contact-website">ウェブサイト</label>
            <input
              id="contact-website"
              name="website"
              type="text"
              value={website}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          <input type="hidden" name="pageUrl" value={pageUrl} />
          <input type="hidden" name="userAgent" value={userAgent} />

          <p className="contact-form__privacy-note">
            送信することで、入力された情報は
            <InternalLink page="privacy" onNavigate={onNavigate}>
              プライバシーポリシー
            </InternalLink>
            に従って取り扱われます。
          </p>

          <button className="contact-form__submit" type="submit" disabled={submitting}>
            {submitting ? '送信中…' : '送信する'}
          </button>
        </form>
      </div>

      <iframe
        ref={iframeRef}
        name={CONTACT_IFRAME_NAME}
        title="お問い合わせ送信"
        hidden
      />
    </section>
  );
}

export default ContactPage;
