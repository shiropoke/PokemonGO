import { describe, expect, it } from 'vitest';
import {
  CONTACT_FORM_ENDPOINT,
  CONTACT_SUBMIT_TIMEOUT_MS,
  parseContactResponseMessage,
  validateContactForm,
} from './contact';

describe('contact form validation', () => {
  it('種別未選択と9文字以下の本文を拒否する', () => {
    expect(validateContactForm({ category: '', email: '', message: '123456789' }))
      .toEqual({
        category: 'お問い合わせ種別を選択してください。',
        message: 'お問い合わせ内容を10文字以上入力してください。',
      });
  });

  it('本文10文字以上かつメール未入力を受け付ける', () => {
    expect(validateContactForm({
      category: '不具合報告',
      email: '',
      message: '1234567890',
    })).toEqual({});
  });

  it('不正なメールアドレスを拒否する', () => {
    expect(validateContactForm({
      category: '機能の要望',
      email: 'invalid-address',
      message: 'この機能を追加してほしいです。',
    }).email).toBe('メールアドレスの形式を確認してください。');
  });
});

describe('contact response message', () => {
  it('正しいsuccess/error応答だけを受け付ける', () => {
    expect(parseContactResponseMessage({ source: 'go-scope-contact', status: 'ok' }))
      .toEqual({ source: 'go-scope-contact', status: 'ok' });
    expect(parseContactResponseMessage({ source: 'go-scope-contact', status: 'error' }))
      .toEqual({ source: 'go-scope-contact', status: 'error' });
  });

  it('source違い・status違い・非objectを無視する', () => {
    expect(parseContactResponseMessage({ source: 'other', status: 'ok' })).toBeNull();
    expect(parseContactResponseMessage({ source: 'go-scope-contact', status: 'unknown' }))
      .toBeNull();
    expect(parseContactResponseMessage('ok')).toBeNull();
  });
});

it('指定GAS endpointと15秒timeoutを一元管理する', () => {
  const endpoint = new URL(CONTACT_FORM_ENDPOINT);
  expect(endpoint.protocol).toBe('https:');
  expect(endpoint.hostname).toBe('script.google.com');
  expect(endpoint.pathname).toMatch(/^\/macros\/s\/.+\/exec$/);
  expect(CONTACT_SUBMIT_TIMEOUT_MS).toBe(15_000);
});
