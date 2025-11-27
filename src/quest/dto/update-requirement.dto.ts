import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const updateRequirementSchema = z.object({
  currentValue: z.number().int().min(0, 'currentValue должен быть неотрицательным числом').optional(),
});

export type UpdateRequirementDto = z.infer<typeof updateRequirementSchema>;

export class UpdateRequirementDtoClass {
  @ApiProperty({ 
    description: 'Новое значение currentValue (опционально, если не указано, будет вычислено автоматически как сумма contribute_value из quest_step_volunteers)', 
    example: 5, 
    minimum: 0,
    required: false
  })
  currentValue?: number;
}

