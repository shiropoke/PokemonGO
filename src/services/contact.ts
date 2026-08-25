export const CONTACT_FORM_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbz1500UuLBVT60Egn5h0DB7JmbBzRx5dwshqGAyww7LThPJU5l_yOQ4iEdjRQcTHHj8tA/exec';

export const CONTACT_IFRAME_NAME = 'go-scope-contact-submit';
export const CONTACT_SUBMIT_TIMEOUT_MS = 15_000;
export const CONTACT_EMAIL_MAX_LENGTH = 254;
export const CONTACT_MESSAGE_MIN_LENGTH = 10;
export const CONTACT_MESSAGE_MAX_LENGTH = 2_000;

export const CONTACT_CATEGORIES = [
  '不具合報告',
  '機能の要望',
  '情報の誤り',
  'その他',
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export interface ContactFormValues {
  category: string;
  email: string;
  message: string;
}

export interface ContactFormErrors {
  category?: string;
  email?: string;
  message?: string;
}

export interface ContactResponseMessage {
  source: 'go-scope-contact';
  status: 'ok' | 'error';
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(values: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {};
  const email = values.email.trim();
  const messageLength = values.message.trim().length;

  if (!CONTACT_CATEGORIES.includes(values.category as ContactCategory)) {
    errors.category = 'お問い合わせ種別を選択してください。';
  }

  if (email.length > CONTACT_EMAIL_MAX_LENGTH || (email && !EMAIL_PATTERN.test(email))) {
    errors.email = 'メールアドレスの形式を確認してください。';
  }

  if (messageLength < CONTACT_MESSAGE_MIN_LENGTH) {
    errors.message = 'お問い合わせ内容を10文字以上入力してください。';
  } else if (values.message.length > CONTACT_MESSAGE_MAX_LENGTH) {
    errors.message = 'お問い合わせ内容は2000文字以内で入力してください。';
  }

  return errors;
}

export function parseContactResponseMessage(data: unknown): ContactResponseMessage | null {
  if (!data || typeof data !== 'object') return null;

  const candidate = data as Record<string, unknown>;
  if (
    candidate.source !== 'go-scope-contact'
    || (candidate.status !== 'ok' && candidate.status !== 'error')
  ) {
    return null;
  }

  return {
    source: 'go-scope-contact',
    status: candidate.status,
  };
}
