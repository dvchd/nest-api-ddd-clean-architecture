import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '@/application/services';
import { Public, CurrentUser } from '@/shared/decorators';
import { ValidatedUser } from '@/infrastructure/auth/strategies/jwt.strategy';
import { GoogleProfile } from '@/infrastructure/auth/strategies/google.strategy';
import { RefreshTokenDto } from '@/application/dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Initiates Google OAuth flow
   * Redirects user to Google login page
   */
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard will redirect to Google
  }

  /**
   * Google OAuth callback
   * Exchanges code for tokens and returns user data
   */
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const googleProfile = req.user as GoogleProfile;

    const result = await this.authService.handleGoogleLogin(googleProfile);

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);

    redirectUrl.searchParams.set('accessToken', result.tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', result.tokens.refreshToken);
    redirectUrl.searchParams.set('isNewUser', String(result.isNewUser));

    return res.redirect(redirectUrl.toString());
  }

  /**
   * Refresh access token using refresh token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(dto.refreshToken);

    return {
      success: true,
      data: tokens,
    };
  }

  /**
   * Get current user profile
   */
  @Get('me')
  async getCurrentUser(@CurrentUser() user: ValidatedUser) {
    return {
      success: true,
      data: user,
    };
  }

  /**
   * Logout current user
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: ValidatedUser) {
    await this.authService.logout(user.id);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
