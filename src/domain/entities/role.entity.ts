import { FullAuditedEntityBase } from '@/shared/base';
import { RoleNameVO } from '../value-objects';

/**
 * Role Entity Interface
 */
export interface IRole {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  permissions: string[];
  createdById: string | null;
  createdAt: Date;
  updatedById: string | null;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedById: string | null;
}

/**
 * Role Domain Entity
 * Tuân thủ DDD: Entity có identity và behavior
 */
export class RoleEntity extends FullAuditedEntityBase {
  private _id: string;
  private _name: RoleNameVO;
  private _displayName: string;
  private _description: string | null = null;
  private _permissions: string[] = [];

  private constructor(id: string, name: RoleNameVO, displayName: string) {
    super();
    this._id = id;
    this._name = name;
    this._displayName = displayName;
  }

  // Factory method để tạo mới
  static create(
    id: string,
    name: string,
    displayName: string,
    permissions: string[] = [],
    createdBy?: string
  ): RoleEntity {
    const roleName = RoleNameVO.create(name);
    const role = new RoleEntity(id, roleName, displayName);
    role._permissions = permissions;

    if (createdBy) {
      role.setCreatedBy(createdBy);
    }

    return role;
  }

  // Factory method để khôi phục từ persistence
  static fromPersistence(data: {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    permissions: string[];
    createdById: string | null;
    createdAt: Date;
    updatedById: string | null;
    updatedAt: Date;
    deletedAt: Date | null;
    deletedById: string | null;
  }): RoleEntity {
    const roleName = RoleNameVO.create(data.name);
    const role = new RoleEntity(data.id, roleName, data.displayName);
    role._description = data.description;
    role._permissions = data.permissions;

    role.restoreFullAudit({
      createdById: data.createdById,
      createdAt: data.createdAt,
      updatedById: data.updatedById,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
      deletedById: data.deletedById,
      version: 1,
    });

    return role;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get name(): RoleNameVO {
    return this._name;
  }

  get displayName(): string {
    return this._displayName;
  }

  get description(): string | null {
    return this._description;
  }

  get permissions(): string[] {
    return [...this._permissions];
  }

  // Business logic
  updateDisplayName(newDisplayName: string, updatedBy: string): void {
    if (!newDisplayName || newDisplayName.trim().length === 0) {
      throw new Error('Display name không được để trống');
    }

    this._displayName = newDisplayName.trim();
    this.setUpdatedBy(updatedBy);
  }

  updateDescription(newDescription: string | null, updatedBy: string): void {
    this._description = newDescription;
    this.setUpdatedBy(updatedBy);
  }

  addPermission(permission: string): void {
    if (!this._permissions.includes(permission)) {
      this._permissions.push(permission);
    }
  }

  removePermission(permission: string): void {
    this._permissions = this._permissions.filter((p) => p !== permission);
  }

  hasPermission(permission: string): boolean {
    return this._permissions.includes('*') || this._permissions.includes(permission);
  }

  toPrimitive(): IRole {
    return {
      id: this._id,
      name: this._name.value,
      displayName: this._displayName,
      description: this._description,
      permissions: this._permissions,
      createdById: this.createdById,
      createdAt: this.createdAt,
      updatedById: this.updatedById,
      updatedAt: this.updatedAt,
      isDeleted: this.isDeleted,
      deletedAt: this.deletedAt,
      deletedById: this.deletedById,
    };
  }
}
