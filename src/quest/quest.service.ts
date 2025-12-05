import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { QuestEventsService } from './quest.events';
import { QuestRepository } from './quest.repository';
import { StepVolunteerRepository } from '../step-volunteer/step-volunteer.repository';
import { ContributerRepository } from '../contributer/contributer.repository';
import { MAX_GALLERY_IMAGES, MIN_LEVEL_TO_CREATE_QUEST } from '../common/constants';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private readonly questRepository: QuestRepository,
    private readonly questEventsService: QuestEventsService,
    @Inject(forwardRef(() => StepVolunteerRepository))
    private readonly stepVolunteerRepository: StepVolunteerRepository,
    @Inject(forwardRef(() => ContributerRepository))
    private readonly contributerRepository: ContributerRepository,
  ) {}

  /**
   * Группирует категории по ID квеста
   * @param categories Массив категорий с questId
   * @returns Map с ключом questId и значением массива категорий
   */
  private groupCategoriesByQuestId(
    categories: Array<{ questId: number; id: number; name: string }>,
  ): Map<number, Array<{ id: number; name: string }>> {
    const categoriesByQuestId = new Map<number, Array<{ id: number; name: string }>>();
    for (const category of categories) {
      if (!categoriesByQuestId.has(category.questId)) {
        categoriesByQuestId.set(category.questId, []);
      }
      categoriesByQuestId.get(category.questId)!.push({
        id: category.id,
        name: category.name,
      });
    }
    return categoriesByQuestId;
  }

  async create(createQuestDto: CreateQuestDto, userId: number) {
    // Проверяем уровень пользователя
    const user = await this.questRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }
    if (user.level < MIN_LEVEL_TO_CREATE_QUEST) {
      throw new ForbiddenException(`Для создания квеста требуется уровень ${MIN_LEVEL_TO_CREATE_QUEST} или выше`);
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
    if (createQuestDto.gallery && createQuestDto.gallery.length > MAX_GALLERY_IMAGES) {
      throw new BadRequestException(`Галерея не может содержать более ${MAX_GALLERY_IMAGES} изображений`);
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
      const categoriesByQuestId = this.groupCategoriesByQuestId(allCategories);

      return questsList.map(quest => ({
        ...quest,
        categories: categoriesByQuestId.get(quest.id) || [],
      }));
    } catch (error: any) {
      this.logger.error('Ошибка в findAll:', error);
      this.logger.error('Детали ошибки:', {
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
    const categoriesByQuestId = this.groupCategoriesByQuestId(allCategories);

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

  async findOneWithUserParticipation(id: number, userId: number) {
    // Получаем квест с полной информацией
    const quest = await this.findOne(id);

    // Проверяем, участвует ли пользователь в квесте
    const userQuest = await this.questRepository.findUserQuest(userId, id);
    const isParticipating = !!userQuest;

    return {
      ...quest,
      isParticipating,
    };
  }

  /**
   * Проверяет права пользователя на обновление квеста
   * @param questId ID квеста
   * @param userId ID пользователя
   * @throws NotFoundException если квест не найден
   * @throws ForbiddenException если пользователь не является владельцем
   */
  private async validateQuestUpdatePermissions(questId: number, userId: number): Promise<void> {
    const existingQuest = await this.questRepository.findById(questId);
    if (!existingQuest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    if (existingQuest.ownerId !== userId) {
      throw new ForbiddenException('Только владелец квеста может его обновить');
    }
  }

  /**
   * Проверяет, изменились ли requirements в этапах квеста
   * @param oldSteps Старые этапы квеста
   * @param newSteps Новые этапы квеста
   * @returns true если requirements изменились, false иначе
   */
  private checkRequirementsChanged(oldSteps: any[] | undefined, newSteps: any[] | undefined): boolean {
    if (!oldSteps && !newSteps) {
      return false;
    }

    if (!oldSteps && newSteps && Array.isArray(newSteps)) {
      // Если старых steps не было, но новые есть с requirements
      return newSteps.some(step => step?.requirement);
    }

    if (oldSteps && Array.isArray(oldSteps) && !newSteps) {
      // Если старые steps были с requirements, а новых нет
      return oldSteps.some(step => step?.requirement);
    }

    if (oldSteps && Array.isArray(oldSteps) && newSteps && Array.isArray(newSteps)) {
      const maxLength = Math.max(oldSteps.length, newSteps.length);
      for (let i = 0; i < maxLength; i++) {
        const newStep = newSteps[i];
        const oldStep = oldSteps[i];
        
        // Проверяем наличие requirement в новом или старом этапе
        const hasNewRequirement = newStep?.requirement !== undefined && newStep?.requirement !== null;
        const hasOldRequirement = oldStep?.requirement !== undefined && oldStep?.requirement !== null;
        
        // Если requirement был добавлен или удален
        if (hasNewRequirement !== hasOldRequirement) {
          return true;
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
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Обновляет категории квеста
   * @param questId ID квеста
   * @param categoryIds Массив ID категорий (может быть undefined)
   * @throws NotFoundException если одна или несколько категорий не найдены
   */
  private async updateQuestCategories(questId: number, categoryIds?: number[]): Promise<void> {
    if (categoryIds === undefined) {
      return;
    }

    // Удаляем старые связи
    await this.questRepository.unlinkQuestFromCategories(questId);

    // Проверяем существование категорий, если указаны
    if (categoryIds.length > 0) {
      const existingCategories = await this.questRepository.findCategoriesByIds(categoryIds);
      if (existingCategories.length !== categoryIds.length) {
        throw new NotFoundException('Одна или несколько категорий не найдены');
      }

      // Создаем новые связи
      await this.questRepository.linkQuestToCategories(questId, categoryIds);
    }
  }

  async update(id: number, updateQuestDto: UpdateQuestDto, userId: number) {
    // Проверяем права на обновление
    await this.validateQuestUpdatePermissions(id, userId);

    // Получаем существующий квест для проверки изменений
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
      if (updateQuestDto.gallery && updateQuestDto.gallery.length > MAX_GALLERY_IMAGES) {
        throw new BadRequestException(`Галерея не может содержать более ${MAX_GALLERY_IMAGES} изображений`);
      }
      updateData.gallery = updateQuestDto.gallery;
    }
    
    // Проверяем изменения requirements
    const requirementsChanged = updateQuestDto.steps !== undefined
      ? this.checkRequirementsChanged(existingQuest.steps, updateQuestDto.steps)
      : false;
    
    if (updateQuestDto.steps !== undefined) {
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
    await this.updateQuestCategories(id, updateQuestDto.categoryIds);

    // Возвращаем обновленный квест с полной информацией
    return this.findOne(id);
  }

  async remove(id: number, userId: number) {
    // Проверяем существование квеста
    const quest = await this.questRepository.findById(id);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }

    // Проверяем, что пользователь является владельцем квеста
    if (quest.ownerId !== userId) {
      throw new ForbiddenException('Только владелец квеста может его удалить');
    }

    const deletedQuest = await this.questRepository.softDelete(id);
    if (!deletedQuest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }
    return deletedQuest;
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
    // Проверяем существование квеста
    const quest = await this.questRepository.findById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что пользователь является автором квеста
    if (quest.ownerId !== userId) {
      throw new ForbiddenException('Только автор квеста может завершить квест');
    }

    // Проверяем, что квест еще не завершен
    if (quest.status === 'completed') {
      throw new ConflictException('Квест уже завершен');
    }

    // Получаем всех участников квеста
    const participants = await this.questRepository.findQuestParticipants(questId);
    
    if (participants.length === 0) {
      throw new NotFoundException('У квеста нет участников');
    }

    // Обновляем статус квеста на 'completed'
    const completedQuest = await this.questRepository.update(questId, {
      status: 'completed',
    });

    if (!completedQuest) {
      throw new Error('Не удалось завершить квест');
    }

    // Обновляем статус userQuest на 'completed' для всех участников, если еще не completed
    for (const participant of participants) {
      if (participant.userQuestStatus !== 'completed') {
        await this.questRepository.updateUserQuest(participant.userQuestId, {
          status: 'completed',
          completedAt: new Date(),
        });
      }
    }

    // Получаем данные квеста для события
    const questData = await this.questRepository.findQuestDataForEvent(questId);

    // Эмитим событие завершения квеста для каждого участника
    for (const participant of participants) {
      this.questEventsService.emitQuestCompleted(questId, participant.userId, {
        ...(questData || {}),
        userId: participant.userId,
        experienceReward: quest.experienceReward,
        achievementId: quest.achievementId,
      });
    }

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

    const categoriesByQuestId = this.groupCategoriesByQuestId(allCategories);

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
    const categoriesByQuestId = this.groupCategoriesByQuestId(allCategories);

    return filteredQuests.map(quest => ({
      ...quest,
      categories: categoriesByQuestId.get(quest.id) || [],
    }));
  }

  async updateRequirementCurrentValue(
    questId: number,
    stepType: 'finance' | 'material' | 'contributers',
    updateRequirementDto: UpdateRequirementDto,
    userId: number,
  ) {
    // Проверяем существование квеста
    const quest = await this.questRepository.findById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что пользователь является владельцем квеста
    if (quest.ownerId !== userId) {
      throw new ForbiddenException('Только владелец квеста может обновить требование этапа');
    }

    // Проверяем статус квеста
    if (quest.status !== 'active') {
      throw new BadRequestException(`Квест со статусом '${quest.status}' не может быть изменен`);
    }

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Валидация типа этапа
    const allowedTypes: Array<'finance' | 'material' | 'contributers'> = [
      'finance',
      'material',
      'contributers',
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

    const requirement = step.requirement as { currentValue?: number; targetValue?: number };
    
    // Проверяем, что targetValue существует
    if (requirement.targetValue === undefined || requirement.targetValue === null) {
      throw new BadRequestException('У требования отсутствует targetValue');
    }

    // Определяем новое значение currentValue
    let newCurrentValue: number;
    
    if (updateRequirementDto.currentValue === undefined) {
      // Если currentValue не передан, вычисляем значение в зависимости от типа этапа
      if (stepType === 'contributers') {
        // Для типа contributers считаем количество подтверждённых contributers из таблицы quest_contributers
        newCurrentValue = await this.contributerRepository.getConfirmedContributersCount(questId);
      } else {
        // Для finance и material считаем сумму всех contribute_value из quest_step_volunteers
        newCurrentValue = await this.stepVolunteerRepository.getSumContributeValue(questId, stepType);
      }
    } else {
      // Если currentValue передан, используем его напрямую
      newCurrentValue = updateRequirementDto.currentValue;
    }

    // Обновляем только currentValue требования (прогресс считается в репозитории в runtime)
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
    this.logger.debug(
      `Requirement currentValue updated for quest ${questId}, step type '${stepType}', index ${stepIndex}: ${newCurrentValue}`,
    );
    this.questEventsService.emitRequirementUpdated(questId, updatedQuest.steps);

    // Возвращаем обновленный квест с полной информацией
    return this.findOne(questId);
  }

  /**
   * Синхронизирует currentValue в этапе квеста с актуальным значением
   * Для этапов типа 'contributers' синхронизирует с количеством подтверждённых contributers из таблицы quest_contributers
   * Для других типов этапов (finance, material) синхронизирует с суммой contribute_value из quest_step_volunteers
   * Этот метод обновляет currentValue напрямую в этапе, что быстрее чем вычислять значение каждый раз
   * Используется для автоматической синхронизации при изменении данных в других местах кода
   * @param questId ID квеста
   * @param stepType Тип шага
   * @returns Новое значение currentValue
   */
  async syncRequirementCurrentValue(
    questId: number,
    stepType: 'finance' | 'material' | 'contributers',
  ): Promise<number> {
    // Определяем новое значение currentValue в зависимости от типа этапа
    let newCurrentValue: number;
    if (stepType === 'contributers') {
      // Для типа contributers считаем количество подтверждённых contributers из таблицы quest_contributers
      newCurrentValue = await this.contributerRepository.getConfirmedContributersCount(questId);
    } else {
      // Для finance и material считаем сумму всех contribute_value из quest_step_volunteers
      newCurrentValue = await this.stepVolunteerRepository.getSumContributeValue(questId, stepType);
    }
    
    // Получаем квест
    const quest = await this.questRepository.findById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем наличие steps
    if (!quest.steps || !Array.isArray(quest.steps)) {
      throw new BadRequestException('У квеста нет этапов');
    }

    // Ищем этап по типу
    const stepIndex = quest.steps.findIndex(step => step?.type === stepType);
    if (stepIndex === -1) {
      throw new BadRequestException(`Этап с типом '${stepType}' не найден в квесте`);
    }

    const step = quest.steps[stepIndex];
    if (!step) {
      throw new BadRequestException(`Этап с типом '${stepType}' не найден`);
    }

    // Проверяем наличие requirement
    if (!step.requirement) {
      throw new BadRequestException(`У этапа с типом '${stepType}' нет требования`);
    }

    const requirement = step.requirement as { currentValue?: number; targetValue?: number };
    
    // Проверяем, что targetValue существует
    if (requirement.targetValue === undefined || requirement.targetValue === null) {
      throw new BadRequestException('У требования отсутствует targetValue');
    }

    // Обновляем currentValue в этапе
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
    this.logger.debug(
      `Requirement currentValue synced for quest ${questId}, step type '${stepType}': ${newCurrentValue}`,
    );
    this.questEventsService.emitRequirementUpdated(questId, updatedQuest.steps);

    return newCurrentValue;
  }

  async archiveQuest(userId: number, questId: number) {
    // Проверяем существование квеста
    const quest = await this.questRepository.findById(questId);
    
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что пользователь является автором квеста
    if (quest.ownerId !== userId) {
      throw new ForbiddenException('Только автор квеста может архивировать квест');
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

  async getQuestUsers(questId: number) {
    // Проверяем существование квеста
    const quest = await this.questRepository.findById(questId);
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Получаем всех пользователей квеста
    return await this.questRepository.findQuestUsers(questId);
  }

}

