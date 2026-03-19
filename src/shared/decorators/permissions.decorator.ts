import { SetMetadata } from '@nestjs/common';
import { Permission } from '@/shared/constants';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 * @example @RequirePermissions(Permission.COURSES_WRITE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
