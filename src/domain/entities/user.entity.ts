import { FullAuditedEntityBase } from '@/shared/base';
import { Email, RoleNameVO } from '../value-objects';

/**
 * User Entity Interface
 */
export interface IUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  googleId: string | null;
  roleId: string;
  roleName: RoleNameVO;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedById: string | null;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedById: string | null;
  version: number;
}

/**
 * User Domain Entity
 * Tuân thủ DDD: Entity có identity và behavior
 */
export class UserEntity extends FullAuditedEntityBase {
  private _id: string;
  private _email: Email;
  private _displayName: string;
  private _avatarUrl: string | null = null;
  private _googleId: string | null = null;
  private _roleId: string;
  private _roleName: RoleNameVO;
  private _isActive: boolean = true;
  private _lastLoginAt: Date | null = null;

  private constructor(
    id: string,
    email: Email,
    displayName: string,
    roleId: string,
    roleName: RoleNameVO
  ) {
    super();
    this._id = id;
    this._email = email;
    this._displayName = displayName;
    this._roleId = roleId;
    this._roleName = roleName;
  }

  // Factory method để tạo user mới từ Google OAuth
  static createFromGoogle(
    id: string,
    email: string,
    displayName: string,
    roleId: string,
    roleName: string,
    googleId: string,
    avatarUrl?: string,
    createdBy?: string
  ): UserEntity {
    const emailVO = Email.create(email);
    const roleNameVO = RoleNameVO.create(roleName);
    const user = new UserEntity(id, emailVO, displayName, roleId, roleNameVO);
    user._googleId = googleId;
    user._avatarUrl = avatarUrl || null;

    if (createdBy) {
      user.setCreatedBy(createdBy);
    } else {
      user.setCreatedBy(id); // Self-created via Google OAuth
    }

    return user;
  }

  // Factory method để khôi phục từ persistence
  static fromPersistence(data: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    googleId: string | null;
    roleId: string;
    roleName: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdById: string | null;
    createdAt: Date;
    updatedById: string | null;
    updatedAt: Date;
    deletedAt: Date | null;
    deletedById: string | null;
    version: number;
  }): UserEntity {
    const emailVO = Email.create(data.email);
    const roleNameVO = RoleNameVO.create(data.roleName);
    const user = new UserEntity(data.id, emailVO, data.displayName, data.roleId, roleNameVO);
    user._avatarUrl = data.avatarUrl;
    user._googleId = data.googleId;
    user._isActive = data.isActive;
    user._lastLoginAt = data.lastLoginAt;

    user.restoreFullAudit({
      createdById: data.createdById,
      createdAt: data.createdAt,
      updatedById: data.updatedById,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
      deletedById: data.deletedById,
      version: data.version,
    });

    return user;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get email(): Email {
    return this._email;
  }

  get displayName(): string {
    return this._displayName;
  }

  get avatarUrl(): string | null {
    return this._avatarUrl;
  }

  get googleId(): string | null {
    return this._googleId;
  }

  get roleId(): string {
    return this._roleId;
  }

  get roleName(): RoleNameVO {
    return this._roleName;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastLoginAt(): Date | null {
    return this._lastLoginAt;
  }

  // Business logic
  updateProfile(displayName: string, avatarUrl: string | null, updatedBy: string): void {
    if (!displayName || displayName.trim().length === 0) {
      throw new Error('Display name không được để trống');
    }

    this._displayName = displayName.trim();
    this._avatarUrl = avatarUrl;
    this.setUpdatedBy(updatedBy);
  }

  changeRole(newRoleId: string, newRoleName: string, updatedBy: string): void {
    const roleNameVO = RoleNameVO.create(newRoleName);
    this._roleId = newRoleId;
    this._roleName = roleNameVO;
    this.setUpdatedBy(updatedBy);
  }

  recordLogin(): void {
    this._lastLoginAt = new Date();
    this.incrementVersion();
  }

  deactivate(updatedBy: string): void {
    this._isActive = false;
    this.setUpdatedBy(updatedBy);
  }

  activate(updatedBy: string): void {
    this._isActive = true;
    this.setUpdatedBy(updatedBy);
  }

  isAdmin(): boolean {
    return this._roleName.isAdmin();
  }

  isMentor(): boolean {
    return this._roleName.isMentor();
  }

  isMentee(): boolean {
    return this._roleName.isMentee();
  }

  toPrimitive(): IUser {
    return {
      id: this._id,
      email: this._email.value,
      displayName: this._displayName,
      avatarUrl: this._avatarUrl,
      googleId: this._googleId,
      roleId: this._roleId,
      roleName: this._roleName,
      isActive: this._isActive,
      lastLoginAt: this._lastLoginAt,
      createdById: this.createdById,
      createdAt: this.createdAt,
      updatedById: this.updatedById,
      updatedAt: this.updatedAt,
      isDeleted: this.isDeleted,
      deletedAt: this.deletedAt,
      deletedById: this.deletedById,
      version: this.version,
    };
  }
}
