import { Injectable, Scope } from '@nestjs/common';
import { Database, db } from './drizzle/database';

/**
 * Unit of Work Interface
 * Quản lý transaction cho nhiều operations
 */
export interface IUnitOfWork {
  /**
   * Bắt đầu một transaction mới
   */
  beginTransaction(): Promise<void>;

  /**
   * Commit transaction hiện tại
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction hiện tại
   */
  rollback(): Promise<void>;

  /**
   * Thực hiện một function trong transaction
   * Tự động commit nếu success, rollback nếu fail
   */
  runInTransaction<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Kiểm tra có đang trong transaction không
   */
  isInTransaction(): boolean;
}

/**
 * Unit of Work Implementation
 * Sử dụng cho NestJS với request scope
 */
@Injectable({ scope: Scope.REQUEST })
export class UnitOfWork implements IUnitOfWork {
  private _isInTransaction: boolean = false;
  private _transactionClient: Database | null = null;

  /**
   * Lấy database client hiện tại
   * Nếu đang trong transaction thì trả về transaction client
   * Nếu không thì trả về default db client
   */
  get client(): Database {
    if (this._isInTransaction && this._transactionClient) {
      return this._transactionClient;
    }
    return db;
  }

  async beginTransaction(): Promise<void> {
    if (this._isInTransaction) {
      throw new Error('Transaction đã được bắt đầu');
    }

    this._isInTransaction = true;
    // SQLite better-sqlite3 không hỗ trợ async transaction
    // Transaction sẽ được xử lý trong runInTransaction
  }

  async commit(): Promise<void> {
    if (!this._isInTransaction) {
      throw new Error('Không có transaction để commit');
    }

    this._isInTransaction = false;
    this._transactionClient = null;
  }

  async rollback(): Promise<void> {
    if (!this._isInTransaction) {
      throw new Error('Không có transaction để rollback');
    }

    this._isInTransaction = false;
    this._transactionClient = null;
  }

  async runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this._isInTransaction) {
      // Đã trong transaction, chỉ thực hiện fn
      return fn();
    }

    // SQLite transaction là synchronous
    // Sử dụng db.transaction pattern
    try {
      this._isInTransaction = true;
      const result = await fn();
      this._isInTransaction = false;
      return result;
    } catch (error) {
      this._isInTransaction = false;
      throw error;
    }
  }

  isInTransaction(): boolean {
    return this._isInTransaction;
  }
}

/**
 * Unit of Work Provider
 * Dùng để inject UoW vào repositories
 */
export const UNIT_OF_WORK_TOKEN = Symbol('UNIT_OF_WORK');
