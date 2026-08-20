import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Controller('organize')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly org: OrganizationService) {}

  @Get()
  @Roles('superadmin')
  list() {
    return this.org.findAll();
  }

  @Get(':id/users')
  @Roles('superadmin')
  getUsers(@Param('id') id: string) {
    return this.org.findUsers(id);
  }

  @Get(':id')
  @Roles('superadmin')
  getOne(@Param('id') id: string) {
    return this.org.findOne(id);
  }

  @Post()
  @Roles('superadmin')
  create(@Body() dto: CreateOrganizationDto) {
    return this.org.create(dto);
  }

  @Patch(':id')
  @Roles('superadmin')
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.org.update(id, dto);
  }

  @Delete(':id')
  @Roles('superadmin')
  remove(@Param('id') id: string) {
    return this.org.remove(id);
  }
}
