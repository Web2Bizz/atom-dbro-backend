import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExperienceService } from './experience.service';
import { UserService } from '../user/user.service';
import { NotFoundException } from '@nestjs/common';

describe('ExperienceService', () => {
  let service: ExperienceService;
  let userService: UserService;

  const mockUser = {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    email: 'ivan@example.com',
    experience: 0,
    level: 1,
    recordStatus: 'CREATED',
  };

  let mockUserService: {
    findOne: ReturnType<typeof vi.fn>;
    updateExperienceAndLevel: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockUserService = {
      findOne: vi.fn(),
      updateExperienceAndLevel: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperienceService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<ExperienceService>(ExperienceService);
    userService = module.get<UserService>(UserService);
    
    (service as any).userService = mockUserService;
  });

  describe('calculateLevel', () => {
    it('should return level 1 for negative experience', () => {
      const result = service.calculateLevel(-10);
      expect(result).toBe(1);
    });

    it('should return level 1 for 0 experience', () => {
      const result = service.calculateLevel(0);
      expect(result).toBe(1);
    });

    it('should return level 1 for 149 experience (below level 2 boundary: 100 * 1.5^1 = 150)', () => {
      const result = service.calculateLevel(149);
      expect(result).toBe(1);
    });

    it('should return level 2 for 150 experience (exact boundary of level 2: 100 * 1.5^1)', () => {
      const result = service.calculateLevel(150);
      expect(result).toBe(2);
    });

    it('should return level 2 for 224 experience (below level 3 boundary: 100 * 1.5^2 = 225)', () => {
      const result = service.calculateLevel(224);
      expect(result).toBe(2);
    });

    it('should return level 3 for 225 experience (exact boundary of level 3: 100 * 1.5^2)', () => {
      const result = service.calculateLevel(225);
      expect(result).toBe(3);
    });

    it('should return level 3 for 337 experience (below level 4 boundary: 100 * 1.5^3 = 337.5)', () => {
      const result = service.calculateLevel(337);
      expect(result).toBe(3);
    });

    it('should return level 4 for 337.5 experience (exact boundary of level 4: 100 * 1.5^3)', () => {
      const result = service.calculateLevel(337.5);
      expect(result).toBe(4);
    });

    it('should return level 4 for 505 experience (below level 5 boundary: 100 * 1.5^4 = 506.25)', () => {
      const result = service.calculateLevel(505);
      expect(result).toBe(4);
    });

    it('should return level 5 for 506.25 experience (exact boundary of level 5: 100 * 1.5^4)', () => {
      const result = service.calculateLevel(506.25);
      expect(result).toBe(5);
    });

    it('should return level 5 for 758 experience (below level 6 boundary: 100 * 1.5^5 = 759.375)', () => {
      const result = service.calculateLevel(758);
      expect(result).toBe(5);
    });

    it('should return level 6 for 759.375 experience (exact boundary of level 6: 100 * 1.5^5)', () => {
      const result = service.calculateLevel(759.375);
      expect(result).toBe(6);
    });

    it('should correctly calculate level for large experience values (1000)', () => {
      const result = service.calculateLevel(1000);
      expect(result).toBeGreaterThan(5);
    });

    it('should correctly calculate level for large experience values (5000)', () => {
      const result = service.calculateLevel(5000);
      expect(result).toBeGreaterThan(8);
    });

    it('should correctly calculate level for large experience values (10000)', () => {
      const result = service.calculateLevel(10000);
      expect(result).toBeGreaterThan(10);
    });

    it('should handle fractional experience values', () => {
      const result = service.calculateLevel(150.5);
      expect(result).toBe(2);
    });

    it('should verify formula correctness: required experience for level N = 100 * 1.5^(N-1)', () => {
      // Проверяем формулу для нескольких уровней
      const level2Required = 100 * Math.pow(1.5, 2 - 1); // 150
      expect(service.calculateLevel(level2Required)).toBe(2);
      expect(service.calculateLevel(level2Required - 0.1)).toBe(1);

      const level3Required = 100 * Math.pow(1.5, 3 - 1); // 225
      expect(service.calculateLevel(level3Required)).toBe(3);
      expect(service.calculateLevel(level3Required - 0.1)).toBe(2);

      const level4Required = 100 * Math.pow(1.5, 4 - 1); // 337.5
      expect(service.calculateLevel(level4Required)).toBe(4);
      expect(service.calculateLevel(level4Required - 0.1)).toBe(3);
    });
  });

  describe('addExperience', () => {
    it('should successfully add experience and update level', async () => {
      const userId = 1;
      const amount = 100;
      const userWithNewExperience = { ...mockUser, experience: 100, level: 1 };
      
      mockUserService.findOne.mockResolvedValue(mockUser);
      mockUserService.updateExperienceAndLevel.mockResolvedValue(userWithNewExperience);

      const result = await service.addExperience(userId, amount);

      expect(result).toEqual({
        level: 1,
        experience: 100,
      });
      expect(mockUserService.findOne).toHaveBeenCalledWith(userId);
      expect(mockUserService.updateExperienceAndLevel).toHaveBeenCalledWith(userId, 100, 1);
    });

    it('should call userService.findOne with correct userId', async () => {
      const userId = 1;
      const amount = 50;
      
      mockUserService.findOne.mockResolvedValue(mockUser);
      mockUserService.updateExperienceAndLevel.mockResolvedValue(mockUser);

      await service.addExperience(userId, amount);

      expect(mockUserService.findOne).toHaveBeenCalledWith(userId);
    });

    it('should call userService.updateExperienceAndLevel with correct parameters', async () => {
      const userId = 1;
      const amount = 150;
      const newExperience = mockUser.experience + amount; // 150
      const newLevel = service.calculateLevel(newExperience); // 2
      
      mockUserService.findOne.mockResolvedValue(mockUser);
      mockUserService.updateExperienceAndLevel.mockResolvedValue({
        ...mockUser,
        experience: newExperience,
        level: newLevel,
      });

      await service.addExperience(userId, amount);

      expect(mockUserService.updateExperienceAndLevel).toHaveBeenCalledWith(
        userId,
        newExperience,
        newLevel
      );
    });

    it('should correctly calculate new level after adding experience', async () => {
      const userId = 1;
      const amount = 150;
      const newExperience = mockUser.experience + amount; // 150
      const expectedLevel = 2; // 150 опыта = уровень 2
      
      mockUserService.findOne.mockResolvedValue(mockUser);
      mockUserService.updateExperienceAndLevel.mockResolvedValue({
        ...mockUser,
        experience: newExperience,
        level: expectedLevel,
      });

      const result = await service.addExperience(userId, amount);

      expect(result.level).toBe(expectedLevel);
      expect(result.experience).toBe(newExperience);
    });

    it('should handle level up - transition from level 1 to 2 when reaching 150 experience', async () => {
      const userId = 1;
      const userWith149Exp = { ...mockUser, experience: 149, level: 1 };
      const amount = 1; // Добавляем 1 опыт, чтобы достичь 150
      
      mockUserService.findOne.mockResolvedValue(userWith149Exp);
      mockUserService.updateExperienceAndLevel.mockResolvedValue({
        ...userWith149Exp,
        experience: 150,
        level: 2,
      });

      const result = await service.addExperience(userId, amount);

      expect(result.level).toBe(2);
      expect(result.experience).toBe(150);
      expect(mockUserService.updateExperienceAndLevel).toHaveBeenCalledWith(userId, 150, 2);
    });

    it('should handle level up - transition from level 2 to 3 when reaching 225 experience', async () => {
      const userId = 1;
      const userWith224Exp = { ...mockUser, experience: 224, level: 2 };
      const amount = 1; // Добавляем 1 опыт, чтобы достичь 225
      
      mockUserService.findOne.mockResolvedValue(userWith224Exp);
      mockUserService.updateExperienceAndLevel.mockResolvedValue({
        ...userWith224Exp,
        experience: 225,
        level: 3,
      });

      const result = await service.addExperience(userId, amount);

      expect(result.level).toBe(3);
      expect(result.experience).toBe(225);
      expect(mockUserService.updateExperienceAndLevel).toHaveBeenCalledWith(userId, 225, 3);
    });

    it('should handle level up - transition from level 3 to 4 when reaching 337.5 experience', async () => {
      const userId = 1;
      const userWith337Exp = { ...mockUser, experience: 337, level: 3 };
      const amount = 0.5; // Добавляем 0.5 опыта, чтобы достичь 337.5
      
      mockUserService.findOne.mockResolvedValue(userWith337Exp);
      mockUserService.updateExperienceAndLevel.mockResolvedValue({
        ...userWith337Exp,
        experience: 337.5,
        level: 4,
      });

      const result = await service.addExperience(userId, amount);

      expect(result.level).toBe(4);
      expect(result.experience).toBe(337.5);
      expect(mockUserService.updateExperienceAndLevel).toHaveBeenCalledWith(userId, 337.5, 4);
    });

    it('should not increase level if experience is insufficient for next level', async () => {
      const userId = 1;
      const userWith100Exp = { ...mockUser, experience: 100, level: 1 };
      const amount = 49; // Добавляем 49 опыта, получаем 149 (недостаточно для уровня 2)
      
      mockUserService.findOne.mockResolvedValue(userWith100Exp);
      mockUserService.updateExperienceAndLevel.mockResolvedValue({
        ...userWith100Exp,
        experience: 149,
        level: 1,
      });

      const result = await service.addExperience(userId, amount);

      expect(result.level).toBe(1);
      expect(result.experience).toBe(149);
      expect(mockUserService.updateExperienceAndLevel).toHaveBeenCalledWith(userId, 149, 1);
    });

    it('should increase level only when experience reaches exact boundary', async () => {
      const userId = 1;
      const userWith149Exp = { ...mockUser, experience: 149, level: 1 };
      const amount = 1; // Добавляем 1 опыт, достигаем точной границы 150
      
      mockUserService.findOne.mockResolvedValue(userWith149Exp);
      mockUserService.updateExperienceAndLevel.mockResolvedValue({
        ...userWith149Exp,
        experience: 150,
        level: 2,
      });

      const result = await service.addExperience(userId, amount);

      expect(result.level).toBe(2);
      expect(result.experience).toBe(150);
    });

    it('should throw NotFoundException when user is not found', async () => {
      const userId = 999;
      const amount = 100;
      
      mockUserService.findOne.mockResolvedValue(undefined);

      await expect(service.addExperience(userId, amount)).rejects.toThrow(NotFoundException);
      await expect(service.addExperience(userId, amount)).rejects.toThrow(
        `Пользователь с ID ${userId} не найден`
      );
      expect(mockUserService.findOne).toHaveBeenCalledWith(userId);
      expect(mockUserService.updateExperienceAndLevel).not.toHaveBeenCalled();
    });

    it('should handle negative experience amount (should work, but not decrease level below 1)', async () => {
      const userId = 1;
      const userWith100Exp = { ...mockUser, experience: 100, level: 1 };
      const amount = -50; // Вычитаем 50 опыта
      const newExperience = 100 - 50; // 50
      const newLevel = service.calculateLevel(newExperience); // 1
      
      mockUserService.findOne.mockResolvedValue(userWith100Exp);
      mockUserService.updateExperienceAndLevel.mockResolvedValue({
        ...userWith100Exp,
        experience: newExperience,
        level: newLevel,
      });

      const result = await service.addExperience(userId, amount);

      expect(result.level).toBe(1); // Уровень не должен быть ниже 1
      expect(result.experience).toBe(50);
      expect(mockUserService.updateExperienceAndLevel).toHaveBeenCalledWith(userId, 50, 1);
    });

    it('should handle zero experience amount (level should not change)', async () => {
      const userId = 1;
      const userWith100Exp = { ...mockUser, experience: 100, level: 1 };
      const amount = 0;
      
      mockUserService.findOne.mockResolvedValue(userWith100Exp);
      mockUserService.updateExperienceAndLevel.mockResolvedValue({
        ...userWith100Exp,
        experience: 100,
        level: 1,
      });

      const result = await service.addExperience(userId, amount);

      expect(result.level).toBe(1);
      expect(result.experience).toBe(100);
      expect(mockUserService.updateExperienceAndLevel).toHaveBeenCalledWith(userId, 100, 1);
    });

    it('should correctly recalculate level when adding experience according to formula', async () => {
      const userId = 1;
      const userWith149Exp = { ...mockUser, experience: 149, level: 1 };
      const amount = 1;
      const newExperience = 150;
      const calculatedLevel = service.calculateLevel(newExperience); // Должен быть 2
      
      mockUserService.findOne.mockResolvedValue(userWith149Exp);
      mockUserService.updateExperienceAndLevel.mockResolvedValue({
        ...userWith149Exp,
        experience: newExperience,
        level: calculatedLevel,
      });

      const result = await service.addExperience(userId, amount);

      // Проверяем, что уровень рассчитан правильно по формуле
      const expectedLevel = 2; // 100 * 1.5^1 = 150
      expect(result.level).toBe(expectedLevel);
      expect(result.experience).toBe(newExperience);
      expect(mockUserService.updateExperienceAndLevel).toHaveBeenCalledWith(
        userId,
        newExperience,
        expectedLevel
      );
    });
  });
});

