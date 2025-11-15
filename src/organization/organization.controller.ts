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
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
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
  @ApiOperation({ summary: 'Создать организацию' })
  @ApiResponse({ status: 201, description: 'Организация успешно создана' })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.organizationService.create(createOrganizationDto, user.userId);
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
  @UseInterceptors(
    FilesInterceptor('images', 20), // Максимум 20 файлов
  )
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

    // Валидация файлов
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    files.forEach((file, index) => {
      // Проверка размера файла
      if (file.size > maxFileSize) {
        throw new BadRequestException(
          `Файл "${file.originalname}" (${index + 1}) превышает максимальный размер 10MB`,
        );
      }

      // Проверка типа файла
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Файл "${file.originalname}" (${index + 1}) имеет недопустимый тип. Разрешены только: ${allowedMimeTypes.join(', ')}`,
        );
      }

      // Проверка расширения файла
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        throw new BadRequestException(
          `Файл "${file.originalname}" (${index + 1}) имеет недопустимое расширение. Разрешены только: ${allowedExtensions.join(', ')}`,
        );
      }
    });

    const imageFileNames = await this.s3Service.uploadMultipleImages(files, organizationId);
    return this.organizationService.addImagesToGallery(organizationId, imageFileNames);
  }

  @Delete(':id/gallery')
  @ApiOperation({ summary: 'Удалить изображение из галереи организации' })
  @ApiResponse({ status: 200, description: 'Изображение успешно удалено' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  removeImage(
    @Param('id', ParseIntPipe) organizationId: number,
    @Body('fileName') fileName: string,
  ) {
    return this.organizationService.removeImageFromGallery(organizationId, fileName);
  }

  @Get(':id/gallery/:fileName')
  @ApiOperation({ summary: 'Получить изображение из галереи организации (шлюз)' })
  @ApiResponse({ status: 200, description: 'Изображение найдено', content: { 'image/*': {} } })
  @ApiResponse({ status: 404, description: 'Изображение не найдено' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async getImage(
    @Param('id', ParseIntPipe) organizationId: number,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    // Проверяем, что организация существует и файл принадлежит ей
    // Используем метод сервиса для проверки файла в галерее
    const fullFileName = `organizations/${organizationId}/${decodeURIComponent(fileName)}`;
    const isValid = await this.organizationService.checkImageInGallery(organizationId, fullFileName);
    
    if (!isValid) {
      throw new NotFoundException('Изображение не найдено в галерее организации');
    }

    try {
      // Получаем файл из S3
      const file = await this.s3Service.getFile(fullFileName);
      
      // Устанавливаем заголовки
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Length', file.body.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Кеш на 1 год
      
      // Отправляем файл
      res.send(file.body);
    } catch (error) {
      throw new NotFoundException('Изображение не найдено в хранилище');
    }
  }
}

