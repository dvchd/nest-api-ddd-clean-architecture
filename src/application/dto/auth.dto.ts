import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { RoleName } from '@/shared/constants';

/**
 * User Response DTO
 */
export class UserResponseDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roleName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Login Response DTO
 */
export class LoginResponseDto {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
}

/**
 * Create User DTO (for admin)
 */
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsEnum(RoleName)
  roleName: RoleName;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Update User DTO
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(RoleName)
  roleName?: RoleName;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Refresh Token DTO
 */
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

/**
 * Pagination Query DTO
 */
export class PaginationQueryDto {
  page: number = 1;
  limit: number = 10;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' = 'desc';
}
