import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { StepVolunteerRepository } from './step-volunteer.repository';

@Injectable()
export class StepVolunteerService {
  private readonly logger = new Logger(StepVolunteerService.name);

  constructor(
    private readonly repository: StepVolunteerRepository,
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

    // Получаем волонтёров этапа
    const volunteers = await this.repository.findVolunteersByQuestAndStep(questId, stepIndex);

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

    // Проверяем существование пользователя
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем, не участвует ли уже пользователь в этапе
    const existingVolunteer = await this.repository.findVolunteer(questId, stepIndex, userId);
    if (existingVolunteer) {
      if (existingVolunteer.recordStatus === 'DELETED') {
        // Если запись была удалена, восстанавливаем её
        const restored = await this.repository.restore(questId, stepIndex, userId);
        if (!restored) {
          throw new Error('Не удалось восстановить волонтёра в этапе');
        }
        return { message: 'Волонтёр успешно добавлен в этап' };
      } else {
        throw new ConflictException('Пользователь уже участвует в этом этапе');
      }
    }

    // Создаём запись волонтёра
    const volunteer = await this.repository.create(questId, stepIndex, userId);
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

    // Проверяем существование пользователя
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем, существует ли запись волонтёра
    const volunteer = await this.repository.findVolunteer(questId, stepIndex, userId);
    if (!volunteer) {
      throw new NotFoundException('Пользователь не участвует в этом этапе');
    }

    // Проверяем, что запись не удалена
    if (volunteer.recordStatus === 'DELETED') {
      throw new ConflictException('Пользователь уже удалён из этого этапа');
    }

    // Удаляем волонтёра (soft delete)
    const deletedVolunteer = await this.repository.softDelete(questId, stepIndex, userId);
    if (!deletedVolunteer) {
      throw new Error('Не удалось удалить волонтёра из этапа');
    }

    return { message: 'Волонтёр успешно удалён из этапа' };
  }
}

