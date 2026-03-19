import { eq, and, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { IRoleRepository } from '@/domain/repositories';
import { RoleEntity } from '@/domain/entities';
import { RoleName, DEFAULT_ROLES } from '@/shared/constants';
import { roles } from '../drizzle/schema';
import { BaseRepositoryImpl, applySoftDeleteFilter } from './base.repository';
import { UnitOfWork } from '../unit-of-work';

/**
 * Role Repository Implementation
 */
@Injectable()
export class RoleRepositoryImpl
  extends BaseRepositoryImpl<RoleEntity, typeof roles>
  implements IRoleRepository
{
  protected readonly table = roles;

  constructor(unitOfWork: UnitOfWork) {
    super(unitOfWork);
  }

  async findByName(name: RoleName | string, includeDeleted: boolean = false): Promise<RoleEntity | null> {
    const filter = applySoftDeleteFilter(this.table, { includeDeleted });
    const conditions = filter
      ? and(eq(roles.name, name), filter)
      : eq(roles.name, name);

    const result = await this.db
      .select()
      .from(roles)
      .where(conditions)
      .limit(1);

    return result[0] ? this.mapToEntity(result[0]) : null;
  }

  async isNameExists(name: string, excludeId?: string): Promise<boolean> {
    const conditions = excludeId
      ? and(eq(roles.name, name), sql`${roles.id} != ${excludeId}`)
      : eq(roles.name, name);

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(roles)
      .where(conditions);

    return Number(result[0].count) > 0;
  }

  async findByPermission(permission: string): Promise<RoleEntity[]> {
    // Find roles that have the permission or have '*' (all permissions)
    const results = await this.db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.isDeleted, false),
          or(
            sql`${roles.permissions} LIKE ${`%"${permission}"%`}`,
            sql`${roles.permissions} LIKE '%"*"%'`
          )
        )
      );

    return results.map((r) => this.mapToEntity(r));
  }

  async seedDefaultRoles(): Promise<void> {
    for (const defaultRole of DEFAULT_ROLES) {
      const existing = await this.findByName(defaultRole.name, true);

      if (!existing) {
        const role = RoleEntity.create(
          crypto.randomUUID(),
          defaultRole.name,
          defaultRole.displayName,
          [...defaultRole.permissions]
        );

        await this.db.insert(roles).values({
          id: role.id,
          name: role.name.value,
          displayName: role.displayName,
          description: defaultRole.description,
          permissions: role.permissions,
          createdById: role.createdById,
          createdAt: role.createdAt,
          updatedById: role.updatedById,
          updatedAt: role.updatedAt,
          isDeleted: false,
        });
      }
    }
  }

  protected mapToEntity(record: any): RoleEntity {
    return RoleEntity.fromPersistence({
      id: record.id,
      name: record.name,
      displayName: record.displayName,
      description: record.description,
      permissions: record.permissions || [],
      createdById: record.createdById,
      createdAt: record.createdAt,
      updatedById: record.updatedById,
      updatedAt: record.updatedAt,
      isDeleted: record.isDeleted,
      deletedAt: record.deletedAt,
      deletedById: record.deletedById,
    });
  }

  protected mapToRecord(entity: RoleEntity): any {
    const primitive = entity.toPrimitive();
    return {
      id: primitive.id,
      name: primitive.name,
      displayName: primitive.displayName,
      description: primitive.description,
      permissions: primitive.permissions,
      createdById: primitive.createdById,
      createdAt: primitive.createdAt,
      updatedById: primitive.updatedById,
      updatedAt: primitive.updatedAt,
      isDeleted: primitive.isDeleted,
      deletedAt: primitive.deletedAt,
      deletedById: primitive.deletedById,
    };
  }
}
