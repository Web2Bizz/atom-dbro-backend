import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { StepVolunteerRepository } from './step-volunteer.repository';
import { QuestService } from '../quest/quest.service';

@Injectable()
export class StepVolunteerService {
  private readonly logger = new Logger(StepVolunteerService.name);

  constructor(
    private readonly repository: StepVolunteerRepository,
    @Inject(forwardRef(() => QuestService))
    private readonly questService: QuestService,
  ) {}

  /**
   * Добавить вклад пользователя в этап квеста
   * Создаёт новую запись с указанным значением вклада
   */
  async addContribution(
    questId: number,
    stepType: 'finance' | 'material',
    userId: number,
    contributeValue: number,
  ) {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем статус квеста
    if (quest.status !== 'active') {
      throw new BadRequestException(`Квест со статусом '${quest.status}' не может быть изменен`);
    }

    // Проверяем существование пользователя
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Валидация типа этапа
    const allowedTypes: Array<'finance' | 'material'> = [
      'finance',
      'material',
    ];

    if (!allowedTypes.includes(stepType)) {
      throw new BadRequestException(
        `Некорректный тип этапа '${stepType}'. Допустимые значения: ${allowedTypes.join(', ')}`,
      );
    }

    // Ищем этап по типу
    const stepIndex = quest.steps.findIndex(step => step?.type === stepType);
    if (stepIndex === -1) {
      throw new BadRequestException(
        `Этап с типом '${stepType}' не найден в квесте (количество этапов: ${quest.steps.length})`,
      );
    }

    const step = quest.steps[stepIndex];
    if (!step) {
      throw new BadRequestException(`Этап с типом '${stepType}' не найден`);
    }

    // Проверяем наличие requirement
    if (!step.requirement) {
      throw new BadRequestException(`У этапа с типом '${stepType}' нет требования`);
    }

    // Проверяем, что пользователь участвует в квесте
    const isUserInQuest = await this.repository.isUserInQuest(questId, userId);
    if (!isUserInQuest) {
      throw new BadRequestException('Пользователь должен сначала присоединиться к квесту');
    }

    // Создаём новую запись волонтёра этапа (всегда создаём новую, даже если пользователь уже вносил вклад)
    await this.repository.createStepVolunteer(
      questId,
      stepType,
      userId,
      contributeValue,
    );

    // Синхронизируем currentValue в этапе квеста с суммой всех вкладов
    await this.questService.syncRequirementCurrentValue(questId, stepType);

    // Возвращаем обновленный квест с полной информацией
    return this.questService.findOne(questId);
  }
}

