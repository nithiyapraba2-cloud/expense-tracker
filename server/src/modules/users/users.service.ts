import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  private users: User[] = [];
  private nextId = 1;

  async create(createUserDto: CreateUserDto) {
    this.ensureEmailIsFree(createUserDto.email);

    const now = new Date();
    const newUser: User = {
      id: this.nextId++,
      name: createUserDto.name,
      email: createUserDto.email.toLowerCase(),
      password: await bcrypt.hash(createUserDto.password, 10),
      createdAt: now,
      updatedAt: now,
    };

    this.users.push(newUser);
    return this.withoutPassword(newUser);
  }

  findAll() {
    return this.users.map((u) => this.withoutPassword(u));
  }

  findOne(id: number) {
    return this.withoutPassword(this.getUserOrFail(id));
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = this.getUserOrFail(id);

    if (updateUserDto.email) {
      const email = updateUserDto.email.toLowerCase();
      if (email !== user.email) this.ensureEmailIsFree(email);
      user.email = email;
    }

    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    user.updatedAt = new Date();
    return this.withoutPassword(user);
  }

  remove(id: number) {
    this.getUserOrFail(id);
    this.users = this.users.filter((u) => u.id !== id);
    return { message: `User #${id} deleted` };
  }

  // ---------- helpers ----------

  private getUserOrFail(id: number): User {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  private ensureEmailIsFree(email: string) {
    const taken = this.users.some((u) => u.email === email.toLowerCase());
    if (taken) throw new ConflictException('Email is already registered');
  }

  private withoutPassword(user: User) {
    const { password, ...rest } = user;
    return rest;
  }
}
