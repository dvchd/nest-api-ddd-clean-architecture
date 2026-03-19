import { ISoftDeleteRepository, IVersioningRepository, PaginatedResult, PaginationOptions } from './base.repository';
import { UserEntity } from '../entities';

/**
 * User Repository Interface
 * Mở rộng với các method đặc thù cho User
 */
export interface IUserRepository
  extends ISoftDeleteRepository<UserEntity>,
    IVersioningRepository<UserEntity> {
  /**
   * Tìm user theo email
   */
  findByEmail(email: string, includeDeleted?: boolean): Promise<UserEntity | null>;

  /**
   * Tìm user theo Google ID
   */
  findByGoogleId(googleId: string, includeDeleted?: boolean): Promise<UserEntity | null>;

  /**
   * Tìm users theo role
   */
  findByRoleId(roleId: string, options?: PaginationOptions): Promise<PaginatedResult<UserEntity>>;

  /**
   * Kiểm tra email đã tồn tại
   */
  isEmailExists(email: string, excludeId?: string): Promise<boolean>;

  /**
   * Kiểm tra Google ID đã tồn tại
   */
  isGoogleIdExists(googleId: string, excludeId?: string): Promise<boolean>;

  /**
   * Cập nhật last login
   */
  updateLastLogin(id: string): Promise<void>;

  /**
   * Tìm users active
   */
  findActive(options?: PaginationOptions): Promise<PaginatedResult<UserEntity>>;
}
