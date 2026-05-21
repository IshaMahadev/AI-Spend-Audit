export const CURRENT_PRICING = {
  cursor:  { pro: 35,  business: 50,  free: 0 },
  claude:  { free: 0,  pro: 25,       team: 35 },
  copilot: { individual: 10, business: 19, enterprise: 39 },
  chatgpt: { plus: 25, team: 35,      enterprise: 0 },
  openai:  { payg: 0 }, // pay-as-you-go — tracked for change detection
};
export type PricingSnapshot = typeof CURRENT_PRICING;
