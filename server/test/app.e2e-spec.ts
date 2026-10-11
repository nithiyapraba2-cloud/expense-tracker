import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// Runs against the database in .env. Each run registers two throwaway users
// and deletes them at the end (their categories and transactions cascade).

type Category = { id: string; name: string; type: 'expense' | 'income' };
type TestUser = { id: string; email: string; token: string };

const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
const today = `${month}-${pad(now.getDate())}`;
const password = 'secret123';

describe('Expense tracker API (e2e)', () => {
  let app: INestApplication<App>;
  let alice: TestUser;
  let bob: TestUser;
  let categories: Category[];
  let expenseTxId: string;

  const http = () => request(app.getHttpServer());
  const auth = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });
  const category = (name: string) => categories.find((c) => c.name === name)!;

  async function registerUser(prefix: string): Promise<TestUser> {
    const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`;
    const res = await http()
      .post('/auth/register')
      .send({ name: prefix, email, password })
      .expect(201);
    return { id: res.body.user.id, email, token: res.body.accessToken };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same pipe as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    alice = await registerUser('alice');
    bob = await registerUser('bob');
  });

  afterAll(async () => {
    for (const user of [alice, bob]) {
      if (user) await http().delete(`/users/${user.id}`).set(auth(user));
    }
    await app.close();
  });

  it('GET / says hello', () => {
    return http().get('/').expect(200).expect('Hello World!');
  });

  describe('auth', () => {
    it('rejects a password shorter than 8 characters', () => {
      return http()
        .post('/auth/register')
        .send({ name: 'x', email: 'short@e2e.test', password: 'abc123' })
        .expect(400);
    });

    it('rejects an email that is already registered', () => {
      return http()
        .post('/auth/register')
        .send({ name: 'again', email: alice.email, password })
        .expect(409);
    });

    it('logs in with the right password', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email: alice.email, password })
        .expect(200);
      expect(res.body.accessToken).toBeTypeOf('string');
      expect(res.body.user.password).toBeUndefined();
    });

    it('rejects a wrong password', () => {
      return http()
        .post('/auth/login')
        .send({ email: alice.email, password: 'wrong-password' })
        .expect(401);
    });

    it('GET /auth/me needs a token', async () => {
      await http().get('/auth/me').expect(401);
      const res = await http().get('/auth/me').set(auth(alice)).expect(200);
      expect(res.body.email).toBe(alice.email);
    });
  });

  describe('categories', () => {
    it('gives a new user the default categories', async () => {
      const res = await http().get('/categories').set(auth(alice)).expect(200);
      categories = res.body;
      const count = (type: string) =>
        categories.filter((c) => c.type === type).length;
      expect(count('expense')).toBe(10);
      expect(count('income')).toBe(5);
    });

    it('returns 409 when renaming to an existing name', () => {
      return http()
        .patch(`/categories/${category('Petrol').id}`)
        .set(auth(alice))
        .send({ name: 'Groceries' })
        .expect(409);
    });
  });

  describe('transactions', () => {
    it('creates an expense and an income', async () => {
      const expense = await http()
        .post('/transactions')
        .set(auth(alice))
        .send({
          type: 'expense',
          amount: 1500.5,
          date: today,
          categoryId: category('Groceries').id,
          paymentMethod: 'upi',
        })
        .expect(201);
      expect(expense.body.amount).toBe(1500.5);
      expect(expense.body.category.name).toBe('Groceries');
      expenseTxId = expense.body.id;

      await http()
        .post('/transactions')
        .set(auth(alice))
        .send({
          type: 'income',
          amount: 50000,
          date: today,
          categoryId: category('Salary').id,
        })
        .expect(201);
    });

    it('rejects a category of the wrong type', () => {
      return http()
        .post('/transactions')
        .set(auth(alice))
        .send({
          type: 'expense',
          amount: 100,
          date: today,
          categoryId: category('Salary').id,
        })
        .expect(400);
    });

    it('rejects a negative amount', () => {
      return http()
        .post('/transactions')
        .set(auth(alice))
        .send({
          type: 'expense',
          amount: -5,
          date: today,
          categoryId: category('Groceries').id,
        })
        .expect(400);
    });

    it('blocks changing the type of a category that has transactions', () => {
      return http()
        .patch(`/categories/${category('Groceries').id}`)
        .set(auth(alice))
        .send({ type: 'income' })
        .expect(409);
    });

    it('blocks deleting a category that has transactions', () => {
      return http()
        .delete(`/categories/${category('Groceries').id}`)
        .set(auth(alice))
        .expect(409);
    });

    it('lists transactions for the month', async () => {
      const res = await http()
        .get('/transactions')
        .query({ from: `${month}-01`, to: today })
        .set(auth(alice))
        .expect(200);
      expect(res.body.total).toBe(2);
    });

    it('monthly summary adds up', async () => {
      const res = await http()
        .get('/transactions/summary')
        .query({ month })
        .set(auth(alice))
        .expect(200);
      expect(res.body.totalIncome).toBe(50000);
      expect(res.body.totalExpense).toBe(1500.5);
      expect(res.body.balance).toBe(48499.5);
      expect(res.body.expenseByCategory[0].name).toBe('Groceries');
    });

    it('all-time totals add up', async () => {
      const res = await http()
        .get('/transactions/totals')
        .set(auth(alice))
        .expect(200);
      expect(res.body).toEqual({
        totalIncome: 50000,
        totalExpense: 1500.5,
        balance: 48499.5,
      });
    });

    it('trend includes this month with savings', async () => {
      const res = await http()
        .get('/transactions/trend')
        .query({ months: 3 })
        .set(auth(alice))
        .expect(200);
      expect(res.body).toHaveLength(3);
      expect(res.body.at(-1)).toEqual({
        month,
        income: 50000,
        expense: 1500.5,
        savings: 48499.5,
      });
    });

    it("another user cannot see or delete alice's transaction", async () => {
      await http()
        .get(`/transactions/${expenseTxId}`)
        .set(auth(bob))
        .expect(404);
      await http()
        .delete(`/transactions/${expenseTxId}`)
        .set(auth(bob))
        .expect(404);
      const res = await http()
        .get('/transactions/totals')
        .set(auth(bob))
        .expect(200);
      expect(res.body.balance).toBe(0);
    });

    it('updates and deletes a transaction', async () => {
      const updated = await http()
        .patch(`/transactions/${expenseTxId}`)
        .set(auth(alice))
        .send({ amount: 2000, note: 'monthly shopping' })
        .expect(200);
      expect(updated.body.amount).toBe(2000);
      expect(updated.body.note).toBe('monthly shopping');

      await http()
        .delete(`/transactions/${expenseTxId}`)
        .set(auth(alice))
        .expect(200);
      await http()
        .get(`/transactions/${expenseTxId}`)
        .set(auth(alice))
        .expect(404);
    });
  });

  describe('users', () => {
    it('returns 409 when changing email to one already registered', () => {
      return http()
        .patch(`/users/${alice.id}`)
        .set(auth(alice))
        .send({ email: bob.email })
        .expect(409);
    });

    it("cannot read another user's account", () => {
      return http().get(`/users/${bob.id}`).set(auth(alice)).expect(403);
    });
  });
});
