/**
 * Soft Delete Base Entity
 * Hỗ trợ xóa mềm - record không bị xóa thực sự mà chỉ đánh dấu là đã xóa
 * Cho phép khôi phục dữ liệu đã xóa và giữ audit trail
 * 
 * Sử dụng deletedAt để kiểm tra xóa mềm:
 * - deletedAt IS NULL → record chưa bị xóa
 * - deletedAt IS NOT NULL → record đã bị xóa mềm
 */
export interface SoftDeleteBase {
  /** Thời gian xóa mềm (null = chưa xóa) */
  deletedAt: Date | null;

  /** ID của user thực hiện xóa */
  deletedById: string | null;
}

/**
 * Soft Delete Base Entity cho Domain Layer
 */
export abstract class SoftDeleteEntityBase {
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

  /**
   * Đánh dấu record là đã xóa mềm
   */
  softDelete(deletedBy: string): void {
    this._deletedAt = new Date();
    this._deletedById = deletedBy;
  }

  /**
   * Khôi phục record đã xóa mềm
   */
  restore(): void {
    this._deletedAt = null;
    this._deletedById = null;
  }

  /**
   * Khôi phục trạng thái từ database
   */
  protected restoreSoftDelete(data: {
    deletedAt: Date | null;
    deletedById: string | null;
  }): void {
    this._deletedAt = data.deletedAt;
    this._deletedById = data.deletedById;
  }
}

/**
 * Type guard để kiểm tra entity có hỗ trợ soft delete
 */
export function isSoftDeletable(entity: unknown): entity is SoftDeleteEntityBase {
  return entity instanceof SoftDeleteEntityBase ||
    (entity !== null &&
      typeof entity === 'object' &&
      'deletedAt' in entity &&
      'softDelete' in entity &&
      'restore' in entity);
}
