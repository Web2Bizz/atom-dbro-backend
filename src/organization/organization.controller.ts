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
  BadRequestException,
  NotFoundException,
  Version,
  HttpCode,
  StreamableFile,
  Header,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { OrganizationService } from './organization.service';
import { S3Service } from './s3.service';
import { CreateOrganizationDto, createOrganizationSchema, CreateOrganizationDtoClass } from './dto/create-organization.dto';
import { UpdateOrganizationDto, updateOrganizationSchema, UpdateOrganizationDtoClass } from './dto/update-organization.dto';
import { AddOwnerDto, addOwnerSchema, AddOwnerDtoClass } from './dto/add-owner.dto';
import { AddHelpTypeDto, addHelpTypeSchema, AddHelpTypeDtoClass } from './dto/add-help-type.dto';
import { CreateOrganizationsBulkDto, createOrganizationsBulkSchema } from './dto/create-organizations-bulk.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

interface UploadedImageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@ApiTags('Организации')
@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @ZodValidation(createOrganizationSchema)
  @ApiOperation({ summary: 'Создать организацию' })
  @ApiBody({ type: CreateOrganizationDtoClass })
  @ApiResponse({ status: 201, description: 'Организация успешно создана', type: CreateOrganizationDtoClass })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.organizationService.create(createOrganizationDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все организации' })
  @ApiQuery({ 
    name: 'onlyApproved', 
    required: false, 
    type: String,
    description: 'Если установлено в "true" или "1", возвращает только подтверждённые организации. По умолчанию возвращает все организации (подтверждённые и неподтверждённые).' 
  })
  @ApiResponse({ status: 200, description: 'Список организаций' })
  findAll(@Query('onlyApproved') onlyApproved?: string) {
    const includeAll = !(onlyApproved === 'true' || onlyApproved === '1');
    return this.organizationService.findAll(includeAll);
  }

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить организации текущего пользователя' })
  @ApiQuery({ 
    name: 'onlyApproved', 
    required: false, 
    type: String,
    description: 'Если установлено в "true" или "1", возвращает только подтверждённые организации. По умолчанию возвращает все организации (подтверждённые и неподтверждённые).' 
  })
  @ApiResponse({ status: 200, description: 'Список организаций пользователя' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  findMyOrganizations(
    @CurrentUser() user: { userId: number; email: string },
    @Query('onlyApproved') onlyApproved?: string,
  ) {
    const includeAll = !(onlyApproved === 'true' || onlyApproved === '1');
    return this.organizationService.findByUserId(user.userId, includeAll);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить организацию по ID' })
  @ApiResponse({ status: 200, description: 'Организация найдена' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ZodValidation(updateOrganizationSchema)
  @ApiOperation({ summary: 'Обновить организацию' })
  @ApiBody({ type: UpdateOrganizationDtoClass })
  @ApiResponse({ status: 200, description: 'Организация обновлена', type: UpdateOrganizationDtoClass })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Только владелец организации может её обновить' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.organizationService.update(id, updateOrganizationDto, user.userId);
  }

  @Post(':id/owners')
  @ZodValidation(addOwnerSchema)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Добавить владельца организации' })
  @ApiBody({ type: AddOwnerDtoClass })
  @ApiResponse({ status: 201, description: 'Владелец успешно добавлен', type: AddOwnerDtoClass })
  @ApiResponse({ status: 404, description: 'Организация или пользователь не найдены' })
  @ApiResponse({ status: 409, description: 'Пользователь уже является владельцем организации' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Только владелец организации может добавлять других владельцев' })
  addOwner(
    @Param('id', ParseIntPipe) organizationId: number,
    @Body() addOwnerDto: AddOwnerDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.organizationService.addOwner(organizationId, addOwnerDto.userId, user.userId);
  }

  @Post(':id/help-types')
  @ZodValidation(addHelpTypeSchema)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Добавить вид помощи организации' })
  @ApiBody({ type: AddHelpTypeDtoClass })
  @ApiResponse({ status: 201, description: 'Вид помощи успешно добавлен', type: AddHelpTypeDtoClass })
  @ApiResponse({ status: 404, description: 'Организация или вид помощи не найдены' })
  @ApiResponse({ status: 409, description: 'Вид помощи уже добавлен к организации' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Только владелец организации может добавлять виды помощи' })
  addHelpType(
    @Param('id', ParseIntPipe) organizationId: number,
    @Body() addHelpTypeDto: AddHelpTypeDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.organizationService.addHelpType(organizationId, addHelpTypeDto.helpTypeId, user.userId);
  }

  @Delete(':id/help-types/:helpTypeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Удалить вид помощи организации' })
  @ApiResponse({ status: 200, description: 'Вид помощи успешно удален' })
  @ApiResponse({ status: 404, description: 'Связь не найдена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Только владелец организации может удалять виды помощи' })
  removeHelpType(
    @Param('id', ParseIntPipe) organizationId: number,
    @Param('helpTypeId', ParseIntPipe) helpTypeId: number,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.organizationService.removeHelpType(organizationId, helpTypeId, user.userId);
  }

  @Post(':id/gallery')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
    @Req() req: FastifyRequest,
  ) {
    const fastifyRequest: any = req as any;
    const files: UploadedImageFile[] = [];

    if (typeof fastifyRequest.files !== 'function') {
      throw new BadRequestException('Загрузка файлов не поддерживается на этом сервере');
    }

    for await (const file of fastifyRequest.files()) {
      const buffer: Buffer = await file.toBuffer();
      files.push({
        buffer,
        originalname: file.filename,
        mimetype: file.mimetype,
        size: buffer.length,
      });
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Необходимо загрузить хотя бы одно изображение');
    }

    // Валидация файлов
    const maxFileSize = MAX_FILE_SIZE_BYTES;
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

  @Get(':id/gallery/:fileName')
  @ApiOperation({ summary: 'Получить изображение из галереи организации (шлюз)' })
  @ApiResponse({ status: 200, description: 'Изображение найдено', content: { 'image/*': {} } })
  @ApiResponse({ status: 404, description: 'Изображение не найдено' })
  @Header('Cache-Control', 'public, max-age=31536000') // Кеш на 1 год
  async getImage(
    @Param('id', ParseIntPipe) organizationId: number,
    @Param('fileName') fileName: string,
  ): Promise<StreamableFile> {
    // Проверяем, что организация существует и файл принадлежит ей
    const fullFileName = `organizations/${organizationId}/${decodeURIComponent(fileName)}`;
    const isValid = await this.organizationService.checkImageInGallery(organizationId, fullFileName);

    if (!isValid) {
      throw new NotFoundException('Изображение не найдено в галерее организации');
    }

    try {
      // Получаем файл из S3
      const file = await this.s3Service.getFile(fullFileName);

      // Возвращаем потоковый файл, Nest сам выставит content-type / content-length
      return new StreamableFile(file.body, {
        type: file.contentType,
        length: file.body.length,
      });
    } catch (error) {
      throw new NotFoundException('Изображение не найдено в хранилище');
    }
  }

  @Post()
  @Version('2')
  @HttpCode(201)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ZodValidation(createOrganizationsBulkSchema)
  @ApiOperation({ summary: 'Массовое добавление организаций (v2)' })
  @ApiBody({ 
    type: [CreateOrganizationDtoClass],
    description: 'Массив организаций для добавления. Если cityId = 0, город будет найден по адресу',
    examples: {
      example1: {
        value: [
          {
            name: 'ОО ТОС АГО "12а микрорайон"',
            cityId: 0,
            typeId: 2,
            helpTypeIds: [5, 8, 10],
            latitude: 52.5444,
            longitude: 103.8883,
            summary: 'Повышение качества жизни жителей',
            mission: 'Благоустройство территории',
            description: 'Описание организации',
            goals: ['Цель 1', 'Цель 2'],
            needs: ['Нужда 1'],
            address: 'г. Ангарск',
            contacts: [{ name: 'ВКонтакте', value: 'https://vk.com/example' }],
            gallery: ['https://example.com/image.jpg']
          }
        ]
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Организации успешно созданы',
    type: [CreateOrganizationDtoClass]
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 404, description: 'Один или несколько городов, типов организаций или видов помощи не найдены' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  createMany(
    @Body() createOrganizationsDto: CreateOrganizationsBulkDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.organizationService.createMany(createOrganizationsDto, user.userId);
  }
}

