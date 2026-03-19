import { eq, and, isNull, isNotNull, sql, desc, asc } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { ISoftDeleteRepository, IVersioningRepository, PaginationOptions, PaginatedResult } from '@/domain/repositories';
import { SoftDeleteBase, VersioningBase } from '@/shared/base';
import { db } from '../drizzle/database';
import { UnitOfWork } from '../unit-of-work';

/**
 * Soft Delete Filter Options
 */
export interface SoftDeleteFilterOptions {
  /** Có bao gồm các record đã xóa không */
  includeDeleted?: boolean;
  /** Chỉ lấy các record đã xóa */
  onlyDeleted?: boolean;
}

/**
 * Apply soft delete filter to query
 */
export function applySoftDeleteFilter<T extends SQLiteTable>(
  table: T,
  options: SoftDeleteFilterOptions = {}
) {
  const conditions: any[] = [];

  if (!options.includeDeleted && !options.onlyDeleted) {
    // Default: chỉ lấy record chưa xóa
    conditions.push(eq((table as any).isDeleted, false));
  } else if (options.onlyDeleted) {
    // Chỉ lấy record đã xóa
    conditions.push(eq((table as any).isDeleted, true));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Generic Repository Base Implementation
 * Cung cấp implementation mặc định cho các operations cơ bản
 */
export abstract class BaseRepositoryImpl<
  TEntity extends SoftDeleteBase & { id: string },
  TTable extends SQLiteTable
> implements ISoftDeleteRepository<TEntity>
{
  protected abstract readonly table: TTable;

  constructor(protected readonly unitOfWork: UnitOfWork) {}

  /**
   * Lấy database client từ Unit of Work
   */
  protected get db() {
    return this.unitOfWork.client;
  }

  async findById(id: string, includeDeleted: boolean = false): Promise<TEntity | null> {
    const filter = applySoftDeleteFilter(this.table, { includeDeleted });
    const conditions = filter
      ? and(eq((this.table as any).id, id), filter)
      : eq((this.table as any).id, id);

    const result = await this.db
      .select()
      .from(this.table)
      .where(conditions)
      .limit(1);

    return result[0] ? this.mapToEntity(result[0]) : null;
  }

  async findAll(includeDeleted: boolean = false): Promise<TEntity[]> {
    const filter = applySoftDeleteFilter(this.table, { includeDeleted });

    const results = filter
      ? await this.db.select().from(this.table).where(filter)
      : await this.db.select().from(this.table);

    return results.map((r) => this.mapToEntity(r));
  }

  async create(entity: Omit<TEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TEntity> {
    const data = this.mapToRecord(entity as TEntity);
    const result = await this.db.insert(this.table).values(data).returning();
    return this.mapToEntity(result[0]);
  }

  async update(id: string, entity: Partial<TEntity>): Promise<TEntity> {
    const data = this.mapToRecord(entity as TEntity);
    const result = await this.db
      .update(this.table)
      .set({ ...data, updatedAt: new Date() })
      .where(eq((this.table as any).id, id))
      .returning();

    return this.mapToEntity(result[0]);
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    await this.softDelete(id, deletedBy);
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.db
      .update(this.table)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: deletedBy,
        updatedAt: new Date(),
      })
      .where(eq((this.table as any).id, id));
  }

  async restore(id: string): Promise<void> {
    await this.db
      .update(this.table)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
        updatedAt: new Date(),
      })
      .where(eq((this.table as any).id, id));
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.delete(this.table).where(eq((this.table as any).id, id));
  }

  async findDeleted(): Promise<TEntity[]> {
    const filter = applySoftDeleteFilter(this.table, { onlyDeleted: true });
    const results = await this.db.select().from(this.table).where(filter);
    return results.map((r) => this.mapToEntity(r));
  }

  async findByIdWithDeleted(id: string): Promise<TEntity | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);

    return result[0] ? this.mapToEntity(result[0]) : null;
  }

  /**
   * Map database record to domain entity
   * Must be implemented by derived class
   */
  protected abstract mapToEntity(record: any): TEntity;

  /**
   * Map domain entity to database record
   * Must be implemented by derived class
   */
  protected abstract mapToRecord(entity: TEntity): any;
}

/**
 * Versioning Repository Base Implementation
 * Thêm optimistic locking support
 */
export abstract class VersioningRepositoryImpl<
  TEntity extends SoftDeleteBase & VersioningBase & { id: string },
  TTable extends SQLiteTable
>
  extends BaseRepositoryImpl<TEntity, TTable>
  implements IVersioningRepository<TEntity>
{
  async updateWithVersion(
    id: string,
    expectedVersion: number,
    entity: Partial<TEntity>
  ): Promise<TEntity> {
    const data = this.mapToRecord(entity as TEntity);

    // Optimistic locking: check version
    const result = await this.db
      .update(this.table)
      .set({
        ...data,
        version: sql`${(this.table as any).version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq((this.table as any).id, id),
          eq((this.table as any).version, expectedVersion)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error(
        `Optimistic lock version mismatch for ${this.table}#${id}. ` +
          `Expected version ${expectedVersion}.`
      );
    }

    return this.mapToEntity(result[0]);
  }
}

/**
 * Pagination Helper
 */
export async function paginate<T>(
  query: any,
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const { page, limit, sortBy, sortOrder } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await query;
  const total = countResult.length;

  // Apply pagination
  const paginatedQuery = query.limit(limit).offset(offset);

  if (sortBy) {
    paginatedQuery.orderBy(
      sortOrder === 'desc' ? desc(sortBy) : asc(sortBy)
    );
  }

  const data = await paginatedQuery;

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
