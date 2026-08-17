import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from './url';

describe('safeExternalUrl', () => {
  it('allows HTTP(S) links only', () => {
    expect(safeExternalUrl('https://leekduck.com/events/')).toBe('https://leekduck.com/events/');
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('not a url')).toBeNull();
  });
});
