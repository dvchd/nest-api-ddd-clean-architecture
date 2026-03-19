import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@/shared/constants';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * @example @Roles(RoleName.ADMIN, RoleName.MENTOR)
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
