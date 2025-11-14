import { Controller, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExperienceService } from './experience.service';
import { AddExperienceDto } from './dto/add-experience.dto';

@ApiTags('Опыт')
@Controller('experience')
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Patch(':userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить опыт пользователю' })
  @ApiResponse({
    status: 200,
    description: 'Опыт успешно добавлен, уровень обновлен',
    schema: {
      type: 'object',
      properties: {
        level: { type: 'number', example: 3 },
        experience: { type: 'number', example: 300 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async addExperience(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() addExperienceDto: AddExperienceDto,
  ) {
    return this.experienceService.addExperience(userId, addExperienceDto.amount);
  }
}

