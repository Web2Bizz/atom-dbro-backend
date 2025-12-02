import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Version,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CheckinService } from './checkin.service';
import { GenerateCheckinTokenDto, generateCheckinTokenSchema, GenerateCheckinTokenDtoClass } from './dto/generate-checkin-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('Участие в квестах')
@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post('generate-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Version('1')
  @HttpCode(201)
  @ZodValidation(generateCheckinTokenSchema)
  @ApiOperation({ summary: 'Сгенерировать JWT токен для участия в квесте' })
  @ApiBody({ type: GenerateCheckinTokenDtoClass })
  @ApiResponse({ status: 201, description: 'Токен успешно сгенерирован' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Пользователь или квест не найден' })
  @ApiResponse({ status: 400, description: 'Некорректные данные или этап не найден' })
  async generateToken(
    @CurrentUser() user: { userId: number },
    @Body() dto: GenerateCheckinTokenDto,
  ) {
    return this.checkinService.generateToken(user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Version('1')
  @HttpCode(201)
  @ApiOperation({ 
    summary: 'Подтвердить участие в квесте по токену',
    description: 'Подтверждает участие пользователя в этапе квеста по JWT токену'
  })
  @ApiQuery({ 
    name: 'questId', 
    description: 'ID квеста', 
    type: Number,
    example: 1
  })
  @ApiQuery({ 
    name: 'type', 
    description: 'Тип этапа квеста', 
    enum: ['finance', 'material'],
    example: 'finance'
  })
  @ApiQuery({ 
    name: 'token', 
    description: 'JWT токен участия', 
    type: String,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiResponse({ status: 201, description: 'Участие успешно подтверждено' })
  @ApiResponse({ status: 401, description: 'Не авторизован или недействительный токен' })
  @ApiResponse({ status: 404, description: 'Квест, этап или пользователь не найден' })
  @ApiResponse({ status: 400, description: 'Некорректные данные или несоответствие токена' })
  @ApiResponse({ status: 409, description: 'Пользователь уже участвует в этом этапе' })
  async confirmCheckin(
    @CurrentUser() user: { userId: number },
    @Query('questId', ParseIntPipe) questId: number,
    @Query('type') type: 'finance' | 'material',
    @Query('token') token: string,
  ) {
    return this.checkinService.confirmCheckin(token, questId, type, user.userId);
  }
}

