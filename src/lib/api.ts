/**
 * API Client for V2Config
 */

const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  data: unknown;
  
  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export interface Tenant {
  id: string;
  name?: string;
  subscriptionCount: number;
  configuredModules: string[];
  tenantModules?: Record<string, ModuleConfig>;
  subscriptionModulesWithTenantOverride?: Record<string, ModuleConfig & { path: string }>;
}

export interface Subscription {
  id: string;
  name?: string;
  metadata?: Record<string, unknown>;
  configuredModules?: Record<string, ModuleConfig>;
}

export interface ModuleConfig {
  hasOverride: boolean;
  hasTenantOverride?: boolean;
  enabled?: string;
  description?: string;
}

export interface Module {
  name: string;
  path: string;
  scope: 'tenant' | 'subscription';
  description?: string;
  schema?: Record<string, unknown>;
}

export interface ModuleConfigData {
  composed: Record<string, unknown>;
  sources: {
    tenantOverride?: boolean;
    subscriptionOverride?: boolean;
  };
}

export interface Job {
  id: string;
  jobType: 'compose' | 'report';
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  results?: {
    tenantsProcessed?: number;
    validationErrors?: unknown[];
  };
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(data.detail || 'An error occurred', response.status, data);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error instanceof Error ? error.message : 'Network error', 0);
    }
  }

  // Tenants
  async listTenants(): Promise<{ tenants: Tenant[] }> {
    return this.request('/tenants');
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    return this.request(`/tenants/${tenantId}`);
  }

  async getTenantComposed(tenantId: string, validate = true): Promise<Record<string, unknown>> {
    return this.request(`/tenants/${tenantId}/composed?validate=${validate}`);
  }

  async createTenant(id: string, name?: string | null): Promise<Tenant> {
    return this.request('/tenants', {
      method: 'POST',
      body: JSON.stringify({ id, name }),
    });
  }

  async deleteTenant(tenantId: string): Promise<void> {
    return this.request(`/tenants/${tenantId}`, {
      method: 'DELETE',
    });
  }

  // Subscriptions
  async listSubscriptions(tenantId: string): Promise<{ subscriptions: Subscription[] }> {
    return this.request(`/tenants/${tenantId}/subscriptions`);
  }

  async getSubscription(tenantId: string, subscriptionId: string): Promise<Subscription> {
    return this.request(`/tenants/${tenantId}/subscriptions/${subscriptionId}`);
  }

  async createSubscription(tenantId: string, id: string, name?: string | null, metadata?: Record<string, unknown> | null): Promise<Subscription> {
    return this.request(`/tenants/${tenantId}/subscriptions`, {
      method: 'POST',
      body: JSON.stringify({ id, name, metadata }),
    });
  }

  async deleteSubscription(tenantId: string, subscriptionId: string): Promise<void> {
    return this.request(`/tenants/${tenantId}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    });
  }

  // Modules
  async listModules(): Promise<{ modules: Module[] }> {
    return this.request('/modules');
  }

  async getModule(modulePath: string): Promise<Module> {
    return this.request(`/modules/${modulePath}`);
  }

  async getModuleSchema(modulePath: string): Promise<Record<string, unknown>> {
    return this.request(`/modules/${modulePath}/schema`);
  }

  async getModuleDefault(modulePath: string): Promise<Record<string, unknown>> {
    return this.request(`/modules/${modulePath}/default`);
  }

  // Tenant Module Configuration
  async getTenantModuleConfig(tenantId: string, modulePath: string): Promise<ModuleConfigData> {
    return this.request(`/tenants/${tenantId}/modules/${modulePath}`);
  }

  async setTenantModuleConfig(tenantId: string, modulePath: string, config: Record<string, unknown>): Promise<void> {
    return this.request(`/tenants/${tenantId}/modules/${modulePath}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async deleteTenantModuleConfig(tenantId: string, modulePath: string): Promise<void> {
    return this.request(`/tenants/${tenantId}/modules/${modulePath}`, {
      method: 'DELETE',
    });
  }

  // Subscription Module Configuration
  async getSubscriptionModuleConfig(tenantId: string, subscriptionId: string, modulePath: string): Promise<ModuleConfigData> {
    return this.request(`/tenants/${tenantId}/subscriptions/${subscriptionId}/modules/${modulePath}`);
  }

  async setSubscriptionModuleConfig(tenantId: string, subscriptionId: string, modulePath: string, config: Record<string, unknown>): Promise<void> {
    return this.request(`/tenants/${tenantId}/subscriptions/${subscriptionId}/modules/${modulePath}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async deleteSubscriptionModuleConfig(tenantId: string, subscriptionId: string, modulePath: string): Promise<void> {
    return this.request(`/tenants/${tenantId}/subscriptions/${subscriptionId}/modules/${modulePath}`, {
      method: 'DELETE',
    });
  }

  // Jobs
  async listJobs(): Promise<{ jobs: Job[] }> {
    return this.request('/jobs');
  }

  async getJob(jobId: string): Promise<Job> {
    return this.request(`/jobs/${jobId}`);
  }

  async runComposeJob(tenantIds?: string[] | null, validateOnly = false): Promise<Job> {
    return this.request('/jobs/compose', {
      method: 'POST',
      body: JSON.stringify({ tenantIds, validateOnly }),
    });
  }

  async runReportJob(format = 'csv', onlyEnabled = false): Promise<Job> {
    return this.request('/jobs/report', {
      method: 'POST',
      body: JSON.stringify({ format, onlyEnabled }),
    });
  }
}

export const api = new ApiClient();
