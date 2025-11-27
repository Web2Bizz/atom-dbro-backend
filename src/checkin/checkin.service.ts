import { Injectable, NotFoundException, BadRequestException, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GenerateCheckinTokenDto } from './dto/generate-checkin-token.dto';
import { QuestRepository } from '../quest/quest.repository';
import { StepVolunteerRepository } from '../step-volunteer/step-volunteer.repository';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly questRepository: QuestRepository,
    private readonly stepVolunteerRepository: StepVolunteerRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Генерировать JWT токен для участия в квесте
   */
  async generateToken(userId: number, dto: GenerateCheckinTokenDto) {
    // Проверяем существование пользователя
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем существование квеста
    const quest = await this.questRepository.findById(dto.questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${dto.questId} не найден`);
    }

    // Проверяем наличие этапа с указанным типом
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    const stepExists = quest.steps.some(step => step?.type === dto.type);
    if (!stepExists) {
      throw new BadRequestException(`Этап с типом '${dto.type}' не найден в квесте`);
    }

    // Генерируем JWT токен с данными о квесте и типе этапа
    const payload = {
      sub: userId,
      questId: dto.questId,
      type: dto.type,
      purpose: 'checkin', // Маркер для токена участия
    };

    const tokenExpiresIn = this.configService.get<string>('CHECKIN_TOKEN_EXPIRES_IN') || '7d';
    const token = this.jwtService.sign(payload, { expiresIn: tokenExpiresIn });

    this.logger.log(`Сгенерирован токен участия для пользователя ${userId}, квест ${dto.questId}, тип ${dto.type}`);

    return {
      token,
      questId: dto.questId,
      type: dto.type,
      expiresIn: tokenExpiresIn,
    };
  }

  /**
   * Подтвердить участие по токену
   */
  async confirmCheckin(token: string, questId: number, type: string, userId: number) {
    // Проверяем существование пользователя
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем и декодируем токен
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Недействительный или истекший токен');
    }

    // Проверяем, что токен предназначен для участия
    if (payload.purpose !== 'checkin') {
      throw new BadRequestException('Токен не предназначен для участия');
    }

    // Проверяем соответствие questId и type
    if (payload.questId !== questId) {
      throw new BadRequestException('ID квеста в токене не соответствует запрошенному');
    }

    if (payload.type !== type) {
      throw new BadRequestException('Тип этапа в токене не соответствует запрошенному');
    }

    // Проверяем, что пользователь из токена совпадает с текущим пользователем
    if (payload.sub !== userId) {
      throw new UnauthorizedException('Токен не принадлежит текущему пользователю');
    }

    // Проверяем существование квеста
    const quest = await this.questRepository.findById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем наличие этапа с указанным типом
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    const stepExists = quest.steps.some(step => step?.type === type);
    if (!stepExists) {
      throw new NotFoundException(`Этап с типом '${type}' не найден в квесте`);
    }

    // Проверяем, участвует ли пользователь в квесте
    const isUserInQuest = await this.stepVolunteerRepository.isUserInQuest(questId, userId);
    if (!isUserInQuest) {
      throw new BadRequestException('Пользователь не участвует в этом квесте');
    }

    // Проверяем, не участвует ли уже пользователь в этапе
    const existingVolunteer = await this.stepVolunteerRepository.findVolunteer(questId, type, userId);
    if (existingVolunteer) {
      if (existingVolunteer.recordStatus === 'DELETED') {
        // Восстанавливаем запись
        await this.stepVolunteerRepository.restore(questId, type, userId);
        return {
          message: 'Участие успешно подтверждено',
          questId,
          type,
          userId,
        };
      } else {
        throw new ConflictException('Пользователь уже участвует в этом этапе');
      }
    }

    // Создаем запись волонтёра этапа
    await this.stepVolunteerRepository.create(questId, type, userId, 0);

    this.logger.log(`Участие подтверждено: пользователь ${userId}, квест ${questId}, тип ${type}`);

    return {
      message: 'Участие успешно подтверждено',
      questId,
      type,
      userId,
    };
  }
}

