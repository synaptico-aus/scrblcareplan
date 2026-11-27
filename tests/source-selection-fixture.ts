import type OpenAI from "openai";
import { generateStructuredCarePlan as generate } from "../server/services/structuredCarePlan";
import { transcriptQuoteMatcher } from "../server/services/transcriptEvidence";

// Existing fixtures describe evidence as readable excerpts. Translate these
// at the fake-provider boundary to the new ID-only wire contract. Production
// does not have this compatibility adapter.
export const generateStructuredCarePlan: typeof generate = async (client, ...args) => {
  const create = client.chat.completions.create.bind(client.chat.completions);
  const proxy = { chat: { completions: { create: async (request: any) => {
    const payload = JSON.parse(request.messages[1].content);
    const passages = payload.sourcePassages;
    const mockRequest = passages ? {
      ...request, messages: request.messages.map((m: any, i: number) => i === 1
        ? { ...m, content: JSON.stringify({ ...payload, transcriptPart: passages.map((p: any) => p.text).join("\n") }) } : m),
    } : request;
    const response = await create(mockRequest) as any;
    if (!passages) return response;
    const reply = JSON.parse(response.choices[0].message.content);
    const ids = (quotes: string[]) => quotes.flatMap(quote => {
      for (let length = 1; length <= Math.min(8, passages.length); length++) {
        for (let start = 0; start + length <= passages.length; start++) {
          const window = passages.slice(start, start + length);
          if (transcriptQuoteMatcher(window.map((p: any) => p.text).join("\n"))(quote) !== null)
            return window.map((p: any) => p.id);
        }
      }
      return ["invalid-fixture-source"];
    });
    if (reply.evidence) for (const path of Object.keys(reply.evidence)) reply.evidence[path] = ids(reply.evidence[path]);
    for (const goal of reply.goals || []) if (goal.evidence) goal.evidence = ids(goal.evidence);
    return { ...response, choices: [{ ...response.choices[0], message: { ...response.choices[0].message, content: JSON.stringify(reply) } }] };
  } } } } as unknown as OpenAI;
  return generate(proxy, ...args);
};
