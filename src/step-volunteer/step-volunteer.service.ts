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
  async getVolunteers(questId: number, stepType: 'no_required' | 'finance' | 'contributers' | 'material') {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
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

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Проверяем, что этап с таким типом существует
    const stepExists = quest.steps.some(step => step?.type === stepType);
    if (!stepExists) {
      throw new BadRequestException(`Этап с типом '${stepType}' не найден в квесте`);
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
  async addVolunteer(questId: number, stepType: 'no_required' | 'finance' | 'contributers' | 'material', userId: number) {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
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

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Проверяем, что этап с таким типом существует
    const stepExists = quest.steps.some(step => step?.type === stepType);
    if (!stepExists) {
      throw new BadRequestException(`Этап с типом '${stepType}' не найден в квесте`);
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
   * Добавить несколько волонтёров в этап contributers
   */
  async addVolunteers(questId: number, userIds: number[]) {
    const stepType: 'contributers' = 'contributers';

    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Проверяем, что этап с типом contributers существует
    const stepExists = quest.steps.some(step => step?.type === stepType);
    if (!stepExists) {
      throw new BadRequestException(`Этап с типом '${stepType}' не найден в квесте`);
    }

    // Проверяем существование всех пользователей
    const users = await Promise.all(
      userIds.map(userId => this.repository.findUserById(userId))
    );

    const notFoundUserIds: number[] = [];
    users.forEach((user, index) => {
      if (!user) {
        notFoundUserIds.push(userIds[index]);
      }
    });

    if (notFoundUserIds.length > 0) {
      throw new NotFoundException(
        `Пользователи с ID не найдены: ${notFoundUserIds.join(', ')}`
      );
    }

    // Проверяем, участвуют ли все пользователи в квесте
    const userQuestChecks = await Promise.all(
      userIds.map(userId => this.repository.isUserInQuest(questId, userId))
    );

    const notInQuestUserIds: number[] = [];
    userQuestChecks.forEach((isInQuest, index) => {
      if (!isInQuest) {
        notInQuestUserIds.push(userIds[index]);
      }
    });

    if (notInQuestUserIds.length > 0) {
      throw new BadRequestException(
        `Пользователи с ID не участвуют в квесте: ${notInQuestUserIds.join(', ')}`
      );
    }

    // Проверяем существующие записи волонтёров
    const existingVolunteers = await Promise.all(
      userIds.map(userId => this.repository.findVolunteer(questId, stepType, userId))
    );

    const alreadyParticipatingUserIds: number[] = [];
    const deletedUserIds: number[] = [];
    const newUserIds: number[] = [];

    existingVolunteers.forEach((volunteer, index) => {
      const userId = userIds[index];
      if (volunteer) {
        if (volunteer.recordStatus === 'DELETED') {
          deletedUserIds.push(userId);
        } else {
          alreadyParticipatingUserIds.push(userId);
        }
      } else {
        newUserIds.push(userId);
      }
    });

    if (alreadyParticipatingUserIds.length > 0) {
      throw new ConflictException(
        `Пользователи с ID уже участвуют в этом этапе: ${alreadyParticipatingUserIds.join(', ')}`
      );
    }

    // Восстанавливаем удалённые записи
    let restoredCount = 0;
    if (deletedUserIds.length > 0) {
      const restoredResults = await Promise.all(
        deletedUserIds.map(userId => this.repository.restore(questId, stepType, userId))
      );

      const failedRestores: number[] = [];
      restoredResults.forEach((restored, index) => {
        if (!restored) {
          failedRestores.push(deletedUserIds[index]);
        } else {
          restoredCount++;
        }
      });

      if (failedRestores.length > 0) {
        throw new Error(
          `Не удалось восстановить волонтёров с ID: ${failedRestores.join(', ')}`
        );
      }
    }

    // Добавляем новых волонтёров
    let addedCount = 0;
    if (newUserIds.length > 0) {
      const createResults = await Promise.all(
        newUserIds.map(userId => this.repository.create(questId, stepType, userId))
      );

      const failedCreates: number[] = [];
      createResults.forEach((created, index) => {
        if (!created) {
          failedCreates.push(newUserIds[index]);
        } else {
          addedCount++;
        }
      });

      if (failedCreates.length > 0) {
        throw new Error(
          `Не удалось добавить волонтёров с ID: ${failedCreates.join(', ')}`
        );
      }
    }

    const totalCount = addedCount + restoredCount;

    return {
      message: `Волонтёры успешно добавлены в этап`,
      added: addedCount,
      restored: restoredCount,
      total: totalCount,
    };
  }

  /**
   * Удалить волонтёра из этапа
   */
  async removeVolunteer(questId: number, stepType: 'no_required' | 'finance' | 'contributers' | 'material', userId: number) {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
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

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Проверяем, что этап с таким типом существует
    const stepExists = quest.steps.some(step => step?.type === stepType);
    if (!stepExists) {
      throw new BadRequestException(`Этап с типом '${stepType}' не найден в квесте`);
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

