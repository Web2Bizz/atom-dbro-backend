import { pgTable, serial, varchar, decimal, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Регионы
export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Города
export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  regionId: integer('region_id').references(() => regions.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Пользователи
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  middleName: varchar('middle_name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  cityId: integer('city_id').references(() => cities.id),
  level: integer('level').default(1).notNull(),
  experience: integer('experience').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Виды помощи
export const helpTypes = pgTable('help_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Организации
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  cityId: integer('city_id').references(() => cities.id).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Связующая таблица: владельцы организаций
export const organizationOwners = pgTable('organization_owners', {
  organizationId: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
});

// Связующая таблица: виды помощи организаций
export const organizationHelpTypes = pgTable('organization_help_types', {
  organizationId: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),
  helpTypeId: integer('help_type_id')
    .references(() => helpTypes.id)
    .notNull(),
});

// Relations
export const regionsRelations = relations(regions, ({ many }) => ({
  cities: many(cities),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  region: one(regions, {
    fields: [cities.regionId],
    references: [regions.id],
  }),
  users: many(users),
  organizations: many(organizations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  city: one(cities, {
    fields: [users.cityId],
    references: [cities.id],
  }),
  ownedOrganizations: many(organizationOwners),
}));

export const helpTypesRelations = relations(helpTypes, ({ many }) => ({
  organizations: many(organizationHelpTypes),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  city: one(cities, {
    fields: [organizations.cityId],
    references: [cities.id],
  }),
  owners: many(organizationOwners),
  helpTypes: many(organizationHelpTypes),
}));

export const organizationOwnersRelations = relations(organizationOwners, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationOwners.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationOwners.userId],
    references: [users.id],
  }),
}));

export const organizationHelpTypesRelations = relations(organizationHelpTypes, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationHelpTypes.organizationId],
    references: [organizations.id],
  }),
  helpType: one(helpTypes, {
    fields: [organizationHelpTypes.helpTypeId],
    references: [helpTypes.id],
  }),
}));

