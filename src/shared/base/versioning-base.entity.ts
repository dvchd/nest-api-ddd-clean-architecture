/**
 * Versioning Base Entity
 * Hỗ trợ Optimistic Locking và theo dõi phiên bản
 * Sử dụng cho các entity có nhiều thay đổi đồng thời để tránh conflict
 *
 * Ví dụ sử dụng:
 * - Hợp đồng có thể được chỉnh sửa bởi nhiều người
 * - Document được edit song song
 * - Booking có thể bị conflict khi đặt cùng lúc
 */
export interface VersioningBase {
  /** Số phiên bản hiện tại, tăng mỗi khi update */
  version: number;
}

/**
 * Exception thrown khi có conflict về version
 */
export class OptimisticLockVersionMismatchError extends Error {
  constructor(
    public readonly entityName: string,
    public readonly entityId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
  ) {
    super(
      `Optimistic lock version mismatch for ${entityName}#${entityId}. ` +
        `Expected version ${expectedVersion}, but actual is ${actualVersion}.`
    );
    this.name = 'OptimisticLockVersionMismatchError';
  }
}

/**
 * Versioning Base Entity cho Domain Layer
 */
export abstract class VersioningEntityBase {
  protected _version: number = 1;

  get version(): number {
    return this._version;
  }

  /**
   * Tăng version khi có thay đổi
   * Gọi method này trong các method thay đổi state của entity
   */
  protected incrementVersion(): void {
    this._version++;
  }

  /**
   * Validate version trước khi update (Optimistic Locking)
   * @throws OptimisticLockVersionMismatchError nếu version không khớp
   */
  validateVersion(expectedVersion: number): void {
    if (this._version !== expectedVersion) {
      throw new OptimisticLockVersionMismatchError(
        this.constructor.name,
        (this as any).id || 'unknown',
        expectedVersion,
        this._version,
      );
    }
  }

  /**
   * Khôi phục trạng thái từ database
   */
  protected restoreVersion(version: number): void {
    this._version = version;
  }
}

/**
 * Type guard để kiểm tra entity có hỗ trợ versioning
 */
export function isVersionable(entity: unknown): entity is VersioningEntityBase {
  return entity instanceof VersioningEntityBase ||
    (entity !== null &&
      typeof entity === 'object' &&
      'version' in entity &&
      'incrementVersion' in entity);
}
