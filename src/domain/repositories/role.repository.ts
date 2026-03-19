import { ISoftDeleteRepository, PaginatedResult, PaginationOptions } from './base.repository';
import { RoleEntity } from '../entities';
import { RoleName } from '@/shared/constants';

/**
 * Role Repository Interface
 */
export interface IRoleRepository extends ISoftDeleteRepository<RoleEntity> {
  /**
   * Tìm role theo name
   */
  findByName(name: RoleName | string, includeDeleted?: boolean): Promise<RoleEntity | null>;

  /**
   * Kiểm tra role name đã tồn tại
   */
  isNameExists(name: string, excludeId?: string): Promise<boolean>;

  /**
   * Tìm role có permission cụ thể
   */
  findByPermission(permission: string): Promise<RoleEntity[]>;

  /**
   * Seed default roles
   */
  seedDefaultRoles(): Promise<void>;
}
