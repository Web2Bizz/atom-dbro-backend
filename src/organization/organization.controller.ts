import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { S3Service } from './s3.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOwnerDto } from './dto/add-owner.dto';
import { AddHelpTypeDto } from './dto/add-help-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Организации')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 20)) // Максимум 20 файлов
  @ApiOperation({ summary: 'Создать организацию' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'cityId'],
      properties: {
        name: { type: 'string', example: 'Благотворительный фонд' },
        cityId: { type: 'number', example: 1 },
        latitude: { type: 'number', example: 55.7558 },
        longitude: { type: 'number', example: 37.6173 },
        summary: { type: 'string' },
        mission: { type: 'string' },
        description: { type: 'string' },
        goals: { type: 'array', items: { type: 'string' } },
        needs: { type: 'array', items: { type: 'string' } },
        address: { type: 'string' },
        contacts: { type: 'array', items: { type: 'object' } },
        organizationTypes: { type: 'array', items: { type: 'string' } },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Организация успешно создана' })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @UploadedFiles() files: Array<Express.Multer.File> | undefined,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    // Создаем организацию
    const organization = await this.organizationService.create(createOrganizationDto, user.userId);

    // Если есть загруженные файлы, добавляем их в галерею
    if (files && files.length > 0) {
      const imageUrls = await this.s3Service.uploadMultipleImages(files, organization.id);
      await this.organizationService.addImagesToGallery(organization.id, imageUrls);
      
      // Получаем обновленную организацию с галереей
      return this.organizationService.findOne(organization.id);
    }

    return organization;
  }

  @Get()
  @ApiOperation({ summary: 'Получить все организации' })
  @ApiResponse({ status: 200, description: 'Список организаций' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  findAll() {
    return this.organizationService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить организацию по ID' })
  @ApiResponse({ status: 200, description: 'Организация найдена' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить организацию' })
  @ApiResponse({ status: 200, description: 'Организация обновлена' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить организацию' })
  @ApiResponse({ status: 200, description: 'Организация удалена' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.remove(id);
  }

  @Post(':id/owners')
  @ApiOperation({ summary: 'Добавить владельца организации' })
  @ApiResponse({ status: 201, description: 'Владелец успешно добавлен' })
  @ApiResponse({ status: 404, description: 'Организация или пользователь не найдены' })
  @ApiResponse({ status: 409, description: 'Пользователь уже является владельцем организации' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  addOwner(
    @Param('id', ParseIntPipe) organizationId: number,
    @Body() addOwnerDto: AddOwnerDto,
  ) {
    return this.organizationService.addOwner(organizationId, addOwnerDto.userId);
  }

  @Delete(':id/owners/:userId')
  @ApiOperation({ summary: 'Удалить владельца организации' })
  @ApiResponse({ status: 200, description: 'Владелец успешно удален' })
  @ApiResponse({ status: 404, description: 'Связь не найдена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  removeOwner(
    @Param('id', ParseIntPipe) organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.organizationService.removeOwner(organizationId, userId);
  }

  @Post(':id/help-types')
  @ApiOperation({ summary: 'Добавить вид помощи организации' })
  @ApiResponse({ status: 201, description: 'Вид помощи успешно добавлен' })
  @ApiResponse({ status: 404, description: 'Организация или вид помощи не найдены' })
  @ApiResponse({ status: 409, description: 'Вид помощи уже добавлен к организации' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  addHelpType(
    @Param('id', ParseIntPipe) organizationId: number,
    @Body() addHelpTypeDto: AddHelpTypeDto,
  ) {
    return this.organizationService.addHelpType(organizationId, addHelpTypeDto.helpTypeId);
  }

  @Delete(':id/help-types/:helpTypeId')
  @ApiOperation({ summary: 'Удалить вид помощи организации' })
  @ApiResponse({ status: 200, description: 'Вид помощи успешно удален' })
  @ApiResponse({ status: 404, description: 'Связь не найдена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  removeHelpType(
    @Param('id', ParseIntPipe) organizationId: number,
    @Param('helpTypeId', ParseIntPipe) helpTypeId: number,
  ) {
    return this.organizationService.removeHelpType(organizationId, helpTypeId);
  }

  @Post(':id/gallery')
  @UseInterceptors(FilesInterceptor('images'))
  @ApiOperation({ summary: 'Загрузить изображения в галерею организации' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Изображения успешно загружены' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async uploadImages(
    @Param('id', ParseIntPipe) organizationId: number,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Необходимо загрузить хотя бы одно изображение');
    }

    const imageUrls = await this.s3Service.uploadMultipleImages(files, organizationId);
    return this.organizationService.addImagesToGallery(organizationId, imageUrls);
  }

  @Delete(':id/gallery')
  @ApiOperation({ summary: 'Удалить изображение из галереи организации' })
  @ApiResponse({ status: 200, description: 'Изображение успешно удалено' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  removeImage(
    @Param('id', ParseIntPipe) organizationId: number,
    @Body('imageUrl') imageUrl: string,
  ) {
    return this.organizationService.removeImageFromGallery(organizationId, imageUrl);
  }
}

