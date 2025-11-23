import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod/v4';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    // Применяем валидацию только к body параметрам
    if (metadata.type !== 'body') {
      return value;
    }

    // Если value - строка, пытаемся распарсить как JSON
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (parseError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: ['Invalid JSON format'],
          details: [{
            expected: 'object',
            code: 'invalid_type',
            path: [],
            message: 'Invalid JSON format',
          }],
        });
      }
    }

    // Проверяем, что после парсинга получился объект (не null и не массив)
    // Для схемы обновления пользователя мы ожидаем объект, а не массив
    if (value === null || typeof value !== 'object') {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: [`Invalid input: expected object, received ${typeof value}`],
        details: [{
          expected: 'object',
          code: 'invalid_type',
          path: [],
          message: `Invalid input: expected object, received ${typeof value}`,
        }],
      });
    }

    // Массивы тоже объекты в JS, но для body обычно ожидается plain object
    if (Array.isArray(value)) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: ['Invalid input: expected object, received array'],
        details: [{
          expected: 'object',
          code: 'invalid_type',
          path: [],
          message: 'Invalid input: expected object, received array',
        }],
      });
    }

    try {
      const validatedValue = this.schema.parse(value);
      return validatedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((err) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        throw new BadRequestException({
          message: 'Validation failed',
          errors: errorMessages,
          details: error.issues,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
