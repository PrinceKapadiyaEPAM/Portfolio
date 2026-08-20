import {
  Controller, Post, Body, Req, Res, UseGuards, HttpCode,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    res.cookie('rt', result.refreshToken, COOKIE_OPTIONS);
    return { data: { accessToken: result.accessToken, user: result.user } };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    res.cookie('rt', result.refreshToken, COOKIE_OPTIONS);
    return { data: { accessToken: result.accessToken, user: result.user } };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as any).cookies?.rt as string | undefined;
    if (!token) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No refresh token', statusCode: 401 } });
      return;
    }
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()) as { sub: string };
    const result = await this.authService.refresh(payload.sub, token);
    res.cookie('rt', result.refreshToken, COOKIE_OPTIONS);
    return { data: { accessToken: result.accessToken } };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.sub);
    res.clearCookie('rt', { path: '/' });
    return { data: { success: true } };
  }
}
