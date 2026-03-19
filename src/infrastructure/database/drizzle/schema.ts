import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

/**
 * ============================================
 * BASE COLUMN SETS
 * ============================================
 */

/**
 * Audit columns - theo dõi ai tạo/cập nhật và khi nào
 */
const auditColumns = {
  createdById: text('created_by_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedById: text('updated_by_id'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
};

/**
 * Soft delete columns - hỗ trợ xóa mềm
 * Sử dụng deletedAt để kiểm tra xóa mềm:
 * - deletedAt IS NULL → record chưa bị xóa
 * - deletedAt IS NOT NULL → record đã bị xóa mềm
 */
const softDeleteColumns = {
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deletedById: text('deleted_by_id'),
};

/**
 * Versioning columns - optimistic locking
 */
const versioningColumns = {
  version: integer('version').notNull().default(1),
};

/**
 * ============================================
 * ROLE TABLE
 * ============================================
 */
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  permissions: text('permissions', { mode: 'json' }).$type<string[]>().default([]),
  ...auditColumns,
  ...softDeleteColumns,
}, (table) => ({
  nameIdx: index('roles_name_idx').on(table.name),
}));

/**
 * ============================================
 * USER TABLE
 * ============================================
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  googleId: text('google_id').unique(),
  roleId: text('role_id').notNull().references(() => roles.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  ...auditColumns,
  ...softDeleteColumns,
  ...versioningColumns, // User có thể update nhiều field cùng lúc
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  googleIdIdx: index('users_google_id_idx').on(table.googleId),
  roleIdIdx: index('users_role_id_idx').on(table.roleId),
}));

/**
 * ============================================
 * USER SESSION TABLE (Refresh Tokens)
 * ============================================
 */
export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  ...auditColumns,
  ...softDeleteColumns,
}, (table) => ({
  userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
  refreshTokenIdx: index('user_sessions_refresh_token_idx').on(table.refreshToken),
}));

/**
 * ============================================
 * EXAMPLE: DOCUMENT TABLE (With Versioning)
 * ============================================
 * Bảng mẫu cho các entity cần versioning
 */
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  content: text('content'),
  authorId: text('author_id').notNull().references(() => users.id),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  ...auditColumns,
  ...softDeleteColumns,
  ...versioningColumns,
}, (table) => ({
  authorIdIdx: index('documents_author_id_idx').on(table.authorId),
  statusIdx: index('documents_status_idx').on(table.status),
}));

/**
 * ============================================
 * RELATIONS
 * ============================================
 */
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  sessions: many(userSessions),
  documents: many(documents),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  author: one(users, {
    fields: [documents.authorId],
    references: [users.id],
  }),
}));

/**
 * ============================================
 * TYPE EXPORTS
 * ============================================
 */
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
