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
   * Получить список волонтёров этапа
   */
  async getVolunteers(questId: number, stepIndex: number) {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Проверяем, что индекс этапа валиден
    if (stepIndex < 0 || stepIndex >= quest.steps.length) {
      throw new BadRequestException(
        `Индекс этапа ${stepIndex} выходит за границы массива этапов (длина: ${quest.steps.length})`
      );
    }

    const step = quest.steps[stepIndex];
    const stepType = step?.type;
    if (!stepType) {
      throw new BadRequestException(`У этапа с индексом ${stepIndex} не указан type`);
    }

    // Получаем волонтёров этапа
    const volunteers = await this.repository.findVolunteersByQuestAndStep(questId, stepType);

    return volunteers.map(volunteer => ({
      id: volunteer.userId,
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      middleName: volunteer.middleName,
      email: volunteer.email,
      joinedAt: volunteer.createdAt,
    }));
  }

  /**
   * Добавить волонтёра в этап
   */
  async addVolunteer(questId: number, stepIndex: number, userId: number) {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Проверяем, что индекс этапа валиден
    if (stepIndex < 0 || stepIndex >= quest.steps.length) {
      throw new BadRequestException(
        `Индекс этапа ${stepIndex} выходит за границы массива этапов (длина: ${quest.steps.length})`
      );
    }

    const step = quest.steps[stepIndex];
    const stepType = step?.type;
    if (!stepType) {
      throw new BadRequestException(`У этапа с индексом ${stepIndex} не указан type`);
    }

    // Проверяем существование пользователя
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем, участвует ли пользователь в квесте
    const isUserInQuest = await this.repository.isUserInQuest(questId, userId);
    if (!isUserInQuest) {
      throw new BadRequestException('Пользователь не участвует в этом квесте');
    }

    // Проверяем, не участвует ли уже пользователь в этапе
    const existingVolunteer = await this.repository.findVolunteer(questId, stepType, userId);
    if (existingVolunteer) {
      if (existingVolunteer.recordStatus === 'DELETED') {
        // Если запись была удалена, восстанавливаем её
        const restored = await this.repository.restore(questId, stepType, userId);
        if (!restored) {
          throw new Error('Не удалось восстановить волонтёра в этапе');
        }
        return { message: 'Волонтёр успешно добавлен в этап' };
      } else {
        throw new ConflictException('Пользователь уже участвует в этом этапе');
      }
    }

    // Создаём запись волонтёра
    const volunteer = await this.repository.create(questId, stepType, userId);
    if (!volunteer) {
      throw new Error('Не удалось добавить волонтёра в этап');
    }

    return { message: 'Волонтёр успешно добавлен в этап' };
  }

  /**
   * Удалить волонтёра из этапа
   */
  async removeVolunteer(questId: number, stepIndex: number, userId: number) {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Проверяем, что индекс этапа валиден
    if (stepIndex < 0 || stepIndex >= quest.steps.length) {
      throw new BadRequestException(
        `Индекс этапа ${stepIndex} выходит за границы массива этапов (длина: ${quest.steps.length})`
      );
    }

    const step = quest.steps[stepIndex];
    const stepType = step?.type;
    if (!stepType) {
      throw new BadRequestException(`У этапа с индексом ${stepIndex} не указан type`);
    }

    // Проверяем существование пользователя
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем, существует ли запись волонтёра
    const volunteer = await this.repository.findVolunteer(questId, stepType, userId);
    if (!volunteer) {
      throw new NotFoundException('Пользователь не участвует в этом этапе');
    }

    // Проверяем, что запись не удалена
    if (volunteer.recordStatus === 'DELETED') {
      throw new ConflictException('Пользователь уже удалён из этого этапа');
    }

    // Удаляем волонтёра (soft delete)
    const deletedVolunteer = await this.repository.softDelete(questId, stepType, userId);
    if (!deletedVolunteer) {
      throw new Error('Не удалось удалить волонтёра из этапа');
    }

    return { message: 'Волонтёр успешно удалён из этапа' };
  }

  /**
   * Добавить вклад пользователя в этап квеста
   * Создаёт новую запись с указанным значением вклада
   */
  async addContribution(
    questId: number,
    stepType: 'no_required' | 'finance' | 'contributers' | 'material',
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
    const allowedTypes: Array<'no_required' | 'finance' | 'contributers' | 'material'> = [
      'no_required',
      'finance',
      'contributers',
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

    // Проверяем наличие requirement (для типов с требованиями)
    if (stepType !== 'no_required' && !step.requirement) {
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
    if (stepType !== 'no_required') {
      await this.questService.syncRequirementCurrentValue(questId, stepType);
    }

    // Возвращаем обновленный квест с полной информацией
    return this.questService.findOne(questId);
  }
}

