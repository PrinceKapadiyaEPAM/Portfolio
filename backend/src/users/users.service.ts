import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { org: { select: { name: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      include: { org: { select: { name: true } } },
    });
    return this.sanitize(user);
  }

  async findAllInOrg(orgId: string) {
    const users = await this.prisma.user.findMany({
      where: { orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => this.sanitize(u));
  }

  async invite(orgId: string, dto: InviteUserDto) {
    // validate organization exists
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    const existing = await this.prisma.user.findFirst({
      where: { orgId, email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('User with this email already exists in the organization');

    const tempPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        orgId,
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: dto.role,
        isActive: false,
      },
    });

    return this.sanitize(user);
  }

  private sanitize(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      orgId: user.orgId,
      orgName: user.org?.name,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
