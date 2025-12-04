import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationTypeService } from './organization-type.service';
import { NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

describe('OrganizationTypeService', () => {
  let service: OrganizationTypeService;
  let db: NodePgDatabase;

  const mockOrganizationType = {
    id: 1,
    name: 'Благотворительный фонд',
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrganizationType]),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationTypeService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb as any,
        },
      ],
    }).compile();

    service = module.get<OrganizationTypeService>(OrganizationTypeService);
    db = module.get<NodePgDatabase>(DATABASE_CONNECTION);
    
    (service as any).db = mockDb;
  });

  describe('findAll', () => {
    it('should successfully return list of organization types without session', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrganizationType]),
        }),
      });

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockOrganizationType.id,
        name: mockOrganizationType.name,
        recordStatus: mockOrganizationType.recordStatus,
      });
    });
  });

  describe('findOne', () => {
    it('should successfully return organization type by id', async () => {
      const typeId = 1;
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrganizationType]),
        }),
      });

      const result = await service.findOne(typeId);

      expect(result).toMatchObject({
        id: mockOrganizationType.id,
        name: mockOrganizationType.name,
        recordStatus: mockOrganizationType.recordStatus,
      });
    });

    it('should throw NotFoundException when organization type does not exist', async () => {
      const typeId = 999;
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(service.findOne(typeId)).rejects.toThrow(NotFoundException);
    });
  });
});

