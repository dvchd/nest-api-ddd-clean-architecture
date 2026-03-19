/**
 * Soft Delete Base Entity
 * Hỗ trợ xóa mềm - record không bị xóa thực sự mà chỉ đánh dấu là đã xóa
 * Cho phép khôi phục dữ liệu đã xóa và giữ audit trail
 */
export interface SoftDeleteBase {
  /** Flag đánh dấu record đã bị xóa mềm */
  isDeleted: boolean;

  /** Thời gian xóa mềm */
  deletedAt: Date | null;

  /** ID của user thực hiện xóa */
  deletedById: string | null;
}

/**
 * Soft Delete Base Entity cho Domain Layer
 */
export abstract class SoftDeleteEntityBase {
  protected _isDeleted: boolean = false;
  protected _deletedAt: Date | null = null;
  protected _deletedById: string | null = null;

  get isDeleted(): boolean {
    return this._isDeleted;
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
    this._isDeleted = true;
    this._deletedAt = new Date();
    this._deletedById = deletedBy;
  }

  /**
   * Khôi phục record đã xóa mềm
   */
  restore(): void {
    this._isDeleted = false;
    this._deletedAt = null;
    this._deletedById = null;
  }

  /**
   * Khôi phục trạng thái từ database
   */
  protected restoreSoftDelete(data: {
    isDeleted: boolean;
    deletedAt: Date | null;
    deletedById: string | null;
  }): void {
    this._isDeleted = data.isDeleted;
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
      'isDeleted' in entity &&
      'softDelete' in entity &&
      'restore' in entity);
}
