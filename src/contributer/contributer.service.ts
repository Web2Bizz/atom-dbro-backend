import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { ContributerRepository } from './contributer.repository';

@Injectable()
export class ContributerService {
  private readonly logger = new Logger(ContributerService.name);

  constructor(
    private readonly repository: ContributerRepository,
  ) {}

  /**
   * Получить список contributers квеста
   */
  async getContributers(questId: number) {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Получаем contributers квеста
    const contributers = await this.repository.findContributersByQuest(questId);

    return contributers.map(contributer => ({
      id: contributer.userId,
      firstName: contributer.firstName,
      lastName: contributer.lastName,
      middleName: contributer.middleName,
      email: contributer.email,
      joinedAt: contributer.createdAt,
    }));
  }

  /**
   * Добавить contributer в квест
   */
  async addContributer(questId: number, userId: number) {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
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

    // Проверяем, не является ли уже пользователь contributer
    const existingContributer = await this.repository.findContributer(questId, userId);
    if (existingContributer) {
      if (existingContributer.recordStatus === 'DELETED') {
        // Если запись была удалена, восстанавливаем её
        const restored = await this.repository.restore(questId, userId);
        if (!restored) {
          throw new Error('Не удалось восстановить contributer');
        }
        return { message: 'Contributer успешно добавлен в квест' };
      } else {
        throw new ConflictException('Пользователь уже является contributer этого квеста');
      }
    }

    // Создаём запись contributer
    const contributer = await this.repository.create(questId, userId);
    if (!contributer) {
      throw new Error('Не удалось добавить contributer в квест');
    }

    return { message: 'Contributer успешно добавлен в квест' };
  }

  /**
   * Добавить несколько contributers в квест
   */
  async addContributers(questId: number, userIds: number[]) {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
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

    // Проверяем существующие записи contributers
    const existingContributers = await Promise.all(
      userIds.map(userId => this.repository.findContributer(questId, userId))
    );

    const alreadyParticipatingUserIds: number[] = [];
    const deletedUserIds: number[] = [];
    const newUserIds: number[] = [];

    existingContributers.forEach((contributer, index) => {
      const userId = userIds[index];
      if (contributer) {
        if (contributer.recordStatus === 'DELETED') {
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
        `Пользователи с ID уже являются contributers этого квеста: ${alreadyParticipatingUserIds.join(', ')}`
      );
    }

    // Восстанавливаем удалённые записи
    let restoredCount = 0;
    if (deletedUserIds.length > 0) {
      const restoredResults = await Promise.all(
        deletedUserIds.map(userId => this.repository.restore(questId, userId))
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
          `Не удалось восстановить contributers с ID: ${failedRestores.join(', ')}`
        );
      }
    }

    // Добавляем новых contributers
    let addedCount = 0;
    if (newUserIds.length > 0) {
      const createResults = await Promise.all(
        newUserIds.map(userId => this.repository.create(questId, userId))
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
          `Не удалось добавить contributers с ID: ${failedCreates.join(', ')}`
        );
      }
    }

    const totalCount = addedCount + restoredCount;

    return {
      message: `Contributers успешно добавлены в квест`,
      added: addedCount,
      restored: restoredCount,
      total: totalCount,
    };
  }

  /**
   * Удалить contributer из квеста
   */
  async removeContributer(questId: number, userId: number) {
    // Проверяем существование квеста
    const quest = await this.repository.findQuestById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем существование пользователя
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем, существует ли запись contributer
    const contributer = await this.repository.findContributer(questId, userId);
    if (!contributer) {
      throw new NotFoundException('Пользователь не является contributer этого квеста');
    }

    // Проверяем, что запись не удалена
    if (contributer.recordStatus === 'DELETED') {
      throw new ConflictException('Пользователь уже удалён из contributers этого квеста');
    }

    // Удаляем contributer (soft delete)
    const deletedContributer = await this.repository.softDelete(questId, userId);
    if (!deletedContributer) {
      throw new Error('Не удалось удалить contributer из квеста');
    }

    return { message: 'Contributer успешно удалён из квеста' };
  }
}

