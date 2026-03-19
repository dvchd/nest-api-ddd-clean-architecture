import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/infrastructure/auth/guards/roles.guard';
import { Roles, CurrentUser } from '@/shared/decorators';
import { RoleName } from '@/shared/constants';
import { ValidatedUser } from '@/infrastructure/auth/strategies/jwt.strategy';
import { CreateUserDto, UpdateUserDto, PaginationQueryDto } from '@/application/dto';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get all users (Admin only)
   */
  @Get()
  @Roles(RoleName.ADMIN)
  async getAll(@Query() query: PaginationQueryDto) {
    return this.userService.getAll(query);
  }

  /**
   * Get users by role (Admin only)
   */
  @Get('role/:roleName')
  @Roles(RoleName.ADMIN)
  async getByRole(
    @Param('roleName') roleName: RoleName,
    @Query() query: PaginationQueryDto
  ) {
    return this.userService.getByRole(roleName, query);
  }

  /**
   * Get current user profile
   */
  @Get('me')
  async getMe(@CurrentUser() user: ValidatedUser) {
    return this.userService.getById(user.id);
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  @Roles(RoleName.ADMIN)
  async getById(@Param('id') id: string) {
    return this.userService.getById(id);
  }

  /**
   * Create new user (Admin only)
   */
  @Post()
  @Roles(RoleName.ADMIN)
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') createdBy: string
  ) {
    return this.userService.create(dto, createdBy);
  }

  /**
   * Update user
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') updatedBy: string
  ) {
    return this.userService.update(id, dto, updatedBy);
  }

  /**
   * Delete user (soft delete)
   */
  @Delete(':id')
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') deletedBy: string
  ) {
    return this.userService.delete(id, deletedBy);
  }

  /**
   * Restore deleted user
   */
  @Post(':id/restore')
  @Roles(RoleName.ADMIN)
  async restore(@Param('id') id: string) {
    return this.userService.restore(id);
  }
}
