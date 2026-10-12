import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { CategoriesService } from './categories.service.js';
import { Category, CategoryType } from './entities/category.entity.js';

const USER = 'user-1';
const { EXPENSE, INCOME } = CategoryType;

function setup() {
  const repo = {
    find: vi.fn().mockResolvedValue([]),
    findOneBy: vi.fn(),
    create: vi.fn((data: Partial<Category>) => data),
    save: vi.fn((data: unknown) => Promise.resolve(data)),
    remove: vi.fn(),
    manager: { exists: vi.fn() },
  };
  const service = new CategoriesService(
    repo as unknown as Repository<Category>,
  );
  return { service, repo };
}

// What TypeORM throws for a PostgreSQL error code
function pgError(code: string) {
  return new QueryFailedError(
    'query',
    [],
    Object.assign(new Error(), { code }),
  );
}

describe('CategoriesService', () => {
  describe('createDefaults', () => {
    it('creates the starter categories for a new user', async () => {
      const { service, repo } = setup();

      await service.createDefaults(USER);

      const saved = repo.save.mock.calls[0][0] as Category[];
      expect(saved).toHaveLength(15);
      expect(saved.every((c) => c.userId === USER)).toBe(true);
      expect(saved.filter((c) => c.type === EXPENSE)).toHaveLength(10);
      expect(saved.filter((c) => c.type === INCOME)).toHaveLength(5);
    });
  });

  describe('findAll', () => {
    it('filters by type when given, sorted by name', async () => {
      const { service, repo } = setup();

      await service.findAll(USER, EXPENSE);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: USER, type: EXPENSE },
        order: { name: 'ASC' },
      });
    });

    it('returns both types when no type is given', async () => {
      const { service, repo } = setup();

      await service.findAll(USER);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER } }),
      );
    });
  });

  describe('create', () => {
    it('rejects a duplicate name + type', async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ name: 'Rent', type: EXPENSE }, USER),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('saves a new category for the user', async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue(null);

      await service.create({ name: 'Pets', type: EXPENSE }, USER);

      expect(repo.save).toHaveBeenCalledWith({
        name: 'Pets',
        type: EXPENSE,
        userId: USER,
      });
    });
  });

  describe('createMany', () => {
    it('skips existing categories instead of failing', async () => {
      const { service, repo } = setup();
      repo.find.mockResolvedValue([{ name: 'Rent', type: EXPENSE }]);

      const result = await service.createMany(
        [
          { name: 'Rent', type: EXPENSE },
          { name: 'Pets', type: EXPENSE },
        ],
        USER,
      );

      expect(result.skipped).toEqual(['Rent']);
      expect(result.created).toEqual([
        { name: 'Pets', type: EXPENSE, userId: USER },
      ]);
    });

    it('treats the same name with a different type as new', async () => {
      const { service, repo } = setup();
      repo.find.mockResolvedValue([{ name: 'Rental', type: EXPENSE }]);

      const result = await service.createMany(
        [{ name: 'Rental', type: INCOME }],
        USER,
      );

      expect(result.skipped).toEqual([]);
      expect(result.created).toHaveLength(1);
    });

    it('skips duplicates inside the same request', async () => {
      const { service } = setup();

      const result = await service.createMany(
        [
          { name: 'Pets', type: EXPENSE },
          { name: 'Pets', type: EXPENSE },
        ],
        USER,
      );

      expect(result.created).toHaveLength(1);
      expect(result.skipped).toEqual(['Pets']);
    });

    it("doesn't call save when everything already exists", async () => {
      const { service, repo } = setup();
      repo.find.mockResolvedValue([{ name: 'Rent', type: EXPENSE }]);

      const result = await service.createMany(
        [{ name: 'Rent', type: EXPENSE }],
        USER,
      );

      expect(result.created).toEqual([]);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws 404 for a missing or foreign category', async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('cat-x', USER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.findOneBy).toHaveBeenCalledWith({
        id: 'cat-x',
        userId: USER,
      });
    });
  });

  describe('update', () => {
    it("won't change the type of a category that has transactions", async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue({
        id: 'c1',
        name: 'Rent',
        type: EXPENSE,
      });
      repo.manager.exists.mockResolvedValue(true);

      await expect(
        service.update('c1', { type: INCOME }, USER),
      ).rejects.toThrow(
        'Category has transactions, so its type cannot be changed.',
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('allows changing the type of an unused category', async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue({
        id: 'c1',
        name: 'Rent',
        type: EXPENSE,
      });
      repo.manager.exists.mockResolvedValue(false);

      await service.update('c1', { type: INCOME }, USER);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: INCOME }),
      );
    });

    it('turns a unique-violation into a 409', async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue({
        id: 'c1',
        name: 'Rent',
        type: EXPENSE,
      });
      repo.save.mockRejectedValue(pgError('23505'));

      await expect(
        service.update('c1', { name: 'Groceries' }, USER),
      ).rejects.toThrow(new ConflictException('Category already exists'));
    });
  });

  describe('remove', () => {
    it('turns a foreign-key violation into a helpful 409', async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue({ id: 'c1' });
      repo.remove.mockRejectedValue(pgError('23503'));

      await expect(service.remove('c1', USER)).rejects.toThrow(
        'Category has transactions. Delete or move them first.',
      );
    });

    it('rethrows other database errors unchanged', async () => {
      const { service, repo } = setup();
      repo.findOneBy.mockResolvedValue({ id: 'c1' });
      const err = pgError('08006'); // connection failure
      repo.remove.mockRejectedValue(err);

      await expect(service.remove('c1', USER)).rejects.toBe(err);
    });
  });
});
