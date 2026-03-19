import { Injectable, NotFoundException, Inject, ForbiddenException } from '@nestjs/common';
import { IUserRepository, IRoleRepository, PaginationOptions } from '@/domain/repositories';
import { UserEntity } from '@/domain/entities';
import { RoleName } from '@/shared/constants';
import { CreateUserDto, UpdateUserDto, UserResponseDto, PaginationQueryDto } from '@/application/dto';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IRoleRepository')
    private readonly roleRepository: IRoleRepository,
  ) {}

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.toResponseDto(user);
  }

  /**
   * Get all users with pagination
   */
  async getAll(query: PaginationQueryDto) {
    const options: PaginationOptions = {
      page: query.page || 1,
      limit: query.limit || 10,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await this.userRepository.findActive(options);

    return {
      success: true,
      data: result.data.map(this.toResponseDto),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Create new user (admin only)
   */
  async create(dto: CreateUserDto, createdBy: string): Promise<UserResponseDto> {
    // Check if email already exists
    if (await this.userRepository.isEmailExists(dto.email)) {
      throw new ForbiddenException(`Email ${dto.email} already exists`);
    }

    // Get role
    const role = await this.roleRepository.findByName(dto.roleName);

    if (!role) {
      throw new NotFoundException(`Role ${dto.roleName} not found`);
    }

    const userId = crypto.randomUUID();
    const user = UserEntity.createFromGoogle(
      userId,
      dto.email,
      dto.displayName,
      role.id,
      dto.roleName,
      '', // No Google ID for admin-created users
      dto.avatarUrl,
      createdBy
    );

    const created = await this.userRepository.create(user as any);

    return this.toResponseDto(created);
  }

  /**
   * Update user
   */
  async update(id: string, dto: UpdateUserDto, updatedBy: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update role if provided
    if (dto.roleName) {
      const role = await this.roleRepository.findByName(dto.roleName);

      if (!role) {
        throw new NotFoundException(`Role ${dto.roleName} not found`);
      }

      user.changeRole(role.id, dto.roleName, updatedBy);
    }

    // Update other fields
    if (dto.displayName || dto.avatarUrl !== undefined) {
      user.updateProfile(dto.displayName || user.displayName, dto.avatarUrl || null, updatedBy);
    }

    // Update active status
    if (dto.isActive !== undefined) {
      if (dto.isActive) {
        user.activate(updatedBy);
      } else {
        user.deactivate(updatedBy);
      }
    }

    const updated = await this.userRepository.update(id, user as any);

    return this.toResponseDto(updated);
  }

  /**
   * Soft delete user
   */
  async delete(id: string, deletedBy: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.softDelete(id, deletedBy);
  }

  /**
   * Restore deleted user
   */
  async restore(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdWithDeleted(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (!user.isDeleted) {
      throw new ForbiddenException(`User ${id} is not deleted`);
    }

    await this.userRepository.restore(id);

    const restored = await this.userRepository.findById(id);

    return this.toResponseDto(restored!);
  }

  /**
   * Get users by role
   */
  async getByRole(roleName: RoleName, query: PaginationQueryDto) {
    const role = await this.roleRepository.findByName(roleName);

    if (!role) {
      throw new NotFoundException(`Role ${roleName} not found`);
    }

    const options: PaginationOptions = {
      page: query.page || 1,
      limit: query.limit || 10,
    };

    const result = await this.userRepository.findByRoleId(role.id, options);

    return {
      success: true,
      data: result.data.map(this.toResponseDto),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Map entity to response DTO
   */
  private toResponseDto(entity: UserEntity): UserResponseDto {
    const primitive = entity.toPrimitive();

    return {
      id: primitive.id,
      email: primitive.email,
      displayName: primitive.displayName,
      avatarUrl: primitive.avatarUrl,
      roleName: primitive.roleName.value,
      isActive: primitive.isActive,
      lastLoginAt: primitive.lastLoginAt,
      createdAt: primitive.createdAt,
      updatedAt: primitive.updatedAt,
    };
  }
}
