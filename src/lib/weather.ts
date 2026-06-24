export type WeatherResult = {
  temperature: number
  weatherCode: number
  weatherLabel: string
  weatherType: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
}

function parseWeatherCode(code: number): { label: string; type: WeatherResult['weatherType'] } {
  if (code === 0)   return { label: '快晴',     type: 'sunny'  }
  if (code <= 3)    return { label: '晴れ',     type: 'sunny'  }
  if (code <= 48)   return { label: '曇り',     type: 'cloudy' }
  if (code <= 67)   return { label: '雨',       type: 'rainy'  }
  if (code <= 77)   return { label: '雪',       type: 'snowy'  }
  if (code <= 82)   return { label: 'にわか雨', type: 'rainy'  }
  return { label: '荒天', type: 'rainy' }
}

export async function fetchWeatherByLocation(
  latitude: number,
  longitude: number
): Promise<WeatherResult> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude',      String(latitude))
  url.searchParams.set('longitude',     String(longitude))
  url.searchParams.set('current',       'temperature_2m,weather_code')
  url.searchParams.set('timezone',      'Asia/Tokyo')
  url.searchParams.set('forecast_days', '1')

  const res  = await fetch(url.toString())
  const data = await res.json()

  const temperature = Math.round(data.current.temperature_2m * 10) / 10
  const weatherCode = data.current.weather_code
  const { label, type } = parseWeatherCode(weatherCode)

  return { temperature, weatherCode, weatherLabel: label, weatherType: type }
}

export function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => reject(err),
      { timeout: 10000, maximumAge: 300000 }
    )
  })
}
