import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || '';
  }

  async uploadImage(file: Express.Multer.File, organizationId: number): Promise<string> {
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

    // Формируем URL изображения
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    // Для us-east-1 используется другой формат URL
    const url = region === 'us-east-1'
      ? `https://${this.bucketName}.s3.amazonaws.com/${fileName}`
      : `https://${this.bucketName}.s3.${region}.amazonaws.com/${fileName}`;

    return url;
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    organizationId: number,
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, organizationId));
    return Promise.all(uploadPromises);
  }
}

