import weatherClearIcon from '../assets/weather/weather-clear.png';
import weatherCloudyIcon from '../assets/weather/weather-cloudy.png';
import weatherFogIcon from '../assets/weather/weather-fog.png';
import weatherPartlyCloudyIcon from '../assets/weather/weather-partly-cloudy.png';
import weatherRainyIcon from '../assets/weather/weather-rainy.png';
import weatherSnowIcon from '../assets/weather/weather-snow.png';
import weatherSunnyIcon from '../assets/weather/weather-sunny.png';
import weatherWindyIcon from '../assets/weather/weather-windy.png';

export interface WeatherDisplay {
  label: string;
  icon: string | null;
}

const WEATHER_DISPLAYS: Record<string, WeatherDisplay> = {
  sunny: { label: '晴れ', icon: weatherSunnyIcon },
  clear: { label: '快晴', icon: weatherClearIcon },
  rainy: { label: '雨', icon: weatherRainyIcon },
  'partly cloudy': { label: 'ときどき曇り', icon: weatherPartlyCloudyIcon },
  partlycloudy: { label: 'ときどき曇り', icon: weatherPartlyCloudyIcon },
  'partly-cloudy': { label: 'ときどき曇り', icon: weatherPartlyCloudyIcon },
  cloudy: { label: '曇り', icon: weatherCloudyIcon },
  windy: { label: '風', icon: weatherWindyIcon },
  snow: { label: '雪', icon: weatherSnowIcon },
  snowy: { label: '雪', icon: weatherSnowIcon },
  fog: { label: '霧', icon: weatherFogIcon },
  foggy: { label: '霧', icon: weatherFogIcon },
};

export function getWeatherDisplay(weather: string): WeatherDisplay {
  const normalized = weather.trim().toLowerCase().replace(/\s+/g, ' ');

  return WEATHER_DISPLAYS[normalized] ?? {
    label: weather.trim() || weather,
    icon: null,
  };
}
