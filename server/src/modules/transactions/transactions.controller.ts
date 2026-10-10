import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard.js';
import { CurrentUserId } from '../../common/decorators/current-user.decorator.js';
import { TransactionsService } from './transactions.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { QueryTransactionDto } from './dto/query-transaction.dto.js';
import { SummaryQueryDto } from './dto/summary-query.dto.js';

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Must come BEFORE @Get(':id'), or "summary" is treated as an id
  @Get('summary')
  summary(@CurrentUserId() userId: string, @Query() query: SummaryQueryDto) {
    return this.transactionsService.summary(userId, query.month);
  }

  @Get()
  findAll(
    @CurrentUserId() userId: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionsService.findAll(userId, query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.transactionsService.findOne(id, userId);
  }

  @Post()
  create(@Body() dto: CreateTransactionDto, @CurrentUserId() userId: string) {
    return this.transactionsService.create(dto, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUserId() userId: string,
  ) {
    return this.transactionsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.transactionsService.remove(id, userId);
  }
}
