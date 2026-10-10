import { IsEnum, IsOptional } from 'class-validator';
import { CategoryType } from '../entities/category.entity.js';

export class QueryCategoryDto {
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;
}
