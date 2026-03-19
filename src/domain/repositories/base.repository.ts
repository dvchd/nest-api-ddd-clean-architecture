import { ISoftDeleteBase } from '@/shared/base';

/**
 * Base Repository Interface
 * Định nghĩa các operation cơ bản cho tất cả repositories
 * Tuân thủ DDD: Repository interface nằm ở Domain Layer
 */
export interface IBaseRepository<T> {
  /**
   * Tìm entity theo ID
   * @param id ID của entity
   * @param includeDeleted Có bao gồm các record đã xóa mềm không
   */
  findById(id: string, includeDeleted?: boolean): Promise<T | null>;

  /**
   * Tìm tất cả entities
   * @param includeDeleted Có bao gồm các record đã xóa mềm không
   */
  findAll(includeDeleted?: boolean): Promise<T[]>;

  /**
   * Tạo mới entity
   */
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;

  /**
   * Cập nhật entity
   */
  update(id: string, entity: Partial<T>): Promise<T>;

  /**
   * Xóa entity (soft delete)
   */
  delete(id: string, deletedBy: string): Promise<void>;
}

/**
 * Soft Delete Repository Interface
 * Mở rộng base repository với soft delete operations
 */
export interface ISoftDeleteRepository<T extends ISoftDeleteBase>
  extends IBaseRepository<T> {
  /**
   * Xóa mềm entity
   */
  softDelete(id: string, deletedBy: string): Promise<void>;

  /**
   * Khôi phục entity đã xóa mềm
   */
  restore(id: string): Promise<void>;

  /**
   * Xóa vĩnh viễn entity
   */
  hardDelete(id: string): Promise<void>;

  /**
   * Tìm các entity đã xóa mềm
   */
  findDeleted(): Promise<T[]>;

  /**
   * Tìm entity bao gồm cả đã xóa
   */
  findByIdWithDeleted(id: string): Promise<T | null>;
}

/**
 * Versioning Repository Interface
 * Hỗ trợ optimistic locking
 */
export interface IVersioningRepository<T> extends IBaseRepository<T> {
  /**
   * Update với version check (optimistic locking)
   * @throws OptimisticLockVersionMismatchError nếu version không khớp
   */
  updateWithVersion(
    id: string,
    expectedVersion: number,
    entity: Partial<T>
  ): Promise<T>;
}

/**
 * Pagination Options Interface
 */
export interface IPaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated Result Interface
 */
export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
