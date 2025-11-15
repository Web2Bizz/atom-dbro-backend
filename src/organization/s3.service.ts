import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

/**
 * Универсальный сервис для работы с S3-совместимыми хранилищами.
 * Поддерживает AWS S3, Beget, Yandex Object Storage, DigitalOcean Spaces, MinIO и другие провайдеры.
 * 
 * Конфигурация через переменные окружения:
 * - S3_ENDPOINT - endpoint для кастомных провайдеров (опционально)
 * - S3_BUCKET_NAME - имя bucket (обязательно)
 * - S3_ACCESS_KEY_ID или AWS_ACCESS_KEY_ID - ключ доступа
 * - S3_SECRET_ACCESS_KEY или AWS_SECRET_ACCESS_KEY - секретный ключ
 * - S3_REGION или AWS_REGION - регион (по умолчанию us-east-1)
 * - S3_PUBLIC_URL_TEMPLATE - шаблон для публичных URL (опционально)
 * - S3_FORCE_PATH_STYLE - использовать path-style URLs (по умолчанию true для кастомных endpoint)
 */
@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private endpoint: string | undefined;
  private publicUrlTemplate: string | undefined;
  private region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('S3_REGION') || 
                  this.configService.get<string>('AWS_REGION') || 
                  'us-east-1';
    this.endpoint = this.configService.get<string>('S3_ENDPOINT');
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || '';
    this.publicUrlTemplate = this.configService.get<string>('S3_PUBLIC_URL_TEMPLATE');

    // Настройка S3 клиента
    const s3Config: any = {
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID') || 
                     this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY') || 
                        this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    };

    // Если указан кастомный endpoint (для не-AWS провайдеров)
    if (this.endpoint) {
      s3Config.endpoint = this.endpoint;
      // Для большинства не-AWS провайдеров нужен path-style
      s3Config.forcePathStyle = this.configService.get<string>('S3_FORCE_PATH_STYLE') !== 'false';
    }

    this.s3Client = new S3Client(s3Config);
  }

  /**
   * Загружает одно изображение в S3 хранилище
   * @param file - файл изображения
   * @param organizationId - ID организации
   * @returns публичный URL загруженного изображения
   */
  async uploadImage(file: { buffer: Buffer; originalname: string; mimetype: string }, organizationId: number): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `organizations/${organizationId}/${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await this.s3Client.send(command);

    // Формируем публичный URL изображения
    return this.getPublicUrl(fileName);
  }

  /**
   * Загружает несколько изображений в S3 хранилище
   * @param files - массив файлов изображений
   * @param organizationId - ID организации
   * @returns массив публичных URL загруженных изображений
   */
  async uploadMultipleImages(
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string }>,
    organizationId: number,
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, organizationId));
    return Promise.all(uploadPromises);
  }

  /**
   * Формирует публичный URL для файла на основе конфигурации
   * @param fileName - имя файла (ключ в S3)
   * @returns публичный URL файла
   */
  private getPublicUrl(fileName: string): string {
    // Если указан кастомный шаблон URL - используем его
    if (this.publicUrlTemplate) {
      return this.publicUrlTemplate
        .replace('{bucket}', this.bucketName)
        .replace('{key}', fileName)
        .replace('{region}', this.region);
    }

    // Если указан кастомный endpoint (Beget, Yandex, DigitalOcean, MinIO и т.д.)
    if (this.endpoint) {
      const endpointUrl = new URL(this.endpoint);
      // Path-style URL: https://endpoint.com/bucket-name/file-key
      return `${endpointUrl.protocol}//${endpointUrl.host}/${this.bucketName}/${fileName}`;
    }

    // Дефолтный формат для AWS S3 (virtual-hosted-style)
    if (this.region === 'us-east-1') {
      return `https://${this.bucketName}.s3.amazonaws.com/${fileName}`;
    }
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
  }
}

