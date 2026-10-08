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

export type PublicUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  private users: User[] = [];
  private nextId = 1;

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    const email = createUserDto.email.toLowerCase();
    this.ensureEmailIsFree(email);

    const now = new Date();
    const newUser: User = {
      id: this.nextId++,
      name: createUserDto.name,
      email,
      password: await bcrypt.hash(createUserDto.password, 10),
      createdAt: now,
      updatedAt: now,
    };

    this.users.push(newUser);
    return this.withoutPassword(newUser);
  }

  findAll(): PublicUser[] {
    return this.users.map((u) => this.withoutPassword(u));
  }

  findOne(id: number): PublicUser {
    return this.withoutPassword(this.getUserOrFail(id));
  }

  /**
   * Returns the full user INCLUDING the password hash.
   * Use only inside the app (e.g. AuthService for bcrypt.compare).
   * Never return this directly from a controller.
   */
  findByEmailWithPassword(email: string): User | undefined {
    return this.users.find((u) => u.email === email.toLowerCase());
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<PublicUser> {
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

  remove(id: number): { message: string } {
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

  private ensureEmailIsFree(email: string): void {
    const taken = this.users.some((u) => u.email === email);
    if (taken) throw new ConflictException('Email is already registered');
  }

  private withoutPassword(user: User): PublicUser {
    const { password: _password, ...rest } = user;
    return rest;
  }
}
