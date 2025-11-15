import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { quests, userQuests, users } from '../database/schema';
import { eq, and, ne } from 'drizzle-orm';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';

@Injectable()
export class QuestService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async create(createQuestDto: CreateQuestDto) {
    const [quest] = await this.db
      .insert(quests)
      .values({
        title: createQuestDto.title,
        description: createQuestDto.description,
        status: createQuestDto.status || 'active',
        experienceReward: createQuestDto.experienceReward || 0,
        requirements: createQuestDto.requirements || {},
      })
      .returning();
    return quest;
  }

  async findAll() {
    return this.db.select().from(quests);
  }

  async findByStatus(status?: 'active' | 'archived' | 'completed') {
    if (status) {
      return this.db
        .select()
        .from(quests)
        .where(eq(quests.status, status));
    }
    return this.db.select().from(quests);
  }

  async findOne(id: number) {
    const [quest] = await this.db
      .select()
      .from(quests)
      .where(eq(quests.id, id));
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }
    return quest;
  }

  async update(id: number, updateQuestDto: UpdateQuestDto) {
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
    if (updateQuestDto.requirements !== undefined) {
      updateData.requirements = updateQuestDto.requirements;
    }

    const [quest] = await this.db
      .update(quests)
      .set(updateData)
      .where(eq(quests.id, id))
      .returning();
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }
    return quest;
  }

  async remove(id: number) {
    const [quest] = await this.db
      .delete(quests)
      .where(eq(quests.id, id))
      .returning();
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }
    return quest;
  }

  async joinQuest(userId: number, questId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем существование квеста
    const [quest] = await this.db
      .select()
      .from(quests)
      .where(eq(quests.id, questId));
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что квест активен
    if (quest.status !== 'active') {
      throw new BadRequestException('Квест не доступен для выполнения');
    }

    // Проверяем, не присоединился ли уже этот квест пользователем
    const [existingUserQuest] = await this.db
      .select()
      .from(userQuests)
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.questId, questId),
        ),
      );
    if (existingUserQuest) {
      throw new ConflictException('Пользователь уже присоединился к этому квесту');
    }

    // Присоединяемся к квесту
    const [userQuest] = await this.db
      .insert(userQuests)
      .values({
        userId,
        questId,
        status: 'in_progress',
      })
      .returning();
    return userQuest;
  }

  async leaveQuest(userId: number, questId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем существование квеста
    const [quest] = await this.db
      .select()
      .from(quests)
      .where(eq(quests.id, questId));
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что пользователь участвует в квесте
    const [userQuest] = await this.db
      .select()
      .from(userQuests)
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.questId, questId),
        ),
      );
    if (!userQuest) {
      throw new NotFoundException('Пользователь не участвует в этом квесте');
    }

    // Проверяем, что квест еще не завершен
    if (userQuest.status === 'completed') {
      throw new BadRequestException('Нельзя покинуть уже завершенный квест');
    }

    // Удаляем запись о участии в квесте
    const [deletedUserQuest] = await this.db
      .delete(userQuests)
      .where(eq(userQuests.id, userQuest.id))
      .returning();
    
    return deletedUserQuest;
  }

  async completeQuest(userId: number, questId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем существование квеста
    const [quest] = await this.db
      .select()
      .from(quests)
      .where(eq(quests.id, questId));
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что квест начат пользователем
    const [userQuest] = await this.db
      .select()
      .from(userQuests)
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.questId, questId),
        ),
      );
    if (!userQuest) {
      throw new NotFoundException('Пользователь не начал этот квест');
    }

    if (userQuest.status === 'completed') {
      throw new ConflictException('Квест уже выполнен');
    }

    // Завершаем квест
    const [completedQuest] = await this.db
      .update(userQuests)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(userQuests.id, userQuest.id))
      .returning();

    // Начисляем опыт пользователю
    const newExperience = user.experience + quest.experienceReward;
    await this.db
      .update(users)
      .set({ experience: newExperience })
      .where(eq(users.id, userId));

    return completedQuest;
  }

  async getUserQuests(userId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Получаем все квесты пользователя с информацией о квесте
    return this.db
      .select({
        id: userQuests.id,
        userId: userQuests.userId,
        questId: userQuests.questId,
        status: userQuests.status,
        startedAt: userQuests.startedAt,
        completedAt: userQuests.completedAt,
        quest: {
          id: quests.id,
          title: quests.title,
          description: quests.description,
          status: quests.status,
          experienceReward: quests.experienceReward,
          requirements: quests.requirements,
          createdAt: quests.createdAt,
          updatedAt: quests.updatedAt,
        },
      })
      .from(userQuests)
      .innerJoin(quests, eq(userQuests.questId, quests.id))
      .where(eq(userQuests.userId, userId));
  }

  async getAvailableQuests(userId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Получаем все активные квесты
    const activeQuests = await this.db
      .select()
      .from(quests)
      .where(eq(quests.status, 'active'));

    // Получаем квесты, которые пользователь уже начал
    const userStartedQuests = await this.db
      .select({ questId: userQuests.questId })
      .from(userQuests)
      .where(eq(userQuests.userId, userId));

    const startedQuestIds = new Set(userStartedQuests.map(uq => uq.questId));

    // Фильтруем квесты, которые пользователь еще не начал
    return activeQuests.filter(quest => !startedQuestIds.has(quest.id));
  }
}

