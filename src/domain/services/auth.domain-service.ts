import { UserEntity } from '../entities';
import { IUserRepository } from '../repositories';
import { RoleName } from '@/shared/constants';

/**
 * Authentication Domain Service
 * Chứa business logic liên quan đến authentication
 * không thuộc về một entity cụ thể
 */
export class AuthDomainService {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Xử lý đăng nhập/đăng ký từ Google OAuth
   * Nếu user đã tồn tại -> cập nhật thông tin và trả về
   * Nếu user chưa tồn tại -> tạo mới với role mặc định là Mentee
   */
  async handleGoogleOAuth(data: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    defaultRoleId: string;
  }): Promise<{ user: UserEntity; isNewUser: boolean }> {
    // Tìm user theo Google ID trước
    let user = await this.userRepository.findByGoogleId(data.googleId);

    if (user) {
      // User đã tồn tại - cập nhật thông tin nếu cần
      const needsUpdate =
        user.displayName !== data.displayName ||
        user.avatarUrl !== (data.avatarUrl || null);

      if (needsUpdate) {
        // Note: Cần update entity và save
        user.recordLogin();
      }

      return { user, isNewUser: false };
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser) {
      // Email đã tồn tại nhưng chưa link với Google
      // Throw error hoặc merge account tùy business logic
      throw new Error(
        `Email ${data.email} đã được sử dụng. Vui lòng đăng nhập bằng cách khác.`
      );
    }

    // Tạo user mới
    const newUserId = crypto.randomUUID();
    const newUser = UserEntity.createFromGoogle(
      newUserId,
      data.email,
      data.displayName,
      data.defaultRoleId,
      RoleName.MENTEE,
      data.googleId,
      data.avatarUrl
    );

    return { user: newUser, isNewUser: true };
  }

  /**
   * Validate xem user có thể thực hiện action không
   */
  canUserPerformAction(user: UserEntity, permission: string): boolean {
    if (!user.isActive) {
      return false;
    }

    // Admin có tất cả permissions
    if (user.isAdmin()) {
      return true;
    }

    // Note: Cần check role permissions
    // return role.hasPermission(permission);
    return true;
  }
}
