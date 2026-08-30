import { describe, expect, it } from 'vitest';
import { getWeatherDisplay } from './weather';

describe('getWeatherDisplay', () => {
  it.each([
    ['rainy', '雨'],
    ['partly cloudy', 'ときどき曇り'],
    ['snow', '雪'],
    ['fog', '霧'],
  ])('converts %s to its Japanese label', (weather, label) => {
    const display = getWeatherDisplay(weather);

    expect(display.label).toBe(label);
    expect(display.icon).not.toBeNull();
  });

  it('keeps multiple weather entries independently displayable', () => {
    expect(['rainy', 'windy'].map(getWeatherDisplay)).toEqual([
      expect.objectContaining({ label: '雨' }),
      expect.objectContaining({ label: '風' }),
    ]);
  });

  it('keeps an unknown weather value as text without an icon', () => {
    expect(getWeatherDisplay('mysterious weather')).toEqual({
      label: 'mysterious weather',
      icon: null,
    });
  });
});
