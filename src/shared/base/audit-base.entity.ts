/**
 * Audit Base Interface
 * Tự động theo dõi ai tạo, ai cập nhật và khi nào
 * Sử dụng cho tất cả các entity cần audit trail
 */
export interface IAuditBase {
  /** ID của user tạo record */
  createdById: string | null;

  /** Thời gian tạo record */
  createdAt: Date;

  /** ID của user cập nhật record lần cuối */
  updatedById: string | null;

  /** Thời gian cập nhật record lần cuối */
  updatedAt: Date;
}

/**
 * Audit Base Entity cho Domain Layer
 * Sử dụng trong các Domain Entity để đảm bảo tính nhất quán
 */
export abstract class AuditEntityBase {
  protected _createdById: string | null = null;
  protected _createdAt: Date = new Date();
  protected _updatedById: string | null = null;
  protected _updatedAt: Date = new Date();

  get createdById(): string | null {
    return this._createdById;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedById(): string | null {
    return this._updatedById;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Ghi nhận người tạo record
   */
  setCreatedBy(userId: string): void {
    this._createdById = userId;
    this._createdAt = new Date();
    this._updatedById = userId;
    this._updatedAt = new Date();
  }

  /**
   * Ghi nhận người cập nhật record
   */
  setUpdatedBy(userId: string): void {
    this._updatedById = userId;
    this._updatedAt = new Date();
  }

  /**
   * Khôi phục trạng thái từ database
   */
  protected restoreAudit(data: {
    createdById: string | null;
    createdAt: Date;
    updatedById: string | null;
    updatedAt: Date;
  }): void {
    this._createdById = data.createdById;
    this._createdAt = data.createdAt;
    this._updatedById = data.updatedById;
    this._updatedAt = data.updatedAt;
  }
}
