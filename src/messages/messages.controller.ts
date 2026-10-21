import { Body, Controller, Get, HttpCode, Param, ParseEnumPipe, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { MessageStatus } from '@prisma/client';
import { ApiKeyGuard } from '../common/api-key.guard';
import { CurrentEnvironment, EnvironmentWithOrg } from '../common/request-context';
import { SendMessageDto } from './messages.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('v1/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({
    summary: 'Send a message on Telegram',
    description:
      'Returns `status: "QUEUED"` when it will be sent, or `status: "UNDELIVERABLE"` with a `reason` ' +
      '(`not_linked`, `blocked`) when the customer cannot be reached on Telegram, so you can use your own fallback right away. ' +
      'Later outcomes arrive as webhook events.',
  })
  send(@CurrentEnvironment() environment: EnvironmentWithOrg, @Body() dto: SendMessageDto) {
    return this.messages.send(environment, dto);
  }

  @Get()
  @ApiQuery({ name: 'customer', required: false })
  @ApiQuery({ name: 'status', required: false, enum: MessageStatus })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @CurrentEnvironment() environment: EnvironmentWithOrg,
    @Query('customer') customer?: string,
    @Query('status', new ParseEnumPipe(MessageStatus, { optional: true })) status?: MessageStatus,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.messages.list(environment, { customer, status, cursor, limit });
  }

  @Get(':id')
  get(@CurrentEnvironment() environment: EnvironmentWithOrg, @Param('id') id: string) {
    return this.messages.get(environment, id);
  }
}
