import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod/v4';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      // Подробное логирование входящих данных
      console.log('=== ZodValidationPipe Debug ===');
      console.log('1. Входящие данные:');
      console.log('   - value:', value);
      console.log('   - typeof value:', typeof value);
      console.log('   - value === null:', value === null);
      console.log('   - value === undefined:', value === undefined);
      console.log('   - Array.isArray(value):', Array.isArray(value));
      
      if (typeof value === 'object' && value !== null) {
        console.log('   - Object.keys(value):', Object.keys(value));
        console.log('   - value.constructor.name:', value.constructor?.name);
        console.log('   - JSON.stringify(value):', JSON.stringify(value));
      }
      
      console.log('2. Metadata:');
      console.log('   - metadata.type:', metadata.type);
      console.log('   - metadata.metatype:', metadata.metatype);
      console.log('   - metadata.data:', metadata.data);
      
      // Если value является строкой, пытаемся распарсить её как JSON
      let parsedValue = value;
      if (typeof value === 'string' && metadata.type === 'body') {
        console.log('3. Попытка парсинга строки как JSON...');
        try {
          parsedValue = JSON.parse(value);
          console.log('   - Парсинг успешен:', parsedValue);
        } catch (e) {
          console.log('   - Ошибка парсинга:', e.message);
          // Если не удалось распарсить, используем исходное значение
        }
      } else {
        console.log('3. Парсинг не требуется (не строка или не body)');
        parsedValue = value;
      }
      
      console.log('4. Данные для валидации:');
      console.log('   - parsedValue:', parsedValue);
      if (typeof parsedValue === 'object' && parsedValue !== null) {
        console.log('   - Ключи parsedValue:', Object.keys(parsedValue));
        console.log('   - Значения ключей:', Object.keys(parsedValue).reduce((acc, key) => {
          acc[key] = {
            value: parsedValue[key],
            type: typeof parsedValue[key],
            isNull: parsedValue[key] === null,
            isUndefined: parsedValue[key] === undefined
          };
          return acc;
        }, {}));
      }
      
      console.log('5. Начало валидации через Zod...');
      const validatedValue = this.schema.parse(parsedValue);
      console.log('6. Валидация успешна:', validatedValue);
      console.log('=== Конец ZodValidationPipe Debug ===\n');
      
      return validatedValue;
    } catch (error) {
      console.log('=== Ошибка валидации ===');
      if (error instanceof ZodError) {
        console.log('ZodError details:');
        console.log('   - Количество ошибок:', error.issues.length);
        console.log('   - Все ошибки:');
        error.issues.forEach((issue, index) => {
          console.log(`   ${index + 1}. Path: [${issue.path.join('.')}]`);
          console.log(`      Code: ${issue.code}`);
          console.log(`      Message: ${issue.message}`);
          console.log(`      Received:`, issue.input);
        });
        
        const errorMessages = error.issues.map((err) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        
        console.log('=== Конец ошибки валидации ===\n');
        throw new BadRequestException({
          message: 'Ошибка валидации',
          errors: errorMessages,
        });
      }
      console.log('Неизвестная ошибка:', error);
      console.log('=== Конец ошибки валидации ===\n');
      throw new BadRequestException('Ошибка валидации');
    }
  }
}

