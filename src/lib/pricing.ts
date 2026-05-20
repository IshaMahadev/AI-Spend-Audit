export const CURRENT_PRICING = {
  cursor:  { pro: 25,  business: 40,  free: 0 },
  claude:  { free: 0,  pro: 20,       team: 30 },
  copilot: { individual: 10, business: 19, enterprise: 39 },
  chatgpt: { plus: 20, team: 30,      enterprise: 0 },
  openai:  { payg: 0 }, // pay-as-you-go — tracked for change detection
};
export type PricingSnapshot = typeof CURRENT_PRICING;
