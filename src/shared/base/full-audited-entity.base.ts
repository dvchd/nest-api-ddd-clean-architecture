import { AuditEntityBase } from './audit-base.entity';
import { SoftDeleteEntityBase } from './soft-delete-base.entity';
import { VersioningEntityBase } from './versioning-base.entity';

/**
 * Full Audited Entity Base
 * Kết hợp Audit + SoftDelete + Versioning
 * Sử dụng cho các entity quan trọng cần đầy đủ tính năng tracking
 *
 * Ví dụ: User, Contract, Document, Booking...
 */
export abstract class FullAuditedEntityBase
  extends AuditEntityBase
  implements SoftDeleteEntityBase, VersioningEntityBase
{
  protected _deletedAt: Date | null = null;
  protected _deletedById: string | null = null;
  protected _version: number = 1;

  // Soft Delete Properties
  /**
   * Kiểm tra record đã bị xóa mềm hay chưa
   * Record được coi là đã xóa nếu deletedAt có giá trị
   */
  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get deletedById(): string | null {
    return this._deletedById;
  }

  // Versioning Properties
  get version(): number {
    return this._version;
  }

  /**
   * Đánh dấu record là đã xóa mềm
   */
  softDelete(deletedBy: string): void {
    this._deletedAt = new Date();
    this._deletedById = deletedBy;
    this.incrementVersion();
  }

  /**
   * Khôi phục record đã xóa mềm
   */
  restore(): void {
    this._deletedAt = null;
    this._deletedById = null;
    this.incrementVersion();
  }

  /**
   * Validate version trước khi update
   */
  validateVersion(expectedVersion: number): void {
    if (this._version !== expectedVersion) {
      throw new Error(
        `Optimistic lock version mismatch. Expected ${expectedVersion}, actual ${this._version}`
      );
    }
  }

  /**
   * Tăng version khi có thay đổi
   */
  protected incrementVersion(): void {
    this._version++;
  }

  /**
   * Ghi nhận người cập nhật và tăng version
   */
  override setUpdatedBy(userId: string): void {
    super.setUpdatedBy(userId);
    this.incrementVersion();
  }

  /**
   * Khôi phục toàn bộ trạng thái từ database
   */
  protected restoreFullAudit(data: {
    createdById: string | null;
    createdAt: Date;
    updatedById: string | null;
    updatedAt: Date;
    deletedAt: Date | null;
    deletedById: string | null;
    version: number;
  }): void {
    this.restoreAudit(data);
    this._deletedAt = data.deletedAt;
    this._deletedById = data.deletedById;
    this._version = data.version;
  }
}

/**
 * Simple Audited Entity Base
 * Kết hợp Audit + SoftDelete (không có Versioning)
 * Sử dụng cho các entity ít có conflict khi update
 *
 * Ví dụ: Comment, Log, Settings...
 */
export abstract class SimpleAuditedEntityBase
  extends AuditEntityBase
{
  protected _deletedAt: Date | null = null;
  protected _deletedById: string | null = null;

  /**
   * Kiểm tra record đã bị xóa mềm hay chưa
   * Record được coi là đã xóa nếu deletedAt có giá trị
   */
  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get deletedById(): string | null {
    return this._deletedById;
  }

  softDelete(deletedBy: string): void {
    this._deletedAt = new Date();
    this._deletedById = deletedBy;
  }

  restore(): void {
    this._deletedAt = null;
    this._deletedById = null;
  }

  protected restoreSimpleAudit(data: {
    createdById: string | null;
    createdAt: Date;
    updatedById: string | null;
    updatedAt: Date;
    deletedAt: Date | null;
    deletedById: string | null;
  }): void {
    this.restoreAudit(data);
    this._deletedAt = data.deletedAt;
    this._deletedById = data.deletedById;
  }
}
