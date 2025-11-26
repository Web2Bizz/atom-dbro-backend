import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDurationSeconds: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = process.hrtime.bigint();

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    const method: string = request?.method || 'UNKNOWN';
    // Пытаемся взять «нормализованный» путь маршрута; если его нет — берём оригинальный URL
    const route: string =
      request?.route?.path ||
      request?.routerPath ||
      request?.originalUrl ||
      request?.url ||
      'unknown_route';

    return next.handle().pipe(
      finalize(() => {
        const end = process.hrtime.bigint();
        const diffNs = Number(end - now);
        const seconds = diffNs / 1e9;

        const statusCode: number = response?.statusCode || 0;

        this.httpRequestDurationSeconds
          .labels(method, route, String(statusCode))
          .observe(seconds);
      }),
    );
  }
}


