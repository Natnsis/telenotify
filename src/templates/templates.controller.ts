import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ApiKeyGuard } from '../common/api-key.guard';
import { OrgAccessGuard } from '../common/org-access.guard';
import { CurrentEnvironment, CurrentUser, EnvironmentWithOrg } from '../common/request-context';
import { SessionGuard } from '../common/session.guard';
import { RequestLogInterceptor } from '../request-log/request-log.interceptor';
import { CreateTemplateDto, PreviewTemplateDto, UpdateTemplateDto } from './templates.dto';
import { TemplatesService } from './templates.service';

@ApiExcludeController()
@UseGuards(SessionGuard, OrgAccessGuard)
@Controller('portal/orgs/:orgId/templates')
export class PortalTemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list(@Param('orgId') orgId: string) {
    return this.templates.list(orgId);
  }

  @Post()
  create(@Param('orgId') orgId: string, @CurrentUser() user: User, @Body() dto: CreateTemplateDto) {
    return this.templates.create(orgId, user, dto);
  }

  @Post('preview')
  @HttpCode(200)
  preview(@Body() dto: PreviewTemplateDto) {
    return this.templates.preview(dto.variants, dto.locale, dto.params);
  }

  @Patch(':templateId')
  update(@Param('orgId') orgId: string, @CurrentUser() user: User, @Param('templateId') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templates.update(orgId, user, id, dto);
  }

  @Delete(':templateId')
  @HttpCode(204)
  remove(@Param('orgId') orgId: string, @CurrentUser() user: User, @Param('templateId') id: string) {
    return this.templates.remove(orgId, user, id);
  }
}

@ApiTags('templates')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@UseInterceptors(RequestLogInterceptor)
@Controller('v1/templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List your message templates, their languages and placeholders' })
  list(@CurrentEnvironment() environment: EnvironmentWithOrg) {
    return this.templates.list(environment.orgId);
  }
}
