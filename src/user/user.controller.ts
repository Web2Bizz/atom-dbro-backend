import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Version,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto, updateUserSchema, UpdateUserDtoClass } from './dto/update-user.dto';
import { ChangePasswordDto, changePasswordSchema, ChangePasswordDtoClass } from './dto/change-password.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Пользователи')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Получить всех пользователей' })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  findAll() {
    return this.userService.findAll();
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ZodValidation(changePasswordSchema)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Изменить пароль (требуется авторизация)' })
  @ApiBody({ type: ChangePasswordDtoClass })
  @ApiResponse({ status: 200, description: 'Пароль успешно изменен' })
  @ApiResponse({ status: 401, description: 'Неверный старый пароль или не авторизован' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  changePassword(
    @CurrentUser() user: { userId: number; email: string },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(user.userId, changePasswordDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  @ApiResponse({ status: 200, description: 'Пользователь найден' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @Version('1')
  @ZodValidation(updateUserSchema)
  @ApiOperation({ summary: 'Обновить пользователя (v1) - принимает объект avatarUrls' })
  @ApiBody({ type: UpdateUserDtoClass })
  @ApiResponse({ status: 200, description: 'Пользователь обновлен', type: UpdateUserDtoClass })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 409, description: 'Пользователь с таким email уже существует' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }
}

