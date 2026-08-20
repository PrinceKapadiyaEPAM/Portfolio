import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organization.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('organization not found');
    return org;
  }

  async create(dto: CreateOrganizationDto) {
    try {
      const slug = dto.slug ?? dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50);
      return await this.prisma.organization.create({ data: { name: dto.name, slug, plan: dto.plan ?? 'free', isActive: dto.isActive ?? true } });
    } catch (err) {
      if ((err as any)?.code === 'P2002') throw new ConflictException('organization slug already exists');
      throw err;
    }
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('organization not found');
    try {
      return await this.prisma.organization.update({ where: { id }, data: dto });
    } catch (err) {
      if ((err as any)?.code === 'P2002') throw new ConflictException('organization slug already exists');
      throw err;
    }
  }

  async remove(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('organization not found');
    await this.prisma.organization.delete({ where: { id } });
  }
}
