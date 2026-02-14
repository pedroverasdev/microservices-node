import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { servicesConfig } from '../../config/gateway.config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly httpService: HttpService) {}

  async proxyRequest(
    serviceName: keyof typeof servicesConfig,
    method: string,
    path: string,
    data?: any,
    headers?: Record<string, string>,
    userInfo?: any,
  ) {
    const service = servicesConfig[serviceName];
    const url = `${service.url}${path}`;

    this.logger.log(`Proxying ${method} request to ${serviceName}: ${url}`);

    try {
      const enhancedHeaders = {
        ...headers,
        'x-user-id': userInfo?.userId,
        'x-user-email': userInfo?.email,
        'x-user-role': userInfo?.role,
      };

      const response = await firstValueFrom(
        this.httpService.request({
          method: method.toLowerCase() as any,
          url,
          data,
          headers: enhancedHeaders,
          timeout: service.timeout,
        }),
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Error proxying ${method} request to ${serviceName}: ${error}`,
      );
      throw error;
    }
  }

  async getServiceHealth(serviceName: keyof typeof servicesConfig) {
    try {
      const service = servicesConfig[serviceName];

      const response = await firstValueFrom(
        this.httpService.get(`${service.url}/health`, {
          timeout: 3000,
        }),
      );

      return { status: 'healthy', data: response.data };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}
