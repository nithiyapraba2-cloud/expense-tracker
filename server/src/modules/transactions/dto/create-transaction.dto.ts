import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
} from 'class-validator';
import { CategoryType } from '../../categories/entities/category.entity.js';
import { PaymentMethod } from '../entities/transaction.entity.js';

export class CreateTransactionDto {
  @IsEnum(CategoryType)
  type: CategoryType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9999999999)
  amount: number;

  @IsDateString({ strict: true })
  date: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
