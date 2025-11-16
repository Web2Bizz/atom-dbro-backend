import { Injectable } from '@nestjs/common';
import { AVATAR_EMOJIS } from './avatar.constants';

interface PaletteColor {
  primaryColor: string;
  foreignColor: string;
}

interface PaletteResponse {
  items: Array<{
    primaryColor: string;
    foreignColor: string;
  }>;
}

interface GenerateAvatarResponse {
  id?: string;
  url?: string;
  imageUrl?: string;
  image_url?: string;
  avatarUrl?: string;
  avatar_url?: string;
  createdAt?: string;
  version?: string;
  [key: string]: any; // Для поддержки других возможных форматов
}

@Injectable()
export class AvatarService {
  private readonly API_BASE_URL = 'http://82.202.140.37:12745';
  private paletteCache: PaletteColor[] | null = null;
  private paletteCacheTime: number = 0;
  private readonly PALETTE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

  /**
   * Получает палитру цветов с кешированием
   */
  private async getPalette(): Promise<PaletteColor[]> {
    const now = Date.now();
    
    // Проверяем кеш
    if (this.paletteCache && (now - this.paletteCacheTime) < this.PALETTE_CACHE_TTL) {
      return this.paletteCache;
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/api/v1/palettes?pick=30&offset=0`, {
        method: 'GET',
        headers: {
          'accept': '*/*',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch palette: ${response.status} ${response.statusText}. Response: ${errorText}`);
      }

      const data: PaletteResponse = await response.json();
      
      if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
        console.warn('Invalid palette response, using default palette');
        return [
          { primaryColor: '#3B82F6', foreignColor: '#EF4444' },
          { primaryColor: '#10B981', foreignColor: '#F59E0B' },
          { primaryColor: '#8B5CF6', foreignColor: '#EC4899' },
        ];
      }

      this.paletteCache = data.items.map(p => ({
        primaryColor: p.primaryColor,
        foreignColor: p.foreignColor,
      }));
      this.paletteCacheTime = now;

      return this.paletteCache;
    } catch (error) {
      console.error('Error fetching palette:', error);
      // Возвращаем дефолтную палитру при ошибке
      return [
        { primaryColor: '#3B82F6', foreignColor: '#EF4444' },
        { primaryColor: '#10B981', foreignColor: '#F59E0B' },
        { primaryColor: '#8B5CF6', foreignColor: '#EC4899' },
      ];
    }
  }

  /**
   * Генерирует аватарку для пользователя
   * @returns Объект с URL для размеров 4-9
   */
  async generateAvatar(): Promise<Record<number, string>> {
    const palettes = await this.getPalette();
    const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];
    const randomEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
    const randomAngle = Math.floor(Math.random() * 361); // 0-360

    try {
      const response = await fetch(`${this.API_BASE_URL}/api/v3/generate`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emoji: randomEmoji,
          backgroundType: 'linear',
          primaryColor: randomPalette.primaryColor,
          foreignColor: randomPalette.foreignColor,
          angle: randomAngle,
          emojiSize: 'medium',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to generate avatar: ${response.status} ${response.statusText}. Response: ${errorText}`);
      }

      const responseText = await response.text();
      console.log('Avatar API response text:', responseText);
      
      let data: GenerateAvatarResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse avatar API response as JSON:', parseError);
        console.error('Response text:', responseText);
        throw new Error(`Invalid JSON response from avatar API: ${responseText.substring(0, 200)}`);
      }
      
      console.log('Parsed avatar API response:', JSON.stringify(data, null, 2));
      
      // Проверяем различные возможные форматы ответа
      let avatarUrl: string | undefined;
      
      // Если ответ - это просто строка URL
      if (typeof data === 'string') {
        avatarUrl = data;
      }
      // Если ответ - это объект
      else if (data && typeof data === 'object') {
        // Проверяем поле url
        if ('url' in data && typeof data.url === 'string') {
          avatarUrl = data.url;
        }
        // Проверяем другие возможные варианты
        else if ('imageUrl' in data && typeof data.imageUrl === 'string') {
          avatarUrl = data.imageUrl;
        }
        else if ('image_url' in data && typeof data.image_url === 'string') {
          avatarUrl = data.image_url;
        }
        else if ('avatarUrl' in data && typeof data.avatarUrl === 'string') {
          avatarUrl = data.avatarUrl;
        }
        else if ('avatar_url' in data && typeof data.avatar_url === 'string') {
          avatarUrl = data.avatar_url;
        }
        // Если API возвращает ID, делаем дополнительный запрос для получения URL
        else if ('id' in data && typeof data.id === 'string' && data.id.trim() !== '') {
          try {
            // Пробуем получить URL через GET запрос к /api/v3/{id}
            const getResponse = await fetch(`${this.API_BASE_URL}/api/v3/${data.id}`, {
              method: 'GET',
              headers: {
                'accept': '*/*',
              },
            });

            if (getResponse.ok) {
              const getData = await getResponse.json();
              console.log('Avatar GET response:', JSON.stringify(getData, null, 2));
              
              // Проверяем различные поля в ответе
              if (getData && typeof getData === 'object') {
                if ('url' in getData && typeof getData.url === 'string') {
                  avatarUrl = getData.url;
                } else if ('imageUrl' in getData && typeof getData.imageUrl === 'string') {
                  avatarUrl = getData.imageUrl;
                } else if ('image_url' in getData && typeof getData.image_url === 'string') {
                  avatarUrl = getData.image_url;
                }
              }
            }
            
            // Если не получили URL из GET запроса, формируем URL на основе ID
            // Возможные варианты: /api/v3/{id}, /api/v3/{id}/image, /api/v3/images/{id}
            if (!avatarUrl) {
              // Пробуем разные варианты формирования URL
              const possibleUrls = [
                `${this.API_BASE_URL}/api/v3/${data.id}/image`,
                `${this.API_BASE_URL}/api/v3/images/${data.id}`,
                `${this.API_BASE_URL}/api/v3/${data.id}`,
              ];
              
              // Используем первый вариант как основной
              avatarUrl = possibleUrls[0];
              console.log(`Generated avatar URL from ID: ${avatarUrl}`);
            }
          } catch (fetchError) {
            console.error('Error fetching avatar URL by ID:', fetchError);
            // В случае ошибки все равно формируем URL на основе ID
            avatarUrl = `${this.API_BASE_URL}/api/v3/${data.id}`;
            console.log(`Fallback: Generated avatar URL from ID: ${avatarUrl}`);
          }
        }
      }
      
      if (!avatarUrl || typeof avatarUrl !== 'string' || avatarUrl.trim() === '') {
        console.error('Avatar API response structure:', data);
        throw new Error(`Invalid response from avatar API: missing or empty URL. Response structure: ${JSON.stringify(data)}`);
      }

      const baseUrl = avatarUrl.trim();

      // Формируем объект с URL для размеров 4-9
      // Предполагаем, что API возвращает базовый URL, который можно использовать для разных размеров
      // Если API возвращает URL с параметром размера, нужно будет адаптировать логику
      const avatarUrls: Record<number, string> = {};
      
      // Если API возвращает URL с возможностью указать размер через параметр
      // Или если нужно делать отдельные запросы для каждого размера
      // Пока используем один URL для всех размеров (можно будет адаптировать позже)
      for (let size = 4; size <= 9; size++) {
        avatarUrls[size] = baseUrl;
      }

      if (Object.keys(avatarUrls).length === 0) {
        throw new Error('Failed to create avatar URLs object');
      }

      return avatarUrls;
    } catch (error) {
      console.error('Error generating avatar:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
        });
        throw error;
      }
      throw new Error(`Failed to generate avatar: ${String(error)}`);
    }
  }
}

