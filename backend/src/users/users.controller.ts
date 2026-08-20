import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: JwtPayload) {
    return { data: await this.usersService.findMe(user.sub) };
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserDto) {
    return { data: await this.usersService.updateMe(user.sub, dto) };
  }

  @Get()
  @Roles('admin')
  async getAll(@CurrentUser() user: JwtPayload) {
    return { data: await this.usersService.findAllInOrg(user.orgId) };
  }

  @Post('invite')
  @Roles('admin')
  async invite(@CurrentUser() user: JwtPayload, @Body() dto: InviteUserDto) {
    // Allow superadmin to specify orgId in the DTO to invite into other organisations
    const targetOrgId = (user.role === 'superadmin' && dto.orgId) ? dto.orgId : user.orgId;
    return { data: await this.usersService.invite(targetOrgId, dto) };
  }
}
