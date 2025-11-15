import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod/v4';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      // Если value является строкой, пытаемся распарсить её как JSON
      let parsedValue = value;
      if (typeof value === 'string' && metadata.type === 'body') {
        try {
          parsedValue = JSON.parse(value);
        } catch (e) {
          // Если не удалось распарсить, используем исходное значение
        }
      }
      
      const validatedValue = this.schema.parse(parsedValue);
      return validatedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((err) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        throw new BadRequestException({
          message: 'Ошибка валидации',
          errors: errorMessages,
        });
      }
      throw new BadRequestException('Ошибка валидации');
    }
  }
}

