import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { PortfolioService } from './portfolio.service';
import { AddHoldingDto } from './dto/add-holding.dto';
import { UpdateHoldingDto } from './dto/update-holding.dto';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.portfolio.getWithPnl(user.sub, user.orgId);
  }

  @Post('holdings')
  addHolding(@CurrentUser() user: JwtPayload, @Body() dto: AddHoldingDto) {
    return this.portfolio.addHolding(user.sub, user.orgId, dto);
  }

  @Patch('holdings/:id')
  updateHolding(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateHoldingDto,
  ) {
    return this.portfolio.updateHolding(user.sub, id, dto);
  }

  @Delete('holdings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeHolding(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.portfolio.removeHolding(user.sub, id);
  }

  @Post('holdings/:id/sell')
  async sellHolding(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: any) {
    return this.portfolio.sellHolding(user.sub, id, dto);
  }
}
