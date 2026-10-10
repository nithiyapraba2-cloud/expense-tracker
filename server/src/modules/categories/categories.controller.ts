import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard.js';
import { CurrentUserId } from '../../common/decorators/current-user.decorator.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { QueryCategoryDto } from './dto/query-category.dto.js';

@Controller('categories')
@UseGuards(AuthGuard) // every route needs a token
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentUserId() userId: string, @Query() query: QueryCategoryDto) {
    return this.categoriesService.findAll(userId, query.type);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.categoriesService.findOne(id, userId);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentUserId() userId: string) {
    return this.categoriesService.create(dto, userId);
  }

  @Post('bulk')
  createMany(
    @Body(new ParseArrayPipe({ items: CreateCategoryDto }))
    dtos: CreateCategoryDto[],
    @CurrentUserId() userId: string,
  ) {
    return this.categoriesService.createMany(dtos, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUserId() userId: string,
  ) {
    return this.categoriesService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.categoriesService.remove(id, userId);
  }
}
