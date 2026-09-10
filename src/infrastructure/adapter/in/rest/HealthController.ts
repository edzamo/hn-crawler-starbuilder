import { Controller, Get } from '@nestjs/common';

/**
 * Cheap liveness/readiness target for the Kubernetes probes — no
 * network call to HN, no DB query, just "the process is up".
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
