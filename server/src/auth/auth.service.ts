import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { UsersService } from '../modules/users/users.service.js';
import { CategoriesService } from '../modules/categories/categories.service.js';
import { CreateUserDto } from '../modules/users/dto/create-user.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly categoriesService: CategoriesService,
    private readonly dataSource: DataSource,
  ) {}

  async register(createUserDto: CreateUserDto) {
    // One transaction: if default categories fail, the user is rolled back too
    const user = await this.dataSource.transaction(async (manager) => {
      const created = await this.usersService.create(createUserDto, manager);
      await this.categoriesService.createDefaults(created.id, manager);
      return created;
    });
    return this.buildResponse(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );

    // Same message for both cases so attackers can't tell which emails exist
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password, ...safeUser } = user;
    return this.buildResponse(safeUser);
  }

  private async buildResponse(user: {
    id: string;
    name: string;
    email: string;
  }) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken, user };
  }
}
