import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Transaction } from './entities/transaction.entity.js';
import { CategoryType } from '../categories/entities/category.entity.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { QueryTransactionDto } from './dto/query-transaction.dto.js';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepo: Repository<Transaction>,
    private readonly categoriesService: CategoriesService,
  ) {}

  // Category must belong to this user AND match the type
  private async checkCategory(
    categoryId: string,
    type: CategoryType,
    userId: string,
  ) {
    const category = await this.categoriesService.findOne(categoryId, userId);
    if (category.type !== type) {
      throw new BadRequestException(
        `Category "${category.name}" is for ${category.type}, not ${type}`,
      );
    }
  }

  async create(dto: CreateTransactionDto, userId: string) {
    await this.checkCategory(dto.categoryId, dto.type, userId);
    const saved = await this.transactionsRepo.save(
      this.transactionsRepo.create({ ...dto, userId }),
    );
    return this.findOne(saved.id, userId);
  }

  async findAll(userId: string, query: QueryTransactionDto) {
    const { page, limit, type, categoryId, from, to } = query;
    const where: FindOptionsWhere<Transaction> = { userId };

    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (from && to) where.date = Between(from, to);
    else if (from) where.date = MoreThanOrEqual(from);
    else if (to) where.date = LessThanOrEqual(to);

    const [data, total] = await this.transactionsRepo.findAndCount({
      where,
      order: { date: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string, userId: string) {
    const transaction = await this.transactionsRepo.findOneBy({ id, userId });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async update(id: string, dto: UpdateTransactionDto, userId: string) {
    const existing = await this.findOne(id, userId);

    if (dto.type || dto.categoryId) {
      await this.checkCategory(
        dto.categoryId ?? existing.categoryId,
        dto.type ?? existing.type,
        userId,
      );
    }

    await this.transactionsRepo.update({ id, userId }, dto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    const transaction = await this.findOne(id, userId);
    await this.transactionsRepo.remove(transaction);
    return { deleted: true };
  }

  // All-time income, expense and balance
  async totals(userId: string) {
    const rows = await this.transactionsRepo
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .groupBy('t.type')
      .getRawMany<{ type: CategoryType; total: string }>();

    const totalFor = (type: CategoryType) =>
      Number(rows.find((r) => r.type === type)?.total ?? 0);
    const totalIncome = totalFor(CategoryType.INCOME);
    const totalExpense = totalFor(CategoryType.EXPENSE);

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }

  // Dashboard totals for one month, e.g. month = '2026-10'
  async summary(userId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const from = `${month}-01`;
    const to = `${month}-${String(lastDay).padStart(2, '0')}`;

    const rows = await this.transactionsRepo
      .createQueryBuilder('t')
      .innerJoin('t.category', 'c')
      .select('t.type', 'type')
      .addSelect('c.id', 'categoryId')
      .addSelect('c.name', 'name')
      .addSelect('c.icon', 'icon')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.date BETWEEN :from AND :to', { from, to })
      .groupBy('t.type')
      .addGroupBy('c.id')
      .orderBy('SUM(t.amount)', 'DESC')
      .getRawMany<{
        type: CategoryType;
        categoryId: string;
        name: string;
        icon: string | null;
        total: string;
      }>();

    const byCategory = rows.map((r) => ({ ...r, total: Number(r.total) }));
    const sumOf = (type: CategoryType) =>
      byCategory
        .filter((r) => r.type === type)
        .reduce((s, r) => s + r.total, 0);

    const totalIncome = sumOf(CategoryType.INCOME);
    const totalExpense = sumOf(CategoryType.EXPENSE);

    return {
      month,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      expenseByCategory: byCategory.filter(
        (r) => r.type === CategoryType.EXPENSE,
      ),
      incomeByCategory: byCategory.filter(
        (r) => r.type === CategoryType.INCOME,
      ),
    };
  }
  // Income and expense per month, for the last N months (including this one)
  async trend(userId: string, months: number) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const from = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;

    const rows = await this.transactionsRepo
      .createQueryBuilder('t')
      .select(`TO_CHAR(t.date, 'YYYY-MM')`, 'month')
      .addSelect('t.type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.date >= :from', { from })
      .groupBy(`TO_CHAR(t.date, 'YYYY-MM')`)
      .addGroupBy('t.type')
      .getRawMany<{ month: string; type: CategoryType; total: string }>();

    // Build every month, filling 0 for months with no data
    const result: {
      month: string;
      income: number;
      expense: number;
      savings: number;
    }[] = [];

    for (let i = 0; i < months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const totalFor = (type: CategoryType) =>
        Number(
          rows.find((r) => r.month === key && r.type === type)?.total ?? 0,
        );

      const income = totalFor(CategoryType.INCOME);
      const expense = totalFor(CategoryType.EXPENSE);
      result.push({ month: key, income, expense, savings: income - expense });
    }

    return result;
  }
}
