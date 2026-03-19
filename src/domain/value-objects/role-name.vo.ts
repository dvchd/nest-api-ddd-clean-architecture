import { RoleName } from '@/shared/constants';

/**
 * Role Name Value Object
 * Đảm bảo role name luôn hợp lệ
 */
export class RoleNameVO {
  private constructor(private readonly _value: RoleName) {}

  static create(name: string): RoleNameVO {
    const validRoles = Object.values(RoleName) as string[];

    if (!validRoles.includes(name)) {
      throw new Error(
        `Role name không hợp lệ: ${name}. Các role hợp lệ: ${validRoles.join(', ')}`
      );
    }

    return new RoleNameVO(name as RoleName);
  }

  static fromString(name: string): RoleNameVO {
    return this.create(name);
  }

  get value(): RoleName {
    return this._value;
  }

  equals(other: RoleNameVO): boolean {
    return this._value === other._value;
  }

  isAdmin(): boolean {
    return this._value === RoleName.ADMIN;
  }

  isMentor(): boolean {
    return this._value === RoleName.MENTOR;
  }

  isMentee(): boolean {
    return this._value === RoleName.MENTEE;
  }

  toString(): string {
    return this._value;
  }
}
