import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { QueryTransactionDto } from './query-transaction.dto.js';
import { CreateTransactionDto } from './create-transaction.dto.js';
import { SummaryQueryDto } from './summary-query.dto.js';
import { TrendQueryDto } from './trend-query.dto.js';

// Same options as main.ts, so these tests see what a real request sees
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function validate<T>(
  metatype: Type<T>,
  value: unknown,
  type: 'query' | 'body' = 'query',
) {
  return pipe.transform(value, { type, metatype }) as Promise<T>;
}

describe('QueryTransactionDto', () => {
  it('defaults to page 1, limit 20', async () => {
    const dto = await validate(QueryTransactionDto, {});
    expect(dto).toMatchObject({ page: 1, limit: 20 });
  });

  it('converts query-string numbers', async () => {
    const dto = await validate(QueryTransactionDto, { page: '2', limit: '50' });
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);
  });

  it.each([
    ['page 0', { page: '0' }],
    ['a negative page', { page: '-1' }],
    ['a decimal page', { page: '1.5' }],
    ['limit over 100', { limit: '500' }],
    ['an unknown type', { type: 'refund' }],
    ['a bad date', { from: '12/10/2026' }],
    ['an unknown field', { sort: 'amount' }],
  ])('rejects %s', async (_label, value) => {
    await expect(validate(QueryTransactionDto, value)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('CreateTransactionDto', () => {
  const valid = {
    type: 'expense',
    amount: 250.75,
    date: '2026-10-12',
    categoryId: '6f1c2b8e-3d4a-4b5c-9d6e-7f8a9b0c1d2e',
  };

  it('accepts a valid transaction', async () => {
    await expect(
      validate(CreateTransactionDto, valid, 'body'),
    ).resolves.toMatchObject(valid);
  });

  it('accepts null payment method and note (what the app sends)', async () => {
    await expect(
      validate(
        CreateTransactionDto,
        { ...valid, paymentMethod: null, note: null },
        'body',
      ),
    ).resolves.toBeDefined();
  });

  it.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -5 }],
    ['three decimals', { amount: 1.234 }],
    ['amount as text', { amount: '250' }],
    ['impossible date', { date: '2026-02-30' }],
    ['non-uuid category', { categoryId: 'groceries' }],
    ['unknown payment method', { paymentMethod: 'cheque' }],
    ['note over 255 chars', { note: 'x'.repeat(256) }],
  ])('rejects %s', async (_label, change) => {
    await expect(
      validate(CreateTransactionDto, { ...valid, ...change }, 'body'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SummaryQueryDto', () => {
  it('accepts YYYY-MM', async () => {
    await expect(
      validate(SummaryQueryDto, { month: '2026-10' }),
    ).resolves.toMatchObject({ month: '2026-10' });
  });

  it.each(['2026-13', '2026-1', '10-2026', ''])(
    'rejects "%s"',
    async (month) => {
      await expect(validate(SummaryQueryDto, { month })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
});

describe('TrendQueryDto', () => {
  it('defaults to 6 months', async () => {
    const dto = await validate(TrendQueryDto, {});
    expect(dto.months).toBe(6);
  });

  it.each(['0', '13'])('rejects months=%s', async (months) => {
    await expect(validate(TrendQueryDto, { months })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
