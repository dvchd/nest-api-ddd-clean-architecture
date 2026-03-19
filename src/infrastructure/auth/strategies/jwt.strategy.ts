import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface IJwtPayload {
  sub: string; // User ID
  email: string;
  roleId: string;
  roleName: string;
  iat?: number;
  exp?: number;
}

export interface IValidatedUser {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key-change-in-production'),
    });
  }

  async validate(payload: IJwtPayload): Promise<IValidatedUser> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      roleName: payload.roleName,
    };
  }
}
