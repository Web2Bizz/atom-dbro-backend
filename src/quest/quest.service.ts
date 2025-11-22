import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { QuestEventsService } from './quest.events';
import { QuestRepository } from './quest.repository';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private readonly questRepository: QuestRepository,
    private readonly questEventsService: QuestEventsService,
  ) {}

  async create(createQuestDto: CreateQuestDto, userId: number) {
    // Проверяем уровень пользователя (требуется минимум 5 уровень)
    const user = await this.questRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }
    if (user.level < 5) {
      throw new ForbiddenException('Для создания квеста требуется уровень 5 или выше');
    }

    let achievementId: number | undefined = undefined;

    // Создаем достижение только если оно указано
    if (createQuestDto.achievement) {
      const achievement = await this.questRepository.createAchievement({
        title: createQuestDto.achievement.title,
        description: createQuestDto.achievement.description,
        icon: createQuestDto.achievement.icon,
        rarity: 'private', // Всегда 'private' для достижений, создаваемых с квестами
      });
      achievementId = achievement.id;
    }

    // Проверяем существование города (теперь обязателен)
    const city = await this.questRepository.findCityById(createQuestDto.cityId);
    if (!city) {
      throw new NotFoundException(`Город с ID ${createQuestDto.cityId} не найден`);
    }

    // Проверяем существование типа организации, если указан
    if (createQuestDto.organizationTypeId) {
      const orgType = await this.questRepository.findOrganizationTypeById(createQuestDto.organizationTypeId);
      if (!orgType) {
        throw new NotFoundException(`Тип организации с ID ${createQuestDto.organizationTypeId} не найден`);
      }
    }

    // Проверяем существование категорий, если указаны
    if (createQuestDto.categoryIds && createQuestDto.categoryIds.length > 0) {
      const existingCategories = await this.questRepository.findCategoriesByIds(createQuestDto.categoryIds);
      if (existingCategories.length !== createQuestDto.categoryIds.length) {
        throw new NotFoundException('Одна или несколько категорий не найдены');
      }
    }

    // Валидация галереи (максимум 10 элементов)
    if (createQuestDto.gallery && createQuestDto.gallery.length > 10) {
      throw new BadRequestException('Галерея не может содержать более 10 изображений');
    }

    // Преобразуем координаты в строки для decimal полей
    const latitude = createQuestDto.latitude !== undefined
      ? createQuestDto.latitude.toString()
      : city.latitude;
    const longitude = createQuestDto.longitude !== undefined
      ? createQuestDto.longitude.toString()
      : city.longitude;

    // Создаем квест с привязкой к достижению (если указано) и владельцем
    const quest = await this.questRepository.create({
      title: createQuestDto.title,
      description: createQuestDto.description,
      status: createQuestDto.status || 'active',
      experienceReward: createQuestDto.experienceReward || 0,
      achievementId: achievementId,
      ownerId: userId,
      cityId: createQuestDto.cityId,
      organizationTypeId: createQuestDto.organizationTypeId,
      latitude: latitude,
      longitude: longitude,
      address: createQuestDto.address,
      contacts: createQuestDto.contacts,
      coverImage: createQuestDto.coverImage,
      gallery: createQuestDto.gallery,
      steps: createQuestDto.steps,
    });

    // Обновляем достижение с questId (если достижение было создано)
    if (achievementId) {
      await this.questRepository.updateAchievement(achievementId, { questId: quest.id });
    }

    // Связываем квест с категориями, если указаны
    if (createQuestDto.categoryIds && createQuestDto.categoryIds.length > 0) {
      await this.questRepository.linkQuestToCategories(quest.id, createQuestDto.categoryIds);
    }

    // Возвращаем квест с информацией о достижении (если есть), городе, типе организации и категориях
    const questWithAchievement = await this.questRepository.findByIdWithDetails(quest.id);
    if (!questWithAchievement) {
      throw new NotFoundException(`Квест с ID ${quest.id} не найден`);
    }

    // Получаем категории для квеста
    const questCategoriesData = await this.questRepository.findCategoriesForQuest(quest.id);

    const questWithAllData = {
      ...questWithAchievement,
      categories: questCategoriesData,
    };

    // Автоматически присоединяем создателя к квесту
    const userQuest = await this.questRepository.createUserQuest(userId, quest.id, 'in_progress');
    
    if (userQuest) {
      // Получаем данные пользователя для события присоединения
      const userData = await this.questRepository.findUserDataForEvent(userId);

      // Эмитим событие присоединения пользователя
      this.questEventsService.emitUserJoined(quest.id, userId, userData || {});
    }

    // Эмитим событие создания квеста
    this.questEventsService.emitQuestCreated(quest.id, questWithAllData);

    return questWithAllData;
  }

  async findAll(cityId?: number, categoryId?: number) {
    try {
      const questsList = await this.questRepository.findAll(cityId, categoryId);

      // Получаем категории для всех квестов
      const questIds = questsList.map(q => q.id);
      const allCategories = await this.questRepository.findCategoriesForQuests(questIds);

      // Группируем категории по questId
      const categoriesByQuestId = new Map<number, Array<{ id: number; name: string }>>();
      for (const category of allCategories) {
        if (!categoriesByQuestId.has(category.questId)) {
          categoriesByQuestId.set(category.questId, []);
        }
        categoriesByQuestId.get(category.questId)!.push({
          id: category.id,
          name: category.name,
        });
      }

      return questsList.map(quest => ({
        ...quest,
        categories: categoriesByQuestId.get(quest.id) || [],
      }));
    } catch (error: any) {
      console.error('Ошибка в findAll:', error);
      console.error('Детали ошибки:', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        hint: error?.hint,
        where: error?.where,
        stack: error?.stack,
      });
      throw error;
    }
  }

  async findByStatus(status?: 'active' | 'archived' | 'completed', cityId?: number, categoryId?: number) {
    const questsList = await this.questRepository.findByStatus(status, cityId, categoryId);

    // Получаем категории для всех квестов
    const questIds = questsList.map(q => q.id);
    const allCategories = await this.questRepository.findCategoriesForQuests(questIds);

    // Группируем категории по questId
    const categoriesByQuestId = new Map<number, Array<{ id: number; name: string }>>();
    for (const category of allCategories) {
      if (!categoriesByQuestId.has(category.questId)) {
        categoriesByQuestId.set(category.questId, []);
      }
      categoriesByQuestId.get(category.questId)!.push({
        id: category.id,
        name: category.name,
      });
    }

    return questsList.map(quest => ({
      ...quest,
      categories: categoriesByQuestId.get(quest.id) || [],
    }));
  }

  async findOne(id: number) {
    // Сначала проверяем существование квеста и получаем актуальный статус
    const basicQuest = await this.questRepository.findById(id);
    if (!basicQuest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }

    // Затем получаем полную информацию о квесте
    const quest = await this.questRepository.findByIdWithDetails(id);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }

    // Получаем категории для квеста
    const questCategoriesData = await this.questRepository.findCategoriesForQuest(id);

    // Убеждаемся, что возвращаем актуальный статус из БД
    return {
      ...quest,
      status: basicQuest.status, // Явно используем актуальный статус из БД
      categories: questCategoriesData,
    };
  }

  async update(id: number, updateQuestDto: UpdateQuestDto) {
    // Проверяем существование квеста
    const existingQuest = await this.questRepository.findById(id);
    if (!existingQuest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }

    // Если обновляется achievementId, проверяем существование достижения
    if (updateQuestDto.achievementId !== undefined) {
      if (updateQuestDto.achievementId !== null) {
        const achievement = await this.questRepository.findAchievementById(updateQuestDto.achievementId);
        if (!achievement) {
          throw new NotFoundException(`Достижение с ID ${updateQuestDto.achievementId} не найдено`);
        }
      }
    }

    const updateData: any = { updatedAt: new Date() };
    
    if (updateQuestDto.title !== undefined) {
      updateData.title = updateQuestDto.title;
    }
    if (updateQuestDto.description !== undefined) {
      updateData.description = updateQuestDto.description;
    }
    if (updateQuestDto.status !== undefined) {
      updateData.status = updateQuestDto.status;
    }
    if (updateQuestDto.experienceReward !== undefined) {
      updateData.experienceReward = updateQuestDto.experienceReward;
    }
    if (updateQuestDto.achievementId !== undefined) {
      updateData.achievementId = updateQuestDto.achievementId;
    }
    if (updateQuestDto.cityId !== undefined) {
      // Проверяем существование города, если указан
      if (updateQuestDto.cityId !== null) {
        const city = await this.questRepository.findCityById(updateQuestDto.cityId);
        if (!city) {
          throw new NotFoundException(`Город с ID ${updateQuestDto.cityId} не найден`);
        }
      }
      updateData.cityId = updateQuestDto.cityId;
    }
    if (updateQuestDto.organizationTypeId !== undefined) {
      if (updateQuestDto.organizationTypeId !== null) {
        const orgType = await this.questRepository.findOrganizationTypeById(updateQuestDto.organizationTypeId);
        if (!orgType) {
          throw new NotFoundException(`Тип организации с ID ${updateQuestDto.organizationTypeId} не найден`);
        }
      }
      updateData.organizationTypeId = updateQuestDto.organizationTypeId;
    }
    if (updateQuestDto.latitude !== undefined) {
      updateData.latitude = updateQuestDto.latitude.toString();
    }
    if (updateQuestDto.longitude !== undefined) {
      updateData.longitude = updateQuestDto.longitude.toString();
    }
    if (updateQuestDto.address !== undefined) {
      updateData.address = updateQuestDto.address;
    }
    if (updateQuestDto.contacts !== undefined) {
      updateData.contacts = updateQuestDto.contacts;
    }
    if (updateQuestDto.coverImage !== undefined) {
      updateData.coverImage = updateQuestDto.coverImage;
    }
    if (updateQuestDto.gallery !== undefined) {
      // Валидация галереи (максимум 10 элементов)
      if (updateQuestDto.gallery && updateQuestDto.gallery.length > 10) {
        throw new BadRequestException('Галерея не может содержать более 10 изображений');
      }
      updateData.gallery = updateQuestDto.gallery;
    }
    let requirementsChanged = false;
    if (updateQuestDto.steps !== undefined) {
      // Проверяем, изменились ли requirements в этапах
      if (existingQuest.steps && Array.isArray(existingQuest.steps) && Array.isArray(updateQuestDto.steps)) {
        const maxLength = Math.max(existingQuest.steps.length, updateQuestDto.steps.length);
        for (let i = 0; i < maxLength; i++) {
          const newStep = updateQuestDto.steps[i];
          const oldStep = existingQuest.steps[i];
          
          // Проверяем наличие requirement в новом или старом этапе
          const hasNewRequirement = newStep?.requirement !== undefined && newStep?.requirement !== null;
          const hasOldRequirement = oldStep?.requirement !== undefined && oldStep?.requirement !== null;
          
          // Если requirement был добавлен или удален
          if (hasNewRequirement !== hasOldRequirement) {
            requirementsChanged = true;
            break;
          }
          
          // Если оба имеют requirement, проверяем изменения
          if (hasNewRequirement && hasOldRequirement) {
            const newReq = newStep.requirement as { currentValue?: number; targetValue?: number };
            const oldReq = oldStep.requirement as { currentValue?: number; targetValue?: number };
            
            // Проверяем, изменились ли currentValue или targetValue
            if (
              (newReq.currentValue !== undefined && newReq.currentValue !== oldReq.currentValue) ||
              (newReq.targetValue !== undefined && newReq.targetValue !== oldReq.targetValue)
            ) {
              requirementsChanged = true;
              break;
            }
          }
        }
      } else if (updateQuestDto.steps && Array.isArray(updateQuestDto.steps)) {
        // Если старых steps не было, но новые есть с requirements
        const hasRequirements = updateQuestDto.steps.some(step => step?.requirement);
        if (hasRequirements) {
          requirementsChanged = true;
        }
      } else if (existingQuest.steps && Array.isArray(existingQuest.steps)) {
        // Если старые steps были с requirements, а новых нет
        const hadRequirements = existingQuest.steps.some(step => step?.requirement);
        if (hadRequirements) {
          requirementsChanged = true;
        }
      }
      
      updateData.steps = updateQuestDto.steps;
    }

    const quest = await this.questRepository.update(id, updateData);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }

    // Эмитим событие, если изменились requirements
    if (requirementsChanged) {
      this.logger.log(`Requirements changed for quest ${id}`);
      this.questEventsService.emitRequirementUpdated(id, quest.steps);
    }

    // Обновляем категории, если указаны
    if (updateQuestDto.categoryIds !== undefined) {
      // Удаляем старые связи
      await this.questRepository.unlinkQuestFromCategories(id);

      // Проверяем существование категорий, если указаны
      if (updateQuestDto.categoryIds.length > 0) {
        const existingCategories = await this.questRepository.findCategoriesByIds(updateQuestDto.categoryIds);
        if (existingCategories.length !== updateQuestDto.categoryIds.length) {
          throw new NotFoundException('Одна или несколько категорий не найдены');
        }

        // Создаем новые связи
        await this.questRepository.linkQuestToCategories(id, updateQuestDto.categoryIds);
      }
    }

    // Возвращаем обновленный квест с полной информацией
    return this.findOne(id);
  }

  async remove(id: number) {
    const quest = await this.questRepository.softDelete(id);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }
    return quest;
  }

  async joinQuest(userId: number, questId: number) {
    const user = await this.questRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    const quest = await this.questRepository.findById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    if (quest.status !== 'active') {
      throw new BadRequestException('Квест не доступен для выполнения');
    }

    const existingUserQuest = await this.questRepository.findUserQuest(userId, questId);
    if (existingUserQuest) {
      throw new ConflictException('Пользователь уже присоединился к этому квесту');
    }

    const userQuest = await this.questRepository.createUserQuest(userId, questId, 'in_progress');

    const userData = await this.questRepository.findUserDataForEvent(userId);

    this.questEventsService.emitUserJoined(questId, userId, userData || {});

    return userQuest;
  }

  async leaveQuest(userId: number, questId: number) {
    // Проверяем существование пользователя
    const user = await this.questRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем существование квеста
    const quest = await this.questRepository.findById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что пользователь участвует в квесте
    const userQuest = await this.questRepository.findUserQuest(userId, questId);
    if (!userQuest) {
      throw new NotFoundException('Пользователь не участвует в этом квесте');
    }

    // Проверяем, что квест еще не завершен
    if (userQuest.status === 'completed') {
      throw new BadRequestException('Нельзя покинуть уже завершенный квест');
    }

    // Удаляем запись о участии в квесте
    const deletedUserQuest = await this.questRepository.deleteUserQuest(userQuest.id);
    if (!deletedUserQuest) {
      throw new Error('Не удалось покинуть квест');
    }

    return deletedUserQuest;
  }

  async completeQuest(userId: number, questId: number) {
    // Проверяем существование пользователя
    const user = await this.questRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем существование квеста
    const quest = await this.questRepository.findById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что квест начат пользователем
    const userQuest = await this.questRepository.findUserQuest(userId, questId);
    if (!userQuest) {
      throw new NotFoundException('Пользователь не начал этот квест');
    }

    if (userQuest.status === 'completed') {
      throw new ConflictException('Квест уже выполнен');
    }

    // Завершаем квест
    const completedQuest = await this.questRepository.updateUserQuest(userQuest.id, {
      status: 'completed',
      completedAt: new Date(),
    });
    if (!completedQuest) {
      throw new Error('Не удалось завершить квест');
    }

    // Начисляем опыт пользователю
    const newExperience = user.experience + quest.experienceReward;
    await this.questRepository.updateUserExperience(userId, newExperience);

    // Присваиваем достижение пользователю, если оно еще не присвоено
    if (quest.achievementId) {
      const existingUserAchievement = await this.questRepository.findUserAchievement(userId, quest.achievementId);
      
      if (!existingUserAchievement) {
        await this.questRepository.createUserAchievement(userId, quest.achievementId);
      }
    }

    // Получаем данные квеста для события
    const questData = await this.questRepository.findQuestDataForEvent(questId);

    // Эмитим событие завершения квеста
    this.questEventsService.emitQuestCompleted(questId, userId, questData || {});

    return completedQuest;
  }

  async getUserQuests(userId: number) {
    // Проверяем существование пользователя
    const user = await this.questRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Получаем все квесты пользователя с информацией о квесте и достижении
    const result = await this.questRepository.findUserQuests(userId);

    // Получаем категории для всех квестов
    const questIds = result.map(r => r.questId);
    const allCategories = await this.questRepository.findCategoriesForQuests(questIds);

    const categoriesByQuestId = new Map<number, Array<{ id: number; name: string }>>();
    for (const category of allCategories) {
      if (!categoriesByQuestId.has(category.questId)) {
        categoriesByQuestId.set(category.questId, []);
      }
      categoriesByQuestId.get(category.questId)!.push({
        id: category.id,
        name: category.name,
      });
    }

    return result.map(item => ({
      ...item,
      quest: {
        ...item.quest,
        categories: categoriesByQuestId.get(item.questId) || [],
      },
    }));
  }

  async getAvailableQuests(userId: number) {
    // Проверяем существование пользователя
    const user = await this.questRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Получаем все активные квесты с информацией о достижении
    const activeQuests = await this.questRepository.findAvailableQuests(userId);

    // Получаем ID квестов, которые пользователь уже начал
    const startedQuestIds = new Set(await this.questRepository.findUserStartedQuestIds(userId));

    // Фильтруем квесты, которые пользователь еще не начал
    const filteredQuests = activeQuests.filter(quest => !startedQuestIds.has(quest.id));

    // Получаем категории для всех квестов
    const questIds = filteredQuests.map(q => q.id);
    const allCategories = await this.questRepository.findCategoriesForQuests(questIds);

    // Группируем категории по questId
    const categoriesByQuestId = new Map<number, Array<{ id: number; name: string }>>();
    for (const category of allCategories) {
      if (!categoriesByQuestId.has(category.questId)) {
        categoriesByQuestId.set(category.questId, []);
      }
      categoriesByQuestId.get(category.questId)!.push({
        id: category.id,
        name: category.name,
      });
    }

    return filteredQuests.map(quest => ({
      ...quest,
      categories: categoriesByQuestId.get(quest.id) || [],
    }));
  }

  async updateRequirementCurrentValue(
    questId: number,
    stepIndex: number,
    updateRequirementDto: UpdateRequirementDto,
  ) {
    // Проверяем существование квеста
    const quest = await this.questRepository.findById(questId);
    
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем статус квеста
    if (quest.status !== 'active') {
      throw new BadRequestException(`Квест со статусом '${quest.status}' не может быть изменен`);
    }

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Проверяем, что индекс этапа валиден
    if (stepIndex < 0 || stepIndex >= quest.steps.length) {
      throw new BadRequestException(`Индекс этапа ${stepIndex} выходит за границы массива этапов (длина: ${quest.steps.length})`);
    }

    const step = quest.steps[stepIndex];
    if (!step) {
      throw new BadRequestException(`Этап с индексом ${stepIndex} не найден`);
    }

    // Проверяем наличие requirement
    if (!step.requirement) {
      throw new BadRequestException(`У этапа с индексом ${stepIndex} нет требования`);
    }

    const requirement = step.requirement as { currentValue?: number; targetValue?: number };
    
    // Проверяем, что targetValue существует
    if (requirement.targetValue === undefined || requirement.targetValue === null) {
      throw new BadRequestException('У требования отсутствует targetValue');
    }

    const newCurrentValue = updateRequirementDto.currentValue;

    // Валидация: currentValue должен быть положительным
    if (newCurrentValue < 0) {
      throw new BadRequestException('currentValue должен быть неотрицательным числом');
    }

    // Валидация: currentValue не может превышать targetValue, может быть только равным
    if (newCurrentValue > requirement.targetValue) {
      throw new BadRequestException(`currentValue (${newCurrentValue}) не может превышать targetValue (${requirement.targetValue})`);
    }

    // Обновляем currentValue
    const updatedSteps = [...quest.steps];
    updatedSteps[stepIndex] = {
      ...step,
      requirement: {
        currentValue: newCurrentValue,
        targetValue: requirement.targetValue,
      },
    };

    // Обновляем квест в базе данных
    const updatedQuest = await this.questRepository.update(questId, {
      steps: updatedSteps,
    });
    
    if (!updatedQuest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Эмитим событие обновления requirement
    this.logger.log(`Requirement currentValue updated for quest ${questId}, step ${stepIndex}: ${newCurrentValue}`);
    this.questEventsService.emitRequirementUpdated(questId, updatedQuest.steps);

    // Возвращаем обновленный квест с полной информацией
    return this.findOne(questId);
  }

  async archiveQuest(questId: number) {
    // Проверяем существование квеста
    const quest = await this.questRepository.findById(questId);
    
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Обновляем статус квеста на archived
    const archivedQuest = await this.questRepository.archive(questId);
    
    if (!archivedQuest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    this.logger.log(`Quest ${questId} archived successfully`);

    // Возвращаем обновленный квест с полной информацией
    return this.findOne(questId);
  }
}

