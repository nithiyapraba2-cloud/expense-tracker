import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  // Pass a manager to run inside a caller's transaction
  async create(dto: CreateUserDto, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(User) : this.usersRepo;

    const exists = await repo.findOneBy({ email: dto.email });
    if (exists) throw new ConflictException('Email already registered');

    const password = await bcrypt.hash(dto.password, 10);
    const saved = await repo.save(repo.create({ ...dto, password }));
    // re-read so password is not returned
    return repo.findOneByOrFail({ id: saved.id });
  }

  findAll() {
    return this.usersRepo.find();
  }

  async findOne(id: string) {
    const user = await this.usersRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findByEmail(email: string) {
    return this.usersRepo.findOneBy({ email });
  }

  // password has select: false, so we ask for it explicitly (login only)
  findByEmailWithPassword(email: string) {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);
    await this.usersRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.usersRepo.remove(user);
    return { deleted: true };
  }
}
