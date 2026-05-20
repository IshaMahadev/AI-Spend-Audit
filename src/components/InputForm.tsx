"use client";

import { useState, useEffect } from "react";
import { ToolName, Plan, UseCase, ToolSubscription, UserInputData } from "@/lib/types";
import { Plus, Trash2, ArrowRight } from "lucide-react";

interface InputFormProps {
  onSubmit: (data: UserInputData) => void;
}

const TOOLS: Record<ToolName, Plan[]> = {
  "Cursor": ["Hobby", "Pro", "Business", "Enterprise"],
  "GitHub Copilot": ["Individual", "Business", "Enterprise"],
  "Claude": ["Free", "Pro", "Max", "Team", "Enterprise", "API direct"],
  "ChatGPT": ["Plus", "Team", "Enterprise", "API direct"],
  "Anthropic API direct": ["Pay-as-you-go", "Enterprise commitment"],
  "OpenAI API direct": ["Pay-as-you-go", "Enterprise commitment"],
  "Gemini": ["Pro", "Ultra", "API"],
  "Windsurf": ["Free", "Pro", "Team"]
};

export default function InputForm({ onSubmit }: InputFormProps) {
  const [email, setEmail] = useState<string>("");
  const [teamSize, setTeamSize] = useState<number>(1);
  const [primaryUseCase, setPrimaryUseCase] = useState<UseCase>("coding");
  const [subscriptions, setSubscriptions] = useState<ToolSubscription[]>([]);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("credex-audit-state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If saved state has no email it's stale from before Round 2 — wipe it
        if (!parsed.email) {
          localStorage.removeItem("credex-audit-state");
          setSubscriptions([{ id: Date.now().toString(), toolName: "Cursor", plan: "Pro", spend: 20, seats: 1 }]);
          return;
        }
        setEmail(parsed.email || "");
        setTeamSize(parsed.teamSize || 1);
        setPrimaryUseCase(parsed.primaryUseCase || "coding");
        setSubscriptions(parsed.subscriptions || []);
      } catch (e) {
        console.error("Failed to parse saved state");
        localStorage.removeItem("credex-audit-state");
        setSubscriptions([{ id: Date.now().toString(), toolName: "Cursor", plan: "Pro", spend: 20, seats: 1 }]);
      }
    } else {
      // Add a default subscription row
      setSubscriptions([{ id: Date.now().toString(), toolName: "Cursor", plan: "Pro", spend: 20, seats: 1 }]);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem("credex-audit-state", JSON.stringify({ email, teamSize, primaryUseCase, subscriptions }));
  }, [email, teamSize, primaryUseCase, subscriptions]);

  const addTool = () => {
    setSubscriptions([...subscriptions, {
      id: Date.now().toString(),
      toolName: "ChatGPT",
      plan: "Plus",
      spend: 20,
      seats: 1
    }]);
  };

  const removeTool = (id: string) => {
    setSubscriptions(subscriptions.filter(s => s.id !== id));
  };

  const updateSub = (id: string, field: keyof ToolSubscription, value: any) => {
    setSubscriptions(subscriptions.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      // auto-adjust plan if tool changed
      if (field === 'toolName') {
        updated.plan = TOOLS[value as ToolName][0];
      }
      return updated;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, teamSize, primaryUseCase, subscriptions });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-3xl mx-auto">
      <div className="brutalist-card p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">YOUR ORGANIZATION</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2 md:col-span-2">
              <label htmlFor="email-address" className="text-xs uppercase tracking-wider text-muted-foreground">Work Email</label>
              <input
                id="email-address"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="brutalist-input text-lg"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label htmlFor="team-size" className="text-xs uppercase tracking-wider text-muted-foreground">Team Size</label>
              <input
                id="team-size"
                type="number"
                min="1"
                value={teamSize}
                onChange={e => setTeamSize(parseInt(e.target.value) || 1)}
                className="brutalist-input text-lg"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label htmlFor="primary-use-case" className="text-xs uppercase tracking-wider text-muted-foreground">Primary Use Case</label>
              <select
                id="primary-use-case"
                value={primaryUseCase}
                onChange={e => setPrimaryUseCase(e.target.value as UseCase)}
                className="brutalist-input text-lg appearance-none"
              >
                <option value="coding">Software Engineering / Coding</option>
                <option value="writing">Content / Copywriting</option>
                <option value="data">Data Analysis</option>
                <option value="research">Research / Academic</option>
                <option value="mixed">Mixed Usage</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-2xl font-bold">AI SUBSCRIPTIONS</h2>
        </div>

        {subscriptions.map((sub, index) => (
          <div key={sub.id} className="brutalist-card p-4 flex flex-col md:flex-row gap-4 items-start md:items-end group">
            <div className="w-full md:w-1/3 flex flex-col space-y-2">
              <label htmlFor={`tool-${sub.id}`} className="text-[10px] uppercase tracking-widest text-muted-foreground">Tool</label>
              <select
                id={`tool-${sub.id}`}
                value={sub.toolName}
                onChange={e => updateSub(sub.id, 'toolName', e.target.value)}
                className="brutalist-input text-sm w-full"
              >
                {Object.keys(TOOLS).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="w-full md:w-1/4 flex flex-col space-y-2">
              <label htmlFor={`plan-${sub.id}`} className="text-[10px] uppercase tracking-widest text-muted-foreground">Plan</label>
              <select
                id={`plan-${sub.id}`}
                value={sub.plan}
                onChange={e => updateSub(sub.id, 'plan', e.target.value)}
                className="brutalist-input text-sm w-full"
              >
                {TOOLS[sub.toolName].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="w-1/2 md:w-1/6 flex flex-col space-y-2">
              <label htmlFor={`seats-${sub.id}`} className="text-[10px] uppercase tracking-widest text-muted-foreground">Seats</label>
              <input
                id={`seats-${sub.id}`}
                type="number" min="1"
                value={sub.seats}
                onChange={e => updateSub(sub.id, 'seats', parseInt(e.target.value) || 1)}
                className="brutalist-input text-sm w-full"
              />
            </div>
            <div className="w-1/2 md:w-1/6 flex flex-col space-y-2">
              <label htmlFor={`spend-${sub.id}`} className="text-[10px] uppercase tracking-widest text-muted-foreground">Spend/mo ($)</label>
              <input
                id={`spend-${sub.id}`}
                type="number" min="0" step="1"
                value={sub.spend}
                onChange={e => updateSub(sub.id, 'spend', parseFloat(e.target.value) || 0)}
                className="brutalist-input text-sm w-full"
              />
            </div>
            <button
              type="button"
              aria-label={`Remove ${sub.toolName} subscription`}
              onClick={() => removeTool(sub.id)}
              className="p-2 border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors h-[42px] w-[42px] flex items-center justify-center shrink-0"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addTool}
          className="w-full py-4 border border-dashed border-muted-foreground text-muted-foreground hover:border-accent hover:text-accent flex items-center justify-center gap-2 uppercase tracking-widest text-sm font-bold transition-all"
        >
          <Plus size={16} /> Add Subscription
        </button>
      </div>

      <div className="pt-8">
        <button type="submit" className="brutalist-button w-full text-xl py-6 flex items-center justify-center gap-4">
          RUN AUDIT <ArrowRight />
        </button>
      </div>
    </form>
  );
}
