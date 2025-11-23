import { Injectable, Inject, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users, organizations } from '../database/schema';
import { eq, ne, and } from 'drizzle-orm';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  /**
   * Найти пользователя по email (включая passwordHash)
   * @param email Email пользователя
   * @returns Пользователь или undefined
   */
  async findByEmail(email: string): Promise<typeof users.$inferSelect | undefined> {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(and(
          eq(users.email, email),
          ne(users.recordStatus, 'DELETED')
        ));
      
      return user;
    } catch (error: any) {
      this.logger.error(`Ошибка в findByEmail для email ${email}:`, error);
      this.logger.error('Детали ошибки:', {
        method: 'findByEmail',
        email,
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

  /**
   * Найти пользователя по ID (без passwordHash)
   * @param id ID пользователя
   * @returns Пользователь или undefined
   */
  async findById(id: number): Promise<Omit<typeof users.$inferSelect, 'passwordHash'> | undefined> {
    try {
      const [user] = await this.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          middleName: users.middleName,
          email: users.email,
          avatarUrls: users.avatarUrls,
          role: users.role,
          level: users.level,
          experience: users.experience,
          organisationId: users.organisationId,
          recordStatus: users.recordStatus,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(and(
          eq(users.id, id),
          ne(users.recordStatus, 'DELETED')
        ));
      
      return user;
    } catch (error: any) {
      this.logger.error(`Ошибка в findById для пользователя ID ${id}:`, error);
      this.logger.error('Детали ошибки:', {
        method: 'findById',
        userId: id,
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

  /**
   * Найти пользователя по ID с passwordHash (для внутренних операций)
   * @param id ID пользователя
   * @returns Пользователь с passwordHash или undefined
   */
  async findByIdWithPassword(id: number): Promise<typeof users.$inferSelect | undefined> {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(and(
          eq(users.id, id),
          ne(users.recordStatus, 'DELETED')
        ));
      
      return user;
    } catch (error: any) {
      this.logger.error(`Ошибка в findByIdWithPassword для пользователя ID ${id}:`, error);
      this.logger.error('Детали ошибки:', {
        method: 'findByIdWithPassword',
        userId: id,
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

  /**
   * Найти всех пользователей (без passwordHash)
   * @returns Массив пользователей
   */
  async findAll(): Promise<Array<Omit<typeof users.$inferSelect, 'passwordHash'>>> {
    try {
      return await this.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          middleName: users.middleName,
          email: users.email,
          avatarUrls: users.avatarUrls,
          role: users.role,
          level: users.level,
          experience: users.experience,
          organisationId: users.organisationId,
          recordStatus: users.recordStatus,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(ne(users.recordStatus, 'DELETED'));
    } catch (error: any) {
      this.logger.error('Ошибка в findAll:', error);
      this.logger.error('Детали ошибки:', {
        method: 'findAll',
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

  /**
   * Проверить существование пользователя по email
   * @param email Email пользователя
   * @returns true если пользователь существует
   */
  async existsByEmail(email: string): Promise<boolean> {
    try {
      const [user] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.email, email),
          ne(users.recordStatus, 'DELETED')
        ));
      
      return !!user;
    } catch (error: any) {
      this.logger.error(`Ошибка в existsByEmail для email ${email}:`, error);
      this.logger.error('Детали ошибки:', {
        method: 'existsByEmail',
        email,
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

  /**
   * Создать пользователя
   * @param data Данные пользователя
   * @returns Созданный пользователь
   * @throws ConflictException если пользователь с таким email уже существует
   */
  async create(data: {
    firstName: string;
    lastName: string;
    middleName?: string | null;
    email: string;
    passwordHash: string;
    avatarUrls: Record<number, string>;
    role?: string;
    level?: number;
    experience?: number;
    organisationId?: number | null;
  }): Promise<typeof users.$inferSelect> {
    try {
      // Проверяем уникальность email (включая удаленных пользователей)
      const [userWithEmail] = await this.db
        .select({
          id: users.id,
          email: users.email,
          recordStatus: users.recordStatus,
        })
        .from(users)
        .where(eq(users.email, data.email));

      if (userWithEmail) {
        // Если email занят удаленным пользователем
        if (userWithEmail.recordStatus === 'DELETED') {
          throw new ConflictException(
            `Email ${data.email} уже используется удаленным пользователем (ID ${userWithEmail.id}). Обратитесь к администратору для восстановления или удаления учетной записи.`
          );
        }
        
        // Если email занят активным пользователем
        throw new ConflictException(
          `Email ${data.email} уже используется`
        );
      }

      // Если указана organisationId, проверяем существование организации
      if (data.organisationId !== undefined && data.organisationId !== null) {
        const [organization] = await this.db
          .select({ id: organizations.id })
          .from(organizations)
          .where(and(
            eq(organizations.id, data.organisationId),
            ne(organizations.recordStatus, 'DELETED')
          ));
        
        if (!organization) {
          throw new BadRequestException(`Организация с ID ${data.organisationId} не найдена`);
        }
      }

      const [user] = await this.db
        .insert(users)
        .values({
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName ?? null,
          email: data.email,
          passwordHash: data.passwordHash,
          avatarUrls: data.avatarUrls,
          role: data.role ?? 'USER',
          level: data.level ?? 1,
          experience: data.experience ?? 0,
          organisationId: data.organisationId ?? null,
        })
        .returning();
      
      if (!user) {
        throw new Error('Не удалось создать пользователя');
      }

      return user;
    } catch (error: any) {
      // Если это уже NestJS исключение, пробрасываем как есть
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Проверяем коды ошибок PostgreSQL
      if (error?.code) {
        // 23503 - foreign_key_violation
        if (error.code === '23503') {
          this.logger.warn(`Foreign key violation при создании пользователя:`, error.detail);
          
          if (error.detail?.includes('organisation_id')) {
            throw new BadRequestException(
              `Организация с ID ${data.organisationId} не найдена. Невозможно создать пользователя с несуществующей организацией.`
            );
          }
          
          throw new BadRequestException('Невозможно создать пользователя: указана несуществующая связанная сущность');
        }
        
        // 23505 - unique_violation
        if (error.code === '23505') {
          if (error.detail?.includes('email')) {
            throw new ConflictException(`Email ${data.email} уже используется`);
          }
          throw new ConflictException('Нарушение уникальности данных');
        }
      }
      
      this.logger.error('Ошибка в create:', error);
      this.logger.error('Детали ошибки:', {
        method: 'create',
        email: data.email,
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

  /**
   * Обновить пользователя
   * @param id ID пользователя
   * @param data Данные для обновления
   * @returns Обновленный пользователь
   * @throws NotFoundException если пользователь не найден
   * @throws ConflictException если email уже используется другим пользователем
   */
  async update(
    id: number,
    data: Partial<{
      firstName: string;
      lastName: string;
      middleName: string | null;
      email: string;
      avatarUrls: Record<number, string>;
      role: string;
      organisationId: number | null;
    }>,
  ): Promise<typeof users.$inferSelect> {
    try {
      // Проверяем существование пользователя
      const existingUser = await this.findByIdWithPassword(id);
      if (!existingUser) {
        throw new NotFoundException(`Пользователь с ID ${id} не найден или был удален`);
      }

      // Если обновляется email, проверяем уникальность
      if (data.email && data.email !== existingUser.email) {
        // Проверяем email среди всех пользователей (включая удаленных)
        const [userWithEmail] = await this.db
          .select({
            id: users.id,
            email: users.email,
            recordStatus: users.recordStatus,
          })
          .from(users)
          .where(eq(users.email, data.email));

        if (userWithEmail) {
          // Если email занят удаленным пользователем
          if (userWithEmail.recordStatus === 'DELETED') {
            throw new ConflictException(
              `Email ${data.email} уже используется удаленным пользователем (ID ${userWithEmail.id}). Обратитесь к администратору для восстановления или удаления учетной записи.`
            );
          }
          
          // Если email занят активным пользователем
          throw new ConflictException(
            `Email ${data.email} уже используется другим пользователем (ID ${userWithEmail.id})`
          );
        }
      }

      // Если обновляется organisationId, проверяем существование организации
      if (data.organisationId !== undefined && data.organisationId !== null) {
        const [organization] = await this.db
          .select({ id: organizations.id })
          .from(organizations)
          .where(and(
            eq(organizations.id, data.organisationId),
            ne(organizations.recordStatus, 'DELETED')
          ));
        
        if (!organization) {
          throw new BadRequestException(`Организация с ID ${data.organisationId} не найдена`);
        }
      }

      // Фильтруем только определенные поля (исключаем undefined)
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.firstName !== undefined) {
        updateData.firstName = data.firstName;
      }
      if (data.lastName !== undefined) {
        updateData.lastName = data.lastName;
      }
      if (data.middleName !== undefined) {
        updateData.middleName = data.middleName;
      }
      if (data.email !== undefined) {
        updateData.email = data.email;
      }
      if (data.avatarUrls !== undefined) {
        updateData.avatarUrls = data.avatarUrls;
      }
      if (data.organisationId !== undefined) {
        updateData.organisationId = data.organisationId;
      }

      const [user] = await this.db
        .update(users)
        .set(updateData)
        .where(and(
          eq(users.id, id),
          ne(users.recordStatus, 'DELETED')
        ))
        .returning();
      
      if (!user) {
        // Если UPDATE не вернул результат, значит пользователь был удален между проверкой и обновлением
        throw new NotFoundException(`Пользователь с ID ${id} не найден или был удален`);
      }

      return user;
    } catch (error: any) {
      // Если это уже NestJS исключение, пробрасываем как есть
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Проверяем коды ошибок PostgreSQL
      if (error?.code) {
        // 23503 - foreign_key_violation
        if (error.code === '23503') {
          this.logger.warn(`Foreign key violation при обновлении пользователя ID ${id}:`, error.detail);
          
          // Проверяем, какое поле вызвало ошибку
          if (error.detail?.includes('organisation_id')) {
            throw new BadRequestException(
              `Организация с ID ${data.organisationId} не найдена. Невозможно установить связь с несуществующей организацией.`
            );
          }
          
          throw new BadRequestException('Невозможно обновить пользователя: указана несуществующая связанная сущность');
        }
        
        // 23505 - unique_violation
        if (error.code === '23505') {
          if (error.detail?.includes('email')) {
            throw new ConflictException('Пользователь с таким email уже существует');
          }
          throw new ConflictException('Нарушение уникальности данных');
        }
      }
      
      // Проверяем, не является ли ошибка "Failed query" из-за отсутствия записей
      if (error?.message?.includes('Failed query') && error?.message?.includes('update "users"')) {
        this.logger.warn(`Попытка обновления несуществующего или удаленного пользователя ID ${id}`);
        throw new NotFoundException(`Пользователь с ID ${id} не найден или был удален`);
      }
      
      this.logger.error(`Ошибка в update для пользователя ID ${id}:`, error);
      this.logger.error('Детали ошибки:', {
        method: 'update',
        userId: id,
        updateData: data,
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

  /**
   * Обновить пароль пользователя
   * @param id ID пользователя
   * @param passwordHash Новый хеш пароля
   * @returns Обновленный пользователь
   * @throws NotFoundException если пользователь не найден
   */
  async updatePassword(id: number, passwordHash: string): Promise<typeof users.$inferSelect> {
    try {
      const [user] = await this.db
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(and(
          eq(users.id, id),
          ne(users.recordStatus, 'DELETED')
        ))
        .returning();
      
      if (!user) {
        throw new NotFoundException(`Пользователь с ID ${id} не найден`);
      }

      return user;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Ошибка в updatePassword для пользователя ID ${id}:`, error);
      this.logger.error('Детали ошибки:', {
        method: 'updatePassword',
        userId: id,
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

  /**
   * Обновить опыт и уровень пользователя
   * @param id ID пользователя
   * @param experience Новое значение опыта
   * @param level Новый уровень
   * @returns Обновленный пользователь
   * @throws NotFoundException если пользователь не найден
   */
  async updateExperienceAndLevel(
    id: number,
    experience: number,
    level: number,
  ): Promise<typeof users.$inferSelect> {
    try {
      const [user] = await this.db
        .update(users)
        .set({
          experience,
          level,
          updatedAt: new Date(),
        })
        .where(and(
          eq(users.id, id),
          ne(users.recordStatus, 'DELETED')
        ))
        .returning();
      
      if (!user) {
        throw new NotFoundException(`Пользователь с ID ${id} не найден`);
      }

      return user;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Ошибка в updateExperienceAndLevel для пользователя ID ${id}:`, error);
      this.logger.error('Детали ошибки:', {
        method: 'updateExperienceAndLevel',
        userId: id,
        experience,
        level,
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

  /**
   * Удалить пользователя (мягкое удаление)
   * @param id ID пользователя
   * @returns Обновленный пользователь
   * @throws NotFoundException если пользователь не найден
   */
  async remove(id: number): Promise<typeof users.$inferSelect> {
    try {
      const [user] = await this.db
        .update(users)
        .set({
          recordStatus: 'DELETED',
          updatedAt: new Date(),
        })
        .where(and(
          eq(users.id, id),
          ne(users.recordStatus, 'DELETED')
        ))
        .returning();
      
      if (!user) {
        throw new NotFoundException(`Пользователь с ID ${id} не найден`);
      }

      return user;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Ошибка в remove для пользователя ID ${id}:`, error);
      this.logger.error('Детали ошибки:', {
        method: 'remove',
        userId: id,
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
}

