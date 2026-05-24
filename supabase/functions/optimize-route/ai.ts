// AI-forklaring + AI-forslag via Lovable AI Gateway.
import type { EmployeeCtx, RoutePlan, Stop } from "./types.ts";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const minToHHmm = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
};

export type AISuggestion = {
  id: string;
  title: string;
  reason: string;
  estimated_savings_min?: number;
  estimated_savings_km?: number;
  // Apply-info: brug "swap_assignee" for at flytte stop fra én medarbejder til en anden
  action: {
    type: "swap_assignee" | "reorder";
    stop_id: string;
    from_employee_id?: string;
    to_employee_id?: string;
  };
};

export type AIResult = {
  summary: string;
  suggestions: AISuggestion[];
};

function buildPlanContext(employees: EmployeeCtx[], stops: Stop[], plan: RoutePlan): string {
  const lines: string[] = [];
  lines.push(`Total: ${plan.total_km.toFixed(1)} km, ${plan.total_minutes} min, ${plan.soft_window_violations} ønske-konflikter.`);
  if (plan.unassigned_stops.length > 0) {
    lines.push(`Utildelte stops: ${plan.unassigned_stops.length}`);
  }
  for (const emp of employees) {
    const route = plan.per_employee.get(emp.id) || [];
    if (route.length === 0) {
      lines.push(`- ${emp.name}: ingen stops`);
      continue;
    }
    const firstArr = minToHHmm(route[0].arrival_min);
    const lastDep = minToHHmm(route[route.length - 1].departure_min);
    const totalMin = route[route.length - 1].departure_min - route[0].arrival_min;
    lines.push(`- ${emp.name} (arbejder ${minToHHmm(emp.work_start_min)}-${minToHHmm(emp.work_end_min)}): ${route.length} stops, ${firstArr}-${lastDep} (${totalMin} min)`);
    for (const sched of route) {
      const stop = stops.find((s) => s.id === sched.stop_id);
      if (!stop) continue;
      const win = stop.preferred_start_min != null
        ? ` ønsket ${minToHHmm(stop.preferred_start_min)}${stop.preferred_end_min != null ? "-" + minToHHmm(stop.preferred_end_min) : ""}`
        : "";
      lines.push(`    * ${minToHHmm(sched.arrival_min)} ${stop.customer_name ?? "stop"}${win}`);
    }
  }
  return lines.join("\n");
}

/** Kald Lovable AI for resumé + forslag. Failer stille hvis nøglen mangler. */
export async function generateAIInsights(
  employees: EmployeeCtx[],
  stops: Stop[],
  plan: RoutePlan,
): Promise<AIResult | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.warn("LOVABLE_API_KEY mangler - springer AI over");
    return null;
  }
  if (employees.length === 0 || stops.length === 0) return null;

  const context = buildPlanContext(employees, stops, plan);
  const systemPrompt = `Du er en erfaren rute-planlægger på dansk. Du analyserer en optimeret arbejdsplan for et serviceselskab. Du skal:
1. Skrive et kort resumé (max 2 sætninger) på dansk: hvad er hovedpointen i planen.
2. Foreslå 0-3 KONKRETE forbedringer (kun hvis de er åbenlyse) — fx flyt et stop fra én medarbejder til en anden hvis det sparer kørsel/tid. Hver forslag skal have: title (kort), reason (hvorfor det er smart), action med stop_id, from_employee_id, to_employee_id.

Hvis planen er allerede god, så returnér tom suggestions-liste. Vær ærlig — ingen falske forslag.`;

  const userPrompt = `Plan-data:\n${context}\n\nMedarbejder-IDs: ${employees.map((e) => `${e.name}=${e.id}`).join(", ")}\nStop-IDs: ${stops.map((s) => `${s.customer_name ?? "stop"}=${s.id}`).join(", ")}`;

  try {
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Rute-analyse er struktureret tool-call — lite-modellen er billig nok.
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_plan",
              description: "Returnér resumé og forbedringsforslag",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "2-3 sætninger på dansk" },
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        reason: { type: "string" },
                        estimated_savings_min: { type: "number" },
                        estimated_savings_km: { type: "number" },
                        action: {
                          type: "object",
                          properties: {
                            type: { type: "string", enum: ["swap_assignee"] },
                            stop_id: { type: "string" },
                            from_employee_id: { type: "string" },
                            to_employee_id: { type: "string" },
                          },
                          required: ["type", "stop_id", "to_employee_id"],
                          additionalProperties: false,
                        },
                      },
                      required: ["title", "reason", "action"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_plan" } },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.warn("AI-kald fejlede:", resp.status, t);
      return null;
    }
    const json = await resp.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return null;
    const parsed = JSON.parse(toolCall.function.arguments);
    const suggestions: AISuggestion[] = (parsed.suggestions || []).map((s: any, i: number) => ({
      id: `s${Date.now()}_${i}`,
      title: s.title,
      reason: s.reason,
      estimated_savings_min: s.estimated_savings_min,
      estimated_savings_km: s.estimated_savings_km,
      action: s.action,
    }));
    return { summary: parsed.summary || "", suggestions };
  } catch (e) {
    console.warn("AI-kald exception:", e);
    return null;
  }
}
