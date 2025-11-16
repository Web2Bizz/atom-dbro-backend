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
  url: string;
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
        throw new Error(`Failed to fetch palette: ${response.status}`);
      }

      const data: PaletteResponse = await response.json();
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
        throw new Error(`Failed to generate avatar: ${response.status}`);
      }

      const data: GenerateAvatarResponse = await response.json();
      const baseUrl = data.url;

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

      return avatarUrls;
    } catch (error) {
      console.error('Error generating avatar:', error);
      throw new Error('Failed to generate avatar');
    }
  }
}

