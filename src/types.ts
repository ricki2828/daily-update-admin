// Account types
export interface Account {
  id: string;
  name: string;
  code: string;
  prompt_time: string;
  deadline_time: string;
  reminder_interval_minutes: number;
  max_reminders: number;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  team_leader_count: number;
  agent_count: number;
  metric_count: number;
}

export interface AccountCreate {
  name: string;
  code: string;
  prompt_time?: string;
  deadline_time?: string;
  reminder_interval_minutes?: number;
  max_reminders?: number;
  timezone?: string;
}

// Team Leader types
export interface TeamLeader {
  id: string;
  name: string;
  email: string;
  account_id: string;
  manager_id?: string;
  teams_user_id?: string;
  teams_conversation_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamLeaderCreate {
  name: string;
  email: string;
  account_id: string;
  manager_id?: string;
}

// Metric types
export interface MetricDefinition {
  id: string;
  account_id: string;
  name: string;
  key: string;
  data_type: 'integer' | 'decimal' | 'percentage' | 'text';
  is_required: boolean;
  display_order: number;
  emoji?: string;
  show_trend: boolean;
  created_at: string;
}

// Daily Update types
export interface DailyUpdate {
  id: string;
  account_id: string;
  team_leader_id: string;
  date: string;
  status: 'pending' | 'prompted' | 'submitted' | 'reminded' | 'escalated' | 'missed';
  prompted_at?: string;
  submitted_at?: string;
  notes?: string;
}

export interface MetricValue {
  id: string;
  metric_definition_id: string;
  metric_name: string;
  metric_key: string;
  emoji?: string;
  value_numeric?: number;
  value_text?: string;
  trend_percentage?: number;
}

export interface DailyUpdateDetail extends DailyUpdate {
  account: { id: string; name: string; code: string };
  team_leader: { id: string; name: string; email: string };
  metrics: MetricValue[];
  reminder_count: number;
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  email: string;
  employee_id?: string;
  account_id: string;
  team_leader_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentCreate {
  name: string;
  email: string;
  employee_id?: string;
  account_id: string;
  team_leader_id: string;
}

export interface AgentDetail extends Agent {
  account: { id: string; name: string; code: string };
  team_leader: { id: string; name: string; email: string };
}

// Dashboard types
export interface DashboardStats {
  date: string;
  total_expected: number;
  submitted: number;
  pending: number;
  missed: number;
  submission_rate: number;
}

export interface AccountDashboard {
  account_id: string;
  account_name: string;
  account_code: string;
  stats: DashboardStats;
  updates: DailyUpdateDetail[];
}

// Agent Report types
export interface MetricTotal {
  metric_key: string;
  metric_name: string;
  emoji?: string;
  total_value: number;
  agent_count: number;
}

export interface AggregatedMetrics {
  date: string;
  account_name: string;
  account_code: string;
  team_leader_name?: string;
  total_agents: number;
  metrics: MetricTotal[];
}

export interface AgentMetricValue {
  metric_key: string;
  metric_name: string;
  emoji?: string;
  value_numeric?: number;
  value_text?: string;
}

export interface AgentMetricSummary {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  employee_id?: string;
  metrics: AgentMetricValue[];
}

export interface AgentReport {
  aggregated: AggregatedMetrics;
  agents: AgentMetricSummary[];
}
