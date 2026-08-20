import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const slug = dto.orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const existingOrg = await this.prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) throw new ConflictException('Organization slug already taken');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const org = await this.prisma.organization.create({
      data: {
        name: dto.orgName,
        slug,
        users: {
          create: {
            email: dto.email.toLowerCase(),
            passwordHash,
            name: dto.name,
            role: 'admin',
          },
        },
      },
      include: { users: true },
    });

    const user = org.users[0];
    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.orgId, user.email, user.role);
    await this.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken, user: this.sanitizeUser(user, org.name) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), isActive: true },
      include: { org: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.orgId, user.email, user.role);
    await this.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken, user: this.sanitizeUser(user, user.org.name) };
  }

  async refresh(userId: string, incomingToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Session expired');
    }
    if (user.refreshTokenExpiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const valid = await bcrypt.compare(incomingToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException('Invalid session');

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.orgId, user.email, user.role);
    await this.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
    });
  }

  private async generateTokens(userId: string, orgId: string, email: string, role: string) {
    const payload = { sub: userId, orgId, email, role };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    });
    const refreshToken = this.jwt.sign(
      { sub: userId },
      { expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d' },
    );
    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const hash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash, refreshTokenExpiresAt: expiresAt },
    });
  }

  private sanitizeUser(user: any, orgName: string) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      orgName,
    };
  }
}
