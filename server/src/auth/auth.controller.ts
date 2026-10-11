import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { CreateUserDto } from '../modules/users/dto/create-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UsersService } from '../modules/users/users.service.js';
import { CurrentUserId } from '../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUserId() userId: string) {
    // Read from the DB so the name is included (the token only has id + email)
    return this.usersService.findOne(userId);
  }
}
