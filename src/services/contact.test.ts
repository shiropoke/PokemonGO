import { describe, expect, it } from 'vitest';
import {
  CONTACT_FORM_ENDPOINT,
  CONTACT_SUBMIT_TIMEOUT_MS,
  createContactSubmissionGate,
  isAllowedContactResponseOrigin,
  parseAllowedContactResponseMessage,
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

  it('Google Apps Script系のHTTPS originだけを許可する', () => {
    expect(isAllowedContactResponseOrigin('https://script.google.com')).toBe(true);
    expect(isAllowedContactResponseOrigin('https://script.googleusercontent.com')).toBe(true);
    expect(isAllowedContactResponseOrigin('https://example-script.googleusercontent.com'))
      .toBe(true);
    expect(isAllowedContactResponseOrigin('https://example.com')).toBe(false);
    expect(isAllowedContactResponseOrigin('https://script.google.com.example.com')).toBe(false);
    expect(isAllowedContactResponseOrigin('http://script.google.com')).toBe(false);
    expect(isAllowedContactResponseOrigin('not-an-origin')).toBe(false);
  });

  it('正常なGoogle originとok/error payloadを組み合わせて受理する', () => {
    expect(parseAllowedContactResponseMessage(
      { source: 'go-scope-contact', status: 'ok' },
      'https://script.google.com',
    )).toEqual({ source: 'go-scope-contact', status: 'ok' });
    expect(parseAllowedContactResponseMessage(
      { source: 'go-scope-contact', status: 'error' },
      'https://example-script.googleusercontent.com',
    )).toEqual({ source: 'go-scope-contact', status: 'error' });
  });

  it('無関係なoriginや不正payloadを組み合わせ段階でも無視する', () => {
    expect(parseAllowedContactResponseMessage(
      { source: 'go-scope-contact', status: 'ok' },
      'https://example.com',
    )).toBeNull();
    expect(parseAllowedContactResponseMessage(
      { source: 'other', status: 'ok' },
      'https://script.google.com',
    )).toBeNull();
    expect(parseAllowedContactResponseMessage(
      { source: 'go-scope-contact', status: 'unknown' },
      'https://script.google.com',
    )).toBeNull();
  });
});

describe('contact submission gate', () => {
  it('ok/error相当のsettle後はtimeoutを発火させない', () => {
    let scheduledCallback: (() => void) | null = null;
    let cancelCount = 0;
    let timeoutCount = 0;
    const gate = createContactSubmissionGate(
      (callback) => {
        scheduledCallback = callback;
        return 1;
      },
      () => { cancelCount += 1; },
    );

    expect(gate.begin(() => { timeoutCount += 1; })).toBe(true);
    expect(gate.settle()).toBe(true);
    expect(gate.isPending()).toBe(false);
    expect(cancelCount).toBe(1);
    (scheduledCallback as (() => void) | null)?.();
    expect(timeoutCount).toBe(0);
  });

  it('15秒応答がなければtimeoutし、送信中の二重開始を拒否する', () => {
    let scheduledCallback: (() => void) | null = null;
    let scheduledDelay = 0;
    let timeoutCount = 0;
    const gate = createContactSubmissionGate((callback, delay) => {
      scheduledCallback = callback;
      scheduledDelay = delay;
      return 1;
    });

    expect(gate.begin(() => { timeoutCount += 1; })).toBe(true);
    expect(gate.begin(() => { timeoutCount += 1; })).toBe(false);
    expect(scheduledDelay).toBe(15_000);
    (scheduledCallback as (() => void) | null)?.();
    expect(timeoutCount).toBe(1);
    expect(gate.isPending()).toBe(false);
  });
});

it('指定GAS endpointと15秒timeoutを一元管理する', () => {
  const endpoint = new URL(CONTACT_FORM_ENDPOINT);
  expect(endpoint.protocol).toBe('https:');
  expect(endpoint.hostname).toBe('script.google.com');
  expect(endpoint.pathname).toMatch(/^\/macros\/s\/.+\/exec$/);
  expect(CONTACT_SUBMIT_TIMEOUT_MS).toBe(15_000);
});
