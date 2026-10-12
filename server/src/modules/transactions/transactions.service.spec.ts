import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { TransactionsService } from './transactions.service.js';
import { Transaction } from './entities/transaction.entity.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CategoryType } from '../categories/entities/category.entity.js';
import { QueryTransactionDto } from './dto/query-transaction.dto.js';

const USER = 'user-1';

// Every query-builder method returns the builder; getRawMany returns `rows`
function fakeQueryBuilder(rows: unknown[]) {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    'select',
    'addSelect',
    'innerJoin',
    'where',
    'andWhere',
    'groupBy',
    'addGroupBy',
    'orderBy',
  ]) {
    qb[m] = vi.fn(() => qb);
  }
  qb.getRawMany = vi.fn().mockResolvedValue(rows);
  return qb;
}

function setup() {
  const repo = {
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
    findOneBy: vi.fn(),
    create: vi.fn((data: Partial<Transaction>) => data),
    save: vi.fn((data: Partial<Transaction>) =>
      Promise.resolve({ ...data, id: 'tx-new' }),
    ),
    update: vi.fn(),
    remove: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const categories = { findOne: vi.fn() };
  const service = new TransactionsService(
    repo as unknown as Repository<Transaction>,
    categories as unknown as CategoriesService,
  );
  return { service, repo, categories };
}

function query(overrides: Partial<QueryTransactionDto> = {}) {
  return Object.assign(new QueryTransactionDto(), overrides);
}

describe('TransactionsService', () => {
  describe('findAll (pagination + filters)', () => {
    it('defaults to page 1 of 20, newest first, only this user', async () => {
      const { service, repo } = setup();

      await service.findAll(USER, query());

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { userId: USER },
        order: { date: 'DESC', createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('skips the rows of earlier pages', async () => {
      const { service, repo } = setup();

      await service.findAll(USER, query({ page: 3, limit: 10 }));

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('returns rows with paging info for the client', async () => {
      const { service, repo } = setup();
      const rows = [{ id: 'a' }, { id: 'b' }];
      repo.findAndCount.mockResolvedValue([rows, 47]);

      const result = await service.findAll(USER, query({ page: 2 }));

      expect(result).toEqual({ data: rows, total: 47, page: 2, limit: 20 });
    });

    it('filters by type and category', async () => {
      const { service, repo } = setup();

      await service.findAll(
        USER,
        query({ type: CategoryType.EXPENSE, categoryId: 'cat-1' }),
      );

      expect(repo.findAndCount.mock.calls[0][0].where).toEqual({
        userId: USER,
        type: CategoryType.EXPENSE,
        categoryId: 'cat-1',
      });
    });

    it.each([
      [
        { from: '2026-10-01', to: '2026-10-31' },
        Between('2026-10-01', '2026-10-31'),
      ],
      [{ from: '2026-10-01' }, MoreThanOrEqual('2026-10-01')],
      [{ to: '2026-10-31' }, LessThanOrEqual('2026-10-31')],
    ])('filters dates for %o', async (dates, expected) => {
      const { service, repo } = setup();

      await service.findAll(USER, query(dates));

      expect(repo.findAndCount.mock.calls[0][0].where.date).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it("looks up by id AND user, so users can't read each other's data", async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue({ id: 'tx-1' });

      await service.findOne('tx-1', USER);

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'tx-1', userId: USER });
    });

    it('throws 404 when missing', async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('nope', USER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const dto = {
      type: CategoryType.EXPENSE,
      amount: 250,
      date: '2026-10-12',
      categoryId: 'cat-groceries',
    };

    it('saves with the user id and returns the stored row', async () => {
      const { service, repo, categories } = setup();
      categories.findOne.mockResolvedValue({
        name: 'Groceries',
        type: CategoryType.EXPENSE,
      });
      repo.findOneBy.mockResolvedValue({ id: 'tx-new', ...dto });

      const result = await service.create(dto, USER);

      expect(categories.findOne).toHaveBeenCalledWith('cat-groceries', USER);
      expect(repo.save).toHaveBeenCalledWith({ ...dto, userId: USER });
      expect(result).toEqual({ id: 'tx-new', ...dto });
    });

    it('rejects a category of the other type', async () => {
      const { service, repo, categories } = setup();
      categories.findOne.mockResolvedValue({
        name: 'Salary',
        type: CategoryType.INCOME,
      });

      await expect(service.create(dto, USER)).rejects.toThrow(
        new BadRequestException('Category "Salary" is for income, not expense'),
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const existing = {
      id: 'tx-1',
      type: CategoryType.EXPENSE,
      categoryId: 'cat-groceries',
    };

    it('skips the category check when neither type nor category change', async () => {
      const { service, repo, categories } = setup();
      repo.findOneBy.mockResolvedValue(existing);

      await service.update('tx-1', { amount: 300 }, USER);

      expect(categories.findOne).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        { id: 'tx-1', userId: USER },
        { amount: 300 },
      );
    });

    it('checks the new type against the existing category', async () => {
      const { service, repo, categories } = setup();
      repo.findOneBy.mockResolvedValue(existing);
      categories.findOne.mockResolvedValue({
        name: 'Groceries',
        type: CategoryType.EXPENSE,
      });

      await expect(
        service.update('tx-1', { type: CategoryType.INCOME }, USER),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(categories.findOne).toHaveBeenCalledWith('cat-groceries', USER);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the row after checking it belongs to the user', async () => {
      const { service, repo } = setup();
      const tx = { id: 'tx-1' };
      repo.findOneBy.mockResolvedValue(tx);

      await expect(service.remove('tx-1', USER)).resolves.toEqual({
        deleted: true,
      });
      expect(repo.remove).toHaveBeenCalledWith(tx);
    });

    it("doesn't delete what it can't find", async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.remove('tx-1', USER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });

  describe('totals', () => {
    it('converts the SQL sums and computes the balance', async () => {
      const { service, repo } = setup();
      repo.createQueryBuilder.mockReturnValue(
        fakeQueryBuilder([
          { type: 'income', total: '50000.00' },
          { type: 'expense', total: '12345.50' },
        ]),
      );

      await expect(service.totals(USER)).resolves.toEqual({
        totalIncome: 50000,
        totalExpense: 12345.5,
        balance: 37654.5,
      });
    });

    it('returns zeros for a new user', async () => {
      const { service, repo } = setup();
      repo.createQueryBuilder.mockReturnValue(fakeQueryBuilder([]));

      await expect(service.totals(USER)).resolves.toEqual({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
      });
    });
  });

  describe('summary', () => {
    it('queries the whole month and splits by type', async () => {
      const { service, repo } = setup();
      const qb = fakeQueryBuilder([
        {
          type: 'expense',
          categoryId: 'c1',
          name: 'Rent',
          icon: '🏠',
          total: '15000.00',
        },
        {
          type: 'expense',
          categoryId: 'c2',
          name: 'Groceries',
          icon: '🛒',
          total: '4200.50',
        },
        {
          type: 'income',
          categoryId: 'c3',
          name: 'Salary',
          icon: '💼',
          total: '50000.00',
        },
      ]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.summary(USER, '2026-02');

      expect(qb.andWhere).toHaveBeenCalledWith('t.date BETWEEN :from AND :to', {
        from: '2026-02-01',
        to: '2026-02-28',
      });
      expect(result.totalIncome).toBe(50000);
      expect(result.totalExpense).toBe(19200.5);
      expect(result.balance).toBe(30799.5);
      expect(result.expenseByCategory.map((c) => c.name)).toEqual([
        'Rent',
        'Groceries',
      ]);
      expect(result.incomeByCategory).toHaveLength(1);
      expect(result.expenseByCategory[0].total).toBe(15000); // number, not "15000.00"
    });

    it('uses 29 days for February in a leap year', async () => {
      const { service, repo } = setup();
      const qb = fakeQueryBuilder([]);
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.summary(USER, '2028-02');

      expect(qb.andWhere).toHaveBeenCalledWith(expect.any(String), {
        from: '2028-02-01',
        to: '2028-02-29',
      });
    });

    it('reports a negative balance when overspent', async () => {
      const { service, repo } = setup();
      repo.createQueryBuilder.mockReturnValue(
        fakeQueryBuilder([
          {
            type: 'expense',
            categoryId: 'c1',
            name: 'Rent',
            icon: null,
            total: '800',
          },
          {
            type: 'income',
            categoryId: 'c3',
            name: 'Salary',
            icon: null,
            total: '500',
          },
        ]),
      );

      const result = await service.summary(USER, '2026-10');

      expect(result.balance).toBe(-300);
    });
  });

  describe('trend', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 1, 15)); // 15 Feb 2026
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns every month (oldest first), filling gaps with 0', async () => {
      const { service, repo } = setup();
      const qb = fakeQueryBuilder([
        { month: '2025-12', type: 'income', total: '1000' },
        { month: '2025-12', type: 'expense', total: '400' },
        { month: '2026-02', type: 'expense', total: '250.50' },
      ]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.trend(USER, 3);

      // Starts at the 1st of the oldest month, across the year boundary
      expect(qb.andWhere).toHaveBeenCalledWith('t.date >= :from', {
        from: '2025-12-01',
      });
      expect(result).toEqual([
        { month: '2025-12', income: 1000, expense: 400, savings: 600 },
        { month: '2026-01', income: 0, expense: 0, savings: 0 },
        { month: '2026-02', income: 0, expense: 250.5, savings: -250.5 },
      ]);
    });

    it('returns just this month for months = 1', async () => {
      const { service, repo } = setup();
      repo.createQueryBuilder.mockReturnValue(fakeQueryBuilder([]));

      const result = await service.trend(USER, 1);

      expect(result.map((r) => r.month)).toEqual(['2026-02']);
    });
  });
});
