/**
 * Email Value Object
 * Đảm bảo email luôn hợp lệ trong domain
 */
export class Email {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(private readonly _value: string) {}

  static create(email: string): Email {
    if (!email || email.trim().length === 0) {
      throw new Error('Email không được để trống');
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!this.EMAIL_REGEX.test(normalizedEmail)) {
      throw new Error(`Email không hợp lệ: ${email}`);
    }

    return new Email(normalizedEmail);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
