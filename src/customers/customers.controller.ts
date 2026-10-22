import { Body, Controller, Get, Param, Post, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/api-key.guard';
import { RequestLogInterceptor } from '../request-log/request-log.interceptor';
import { CurrentEnvironment, EnvironmentWithOrg } from '../common/request-context';
import { CreateLinkDto, UpsertCustomerDto } from './customers.dto';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@UseInterceptors(RequestLogInterceptor)
@Controller('v1/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post('link')
  @ApiOperation({ summary: 'Create a one-time t.me link that connects this customer to your bot' })
  createLink(@CurrentEnvironment() environment: EnvironmentWithOrg, @Body() dto: CreateLinkDto) {
    return this.customers.createLink(environment, dto.externalId, dto.phone);
  }

  @Put(':externalId')
  @ApiOperation({ summary: 'Create or update a customer (phone enables linking by shared contact on live bots)' })
  async upsert(@CurrentEnvironment() environment: EnvironmentWithOrg, @Param('externalId') externalId: string, @Body() dto: UpsertCustomerDto) {
    return this.customers.toView(await this.customers.upsert(environment, externalId, dto.phone, dto.locale));
  }

  @Get(':externalId')
  @ApiOperation({ summary: 'Customer status. `reachable: false` means use your own fallback channel.' })
  get(@CurrentEnvironment() environment: EnvironmentWithOrg, @Param('externalId') externalId: string) {
    return this.customers.get(environment, externalId);
  }
}
