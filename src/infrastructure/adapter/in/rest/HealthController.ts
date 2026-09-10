import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Cheap liveness/readiness target for the Kubernetes probes — no
 * network call to HN, no DB query, just "the process is up".
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness/readiness probe target' })
  @ApiOkResponse({ description: '{ status: "ok" } when the process is up' })
  check() {
    return { status: 'ok' };
  }
}
