import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IUserRepository, IRoleRepository } from '@/domain/repositories';
import { UserEntity } from '@/domain/entities';
import { GoogleProfile } from '@/infrastructure/auth/strategies/google.strategy';
import { RoleName } from '@/shared/constants';
import { UnitOfWork, UNIT_OF_WORK_TOKEN } from '@/infrastructure/database/unit-of-work';

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    roleName: string;
  };
  tokens: TokenPayload;
  isNewUser: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IRoleRepository')
    private readonly roleRepository: IRoleRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(UNIT_OF_WORK_TOKEN)
    private readonly unitOfWork: UnitOfWork,
  ) {}

  /**
   * Handle Google OAuth login/register
   */
  async handleGoogleLogin(googleProfile: GoogleProfile): Promise<LoginResult> {
    return this.unitOfWork.runInTransaction(async () => {
      // Check if user already exists
      let user = await this.userRepository.findByGoogleId(googleProfile.id);
      let isNewUser = false;

      if (user) {
        // User exists - update last login
        await this.userRepository.updateLastLogin(user.id);
      } else {
        // Check if email already used
        const existingUser = await this.userRepository.findByEmail(googleProfile.email);

        if (existingUser) {
          throw new UnauthorizedException(
            `Email ${googleProfile.email} đã được sử dụng bởi tài khoản khác. ` +
            `Vui lòng đăng nhập bằng phương thức khác.`
          );
        }

        // Get default role (Mentee)
        const defaultRole = await this.roleRepository.findByName(RoleName.MENTEE);

        if (!defaultRole) {
          throw new Error('Default role not found. Please seed roles first.');
        }

        // Create new user
        isNewUser = true;
        const newUser = UserEntity.createFromGoogle(
          crypto.randomUUID(),
          googleProfile.email,
          googleProfile.displayName,
          defaultRole.id,
          RoleName.MENTEE,
          googleProfile.id,
          googleProfile.photo
        );

        user = await this.userRepository.create(newUser as any);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa.');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      return {
        user: {
          id: user.id,
          email: user.email.value,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          roleName: user.roleName.value,
        },
        tokens,
        isNewUser,
      };
    });
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: UserEntity): Promise<TokenPayload> {
    const payload = {
      sub: user.id,
      email: user.email.value,
      roleId: user.roleId,
      roleName: user.roleName.value,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1h'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Validate user by JWT payload
   */
  async validateUser(payload: { sub: string; email: string }): Promise<UserEntity | null> {
    return this.userRepository.findById(payload.sub);
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string): Promise<void> {
    // In a real app, you would invalidate the refresh token
    // by removing it from database or adding to blacklist
  }
}
