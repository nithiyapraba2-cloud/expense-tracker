import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { Category, CategoryType } from './entities/category.entity.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

const DEFAULT_CATEGORIES = [
  { name: 'Petrol', icon: '⛽', type: CategoryType.EXPENSE },
  { name: 'Vegetables', icon: '🥦', type: CategoryType.EXPENSE },
  { name: 'Groceries', icon: '🛒', type: CategoryType.EXPENSE },
  { name: 'School Fees', icon: '🎓', type: CategoryType.EXPENSE },
  { name: 'Medical', icon: '💊', type: CategoryType.EXPENSE },
  { name: 'Electricity', icon: '💡', type: CategoryType.EXPENSE },
  { name: 'Rent', icon: '🏠', type: CategoryType.EXPENSE },
  { name: 'EMI', icon: '🏦', type: CategoryType.EXPENSE },
  { name: 'Entertainment', icon: '🎬', type: CategoryType.EXPENSE },
  { name: 'Others', icon: '📦', type: CategoryType.EXPENSE },
  { name: 'Salary', icon: '💼', type: CategoryType.INCOME },
  { name: 'Business', icon: '🏪', type: CategoryType.INCOME },
  { name: 'Freelance', icon: '💻', type: CategoryType.INCOME },
  { name: 'Rental', icon: '🏘️', type: CategoryType.INCOME },
  { name: 'Other', icon: '💰', type: CategoryType.INCOME },
];

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
  ) {}

  // Called once when a user registers (inside the register transaction)
  createDefaults(userId: string, manager?: EntityManager) {
    const repo = manager
      ? manager.getRepository(Category)
      : this.categoriesRepo;
    const categories = DEFAULT_CATEGORIES.map((c) =>
      repo.create({ ...c, userId }),
    );
    return repo.save(categories);
  }

  findAll(userId: string, type?: CategoryType) {
    return this.categoriesRepo.find({
      where: type ? { userId, type } : { userId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, userId: string) {
    // userId in the query = a user can never read another user's category
    const category = await this.categoriesRepo.findOneBy({ id, userId });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto, userId: string) {
    const exists = await this.categoriesRepo.findOneBy({
      userId,
      name: dto.name,
      type: dto.type,
    });
    if (exists) throw new ConflictException('Category already exists');
    return this.categoriesRepo.save(
      this.categoriesRepo.create({ ...dto, userId }),
    );
  }

  // Create several categories at once; existing ones are skipped, not errors
  async createMany(dtos: CreateCategoryDto[], userId: string) {
    const existing = await this.categoriesRepo.find({
      where: { userId, name: In(dtos.map((d) => d.name)) },
    });
    const taken = new Set(existing.map((c) => `${c.name}|${c.type}`));

    const toCreate: CreateCategoryDto[] = [];
    const skipped: string[] = [];

    for (const dto of dtos) {
      const key = `${dto.name}|${dto.type}`;
      if (taken.has(key)) {
        skipped.push(dto.name);
        continue;
      }
      taken.add(key); // also catches duplicates inside the same request
      toCreate.push(dto);
    }

    const created = toCreate.length
      ? await this.categoriesRepo.save(
          toCreate.map((dto) => this.categoriesRepo.create({ ...dto, userId })),
        )
      : [];

    return { created, skipped };
  }

  async update(id: string, dto: UpdateCategoryDto, userId: string) {
    const category = await this.findOne(id, userId);
    Object.assign(category, dto);
    return this.categoriesRepo.save(category);
  }

  async remove(id: string, userId: string) {
    const category = await this.findOne(id, userId);
    try {
      await this.categoriesRepo.remove(category);
    } catch (err) {
      // 23503 = PostgreSQL foreign key violation
      if (
        err instanceof QueryFailedError &&
        err.driverError?.code === '23503'
      ) {
        throw new ConflictException(
          'Category has transactions. Delete or move them first.',
        );
      }
      throw err;
    }
    return { deleted: true };
  }
}
