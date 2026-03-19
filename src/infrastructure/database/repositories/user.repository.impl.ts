import { eq, and, or, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { IUserRepository, PaginationOptions, PaginatedResult } from '@/domain/repositories';
import { UserEntity } from '@/domain/entities';
import { users, roles } from '../drizzle/schema';
import { VersioningRepositoryImpl, applySoftDeleteFilter } from './base.repository';
import { UnitOfWork } from '../unit-of-work';

/**
 * User Repository Implementation
 * Triển khai IUserRepository với Drizzle ORM
 */
@Injectable()
export class UserRepositoryImpl
  extends VersioningRepositoryImpl<UserEntity, typeof users>
  implements IUserRepository
{
  protected readonly table = users;

  constructor(unitOfWork: UnitOfWork) {
    super(unitOfWork);
  }

  async findByEmail(email: string, includeDeleted: boolean = false): Promise<UserEntity | null> {
    const filter = applySoftDeleteFilter(this.table, { includeDeleted });
    const conditions = filter
      ? and(eq(users.email, email), filter)
      : eq(users.email, email);

    const result = await this.db
      .select({
        user: users,
        role: roles,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(conditions)
      .limit(1);

    if (result.length === 0) return null;

    const { user, role } = result[0];
    return this.mapToEntityWithRole(user, role);
  }

  async findByGoogleId(googleId: string, includeDeleted: boolean = false): Promise<UserEntity | null> {
    if (!googleId) return null;

    const filter = applySoftDeleteFilter(this.table, { includeDeleted });
    const conditions = filter
      ? and(eq(users.googleId, googleId), filter)
      : eq(users.googleId, googleId);

    const result = await this.db
      .select({
        user: users,
        role: roles,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(conditions)
      .limit(1);

    if (result.length === 0) return null;

    const { user, role } = result[0];
    return this.mapToEntityWithRole(user, role);
  }

  async findByRoleId(
    roleId: string,
    options: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedResult<UserEntity>> {
    const filter = applySoftDeleteFilter(this.table);
    const conditions = filter
      ? and(eq(users.roleId, roleId), filter)
      : eq(users.roleId, roleId);

    // Count total
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions);

    const total = Number(countResult[0].count);
    const offset = (options.page - 1) * options.limit;

    // Get paginated results with role
    const results = await this.db
      .select({
        user: users,
        role: roles,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(conditions)
      .limit(options.limit)
      .offset(offset);

    const data = results.map((r) => this.mapToEntityWithRole(r.user, r.role));

    return {
      data,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async isEmailExists(email: string, excludeId?: string): Promise<boolean> {
    const conditions = excludeId
      ? and(eq(users.email, email), sql`${users.id} != ${excludeId}`)
      : eq(users.email, email);

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions);

    return Number(result[0].count) > 0;
  }

  async isGoogleIdExists(googleId: string, excludeId?: string): Promise<boolean> {
    if (!googleId) return false;

    const conditions = excludeId
      ? and(eq(users.googleId, googleId), sql`${users.id} != ${excludeId}`)
      : eq(users.googleId, googleId);

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions);

    return Number(result[0].count) > 0;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
        version: sql`${users.version} + 1`,
      })
      .where(eq(users.id, id));
  }

  async findActive(
    options: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedResult<UserEntity>> {
    const filter = applySoftDeleteFilter(this.table);
    const conditions = filter
      ? and(eq(users.isActive, true), filter)
      : eq(users.isActive, true);

    // Count total
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions);

    const total = Number(countResult[0].count);
    const offset = (options.page - 1) * options.limit;

    // Get paginated results with role
    const results = await this.db
      .select({
        user: users,
        role: roles,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(conditions)
      .limit(options.limit)
      .offset(offset);

    const data = results.map((r) => this.mapToEntityWithRole(r.user, r.role));

    return {
      data,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  /**
   * Override create to include role join
   */
  override async create(entity: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity> {
    const data = this.mapToRecord(entity as UserEntity);
    const result = await this.db.insert(users).values(data).returning();

    // Fetch with role
    const withRole = await this.db
      .select({
        user: users,
        role: roles,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, result[0].id))
      .limit(1);

    return this.mapToEntityWithRole(withRole[0].user, withRole[0].role);
  }

  /**
   * Map database record to domain entity with role
   */
  private mapToEntityWithRole(userRecord: any, roleRecord: any): UserEntity {
    return UserEntity.fromPersistence({
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.displayName,
      avatarUrl: userRecord.avatarUrl,
      googleId: userRecord.googleId,
      roleId: userRecord.roleId,
      roleName: roleRecord.name,
      isActive: userRecord.isActive,
      lastLoginAt: userRecord.lastLoginAt,
      createdById: userRecord.createdById,
      createdAt: userRecord.createdAt,
      updatedById: userRecord.updatedById,
      updatedAt: userRecord.updatedAt,
      deletedAt: userRecord.deletedAt,
      deletedById: userRecord.deletedById,
      version: userRecord.version,
    });
  }

  /**
   * Map database record to domain entity
   */
  protected mapToEntity(record: any): UserEntity {
    // This is used by base class, but we need role info
    // For now, throw error to enforce using mapToEntityWithRole
    throw new Error('Use mapToEntityWithRole for User entity');
  }

  /**
   * Map domain entity to database record
   */
  protected mapToRecord(entity: UserEntity): any {
    const primitive = entity.toPrimitive();
    return {
      id: primitive.id,
      email: primitive.email,
      displayName: primitive.displayName,
      avatarUrl: primitive.avatarUrl,
      googleId: primitive.googleId,
      roleId: primitive.roleId,
      isActive: primitive.isActive,
      lastLoginAt: primitive.lastLoginAt,
      createdById: primitive.createdById,
      createdAt: primitive.createdAt,
      updatedById: primitive.updatedById,
      updatedAt: primitive.updatedAt,
      deletedAt: primitive.deletedAt,
      deletedById: primitive.deletedById,
      version: primitive.version,
    };
  }
}
