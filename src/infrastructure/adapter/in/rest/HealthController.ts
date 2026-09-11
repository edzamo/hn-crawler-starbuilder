import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/HealthResponse.dto';

/**
 * Cheap liveness/readiness target for the Kubernetes probes — no
 * network call to HN, no DB query, just "the process is up".
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness/readiness probe target' })
  @ApiOkResponse({ type: HealthResponseDto, description: 'the process is up' })
  check(): HealthResponseDto {
    return { status: 'ok' };
  }
}
