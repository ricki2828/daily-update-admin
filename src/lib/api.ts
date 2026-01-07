import type { Account, AccountCreate, TeamLeader, TeamLeaderCreate, Agent, AgentCreate, AgentDetail, MetricDefinition, AccountDashboard, AgentReport } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://daily-update-api.azurewebsites.net';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  }

  async health(): Promise<{ status: string; version: string }> {
    return this.request('/health');
  }

  // Accounts
  async getAccounts(activeOnly = true): Promise<{ items: Account[]; total: number }> {
    return this.request(`/api/accounts?active_only=${activeOnly}`);
  }

  async getAccount(id: string): Promise<Account> {
    return this.request(`/api/accounts/${id}`);
  }

  async createAccount(data: AccountCreate): Promise<Account> {
    return this.request('/api/accounts', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAccount(id: string, data: Partial<AccountCreate>): Promise<Account> {
    return this.request(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteAccount(id: string): Promise<void> {
    return this.request(`/api/accounts/${id}`, { method: 'DELETE' });
  }

  // Team Leaders
  async getTeamLeaders(accountId?: string): Promise<TeamLeader[]> {
    const query = accountId ? `?account_id=${accountId}` : '';
    return this.request(`/api/team-leaders${query}`);
  }

  async createTeamLeader(data: TeamLeaderCreate): Promise<TeamLeader> {
    return this.request('/api/team-leaders', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteTeamLeader(id: string): Promise<void> {
    return this.request(`/api/team-leaders/${id}`, { method: 'DELETE' });
  }

  // Agents
  async getAgents(accountId?: string, teamLeaderId?: string): Promise<Agent[]> {
    const params = new URLSearchParams();
    if (accountId) params.set('account_id', accountId);
    if (teamLeaderId) params.set('team_leader_id', teamLeaderId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/agents${query}`);
  }

  async getAgent(id: string): Promise<AgentDetail> {
    return this.request(`/api/agents/${id}`);
  }

  async createAgent(data: AgentCreate): Promise<Agent> {
    return this.request('/api/agents', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAgent(id: string, data: Partial<AgentCreate>): Promise<Agent> {
    return this.request(`/api/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteAgent(id: string): Promise<void> {
    return this.request(`/api/agents/${id}`, { method: 'DELETE' });
  }

  // Metrics
  async getMetrics(accountId: string): Promise<MetricDefinition[]> {
    return this.request(`/api/metrics?account_id=${accountId}`);
  }

  async createDefaultMetrics(accountId: string): Promise<MetricDefinition[]> {
    return this.request(`/api/metrics/batch?account_id=${accountId}`, { method: 'POST' });
  }

  async createMetric(data: {
    account_id: string;
    name: string;
    key: string;
    data_type: 'integer' | 'decimal' | 'percentage' | 'text';
    emoji?: string;
    display_order?: number;
    is_required?: boolean;
    show_trend?: boolean;
  }): Promise<MetricDefinition> {
    return this.request('/api/metrics', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateMetric(id: string, data: Partial<{
    name: string;
    emoji: string;
    display_order: number;
    is_required: boolean;
    show_trend: boolean;
  }>): Promise<MetricDefinition> {
    return this.request(`/api/metrics/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteMetric(id: string): Promise<void> {
    return this.request(`/api/metrics/${id}`, { method: 'DELETE' });
  }

  // Dashboard
  async getDashboard(date?: string, accountId?: string): Promise<AccountDashboard[]> {
    const params = new URLSearchParams();
    if (date) params.set('target_date', date);
    if (accountId) params.set('account_id', accountId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/analytics/dashboard${query}`);
  }

  // Agent Report
  async getAgentReport(date?: string, accountId?: string, teamLeaderId?: string): Promise<AgentReport> {
    const params = new URLSearchParams();
    if (date) params.set('target_date', date);
    if (accountId) params.set('account_id', accountId);
    if (teamLeaderId) params.set('team_leader_id', teamLeaderId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/analytics/agent-report${query}`);
  }

  // Export URLs
  getExportUrl(type: 'daily' | 'weekly', format: 'excel' | 'csv', date?: string): string {
    const endpoint = type === 'daily'
      ? `/api/analytics/export/daily/${format}`
      : `/api/analytics/export/weekly/excel`;
    const query = date ? `?target_date=${date}` : '';
    return `${this.baseUrl}${endpoint}${query}`;
  }
}

export const api = new ApiClient(API_URL);
export default api;
