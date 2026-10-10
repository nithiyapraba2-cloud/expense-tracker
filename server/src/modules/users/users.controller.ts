import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AuthGuard } from '../../auth/auth.guard.js';

type AuthRequest = Request & { user: { id: string; email: string } };

// Registration happens through POST /auth/register; these routes are for
// a logged-in user managing their own account only.
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    this.assertSelf(id, req);
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: AuthRequest,
  ) {
    this.assertSelf(id, req);
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    this.assertSelf(id, req);
    return this.usersService.remove(id);
  }

  private assertSelf(id: string, req: AuthRequest) {
    if (req.user.id !== id) {
      throw new ForbiddenException('You can only access your own account');
    }
  }
}
