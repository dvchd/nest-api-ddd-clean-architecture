import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  photo: string;
  provider: 'google';
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3001/api/auth/google/callback'
      ),
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<void> {
    if (!profile) {
      return done(new UnauthorizedException('Google profile not found'), null);
    }

    const { id, name, emails, photos } = profile;

    if (!emails || emails.length === 0) {
      return done(new UnauthorizedException('Email not found in Google profile'), null);
    }

    const googleProfile: GoogleProfile = {
      id,
      email: emails[0].value,
      displayName: name
        ? `${name.givenName} ${name.familyName}`.trim()
        : emails[0].value.split('@')[0],
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      photo: photos && photos.length > 0 ? photos[0].value : '',
      provider: 'google',
    };

    done(null, googleProfile);
  }
}
