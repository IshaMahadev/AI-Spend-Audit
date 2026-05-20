export type ToolName = 
  | 'Cursor' 
  | 'GitHub Copilot' 
  | 'Claude' 
  | 'ChatGPT' 
  | 'Anthropic API direct' 
  | 'OpenAI API direct' 
  | 'Gemini' 
  | 'Windsurf';

export type Plan = string;

export type UseCase = 'coding' | 'writing' | 'data' | 'research' | 'mixed';

export interface ToolSubscription {
  id: string;
  toolName: ToolName;
  plan: Plan;
  spend: number;
  seats: number;
}

export interface UserInputData {
  email: string;
  teamSize: number;
  primaryUseCase: UseCase;
  subscriptions: ToolSubscription[];
}

export interface ToolAuditResult {
  subscription: ToolSubscription;
  recommendedAction: string;
  monthlySavings: number;
  reason: string;
}

export interface AuditReport {
  results: ToolAuditResult[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  summaryParagraph?: string;
  isOptimal: boolean;
}
