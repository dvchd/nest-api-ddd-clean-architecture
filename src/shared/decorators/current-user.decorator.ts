import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ValidatedUser } from '@/infrastructure/auth/strategies/jwt.strategy';

/**
 * Decorator to extract current user from request
 * @example @CurrentUser() user: ValidatedUser
 */
export const CurrentUser = createParamDecorator(
  (data: keyof ValidatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ValidatedUser;

    if (!user) {
      return null;
    }

    // Return specific field if requested
    return data ? user[data] : user;
  }
);
