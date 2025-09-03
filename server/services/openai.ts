import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

export async function extractFactsFromTranscript(transcript: string, clientName: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Extract key facts from Australian care assessment transcripts. Focus on essential information only.

Extract: client details, medical info, support network, risks, preferences.
Ignore: timestamps, administrative questions, IVR menus.

JSON format:
{
  "clientDetails": {"name": "string", "language": "string|null", "interpreterRequired": "boolean|null"},
  "medical": {"gp": "string|null", "pharmacy": "string|null", "equipment": ["array"], "medications": "string|null", "allergies": "string|null"},
  "support": {"primaryContact": "string|null", "secondaryContact": "string|null", "livingArrangement": "string|null"},
  "risks": [{"type": "string", "description": "string", "severity": "low|medium|high|null"}],
  "preferences": {"workerPreferences": "string|null", "serviceDeliveryPreferences": "string|null", "culturalConsiderations": "string|null"}
}`
        },
        {
          role: "user", 
          content: `Client: ${clientName}\n\nTranscript:\n${transcript.substring(0, 8000)}\n\nExtract facts from clearly mentioned information only.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    }, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseContent = response.choices[0].message.content || "{}";
    console.log(`AI Fact Extraction Response (${responseContent.length} chars):`, responseContent.substring(0, 500));
    
    const parsedFacts = JSON.parse(responseContent);
    
    // If empty response, provide minimal structure
    if (!parsedFacts || Object.keys(parsedFacts).length === 0) {
      console.log("Empty facts response, providing fallback structure");
      return {
        clientDetails: { name: clientName },
        medical: {},
        support: {},
        risks: [],
        preferences: {}
      };
    }
    
    return parsedFacts;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("Fact extraction timed out. Please try with a shorter transcript.");
    }
    throw new Error("Failed to extract facts from transcript: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

export async function generateCarePlanHtml(transcript: string, clientName: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
  
  try {
    // Chunk large transcripts to improve processing speed
    const maxTranscriptLength = 12000;
    const processedTranscript = transcript.length > maxTranscriptLength 
      ? transcript.substring(0, maxTranscriptLength) + "\n\n[Note: Transcript truncated for processing efficiency]"
      : transcript;
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Generate Australian Gold Standard Care Plans for Support at Home Program (Nov 2025).

RULES:
- First-person "I" statements only
- HTML output: <h1>, <h2>, <p>, <strong>, <hr>, <table>, <ul>, <li>
- If no info: "Not documented in this transcript; this section will be updated as further details are provided."
- Use exact client name provided

REQUIRED SECTIONS:
1. Care Plan (H1)
2. Care Alerts  
3. My Care Plan (Date, Names, Purpose, Language, Interpreter)
4. People involved in developing my care plan
5. Cultural, diversity, values and beliefs
6. Care worker preferences (Single Provider Model note)
7. Preferred Support People
8. Informal Supports
9. Important things about me (Family, Interests)
10. Medical Information (History, Medication, Mobility, GP/Pharmacy)
11. Risk Assessment (Vulnerable Person categories, Specific Risks)
12. Emergency Contacts
13. My Goals (SMARTA + Salveo services with pricing)
14. Budget/Service Classifications (Clinical Care/Independence/Everyday Living)
15. Care Plan Consent
16. Prepared By (Care Partner, Today, Quarterly reviews)
17. Standards Summary (1-8)
18. Dignity of Risk Table

GOALS FORMAT (Essential):
<p><strong>GOAL 1</strong> Goal: [Specific goal with Salveo service]</p>
<p>Service: [Service type] at $[rate]/hour, [frequency], $[monthly cost]</p>
<p>Category: Clinical Care/Independence Support/Everyday Living</p>

SALVEO RATES: Personal Care $85/hr, Domestic $85/hr, RN $148.50/hr, Allied Health $180/hr

Extract from transcript only. Build first-person narratives from discussed information.`
        },
        {
          role: "user",
          content: `Client: ${clientName}

Assessment Data:
${processedTranscript}

Generate complete HTML care plan. Focus on SMARTA goals with specific Salveo services and pricing. Use first-person voice throughout.`
        }
      ],
      max_completion_tokens: 4000,
    }, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseContent = response.choices[0].message.content || "";
    console.log(`AI Care Plan Response (${responseContent.length} chars):`, responseContent.substring(0, 300));
    
    // If empty response, provide fallback
    if (!responseContent || responseContent.trim().length === 0) {
      console.log("Empty care plan response, providing fallback");
      return `<h1>Care Plan</h1>
      <p>Care plan generation encountered an issue. Please try again with your assessment content.</p>
      <p>If this persists, try with a shorter transcript or contact support.</p>`;
    }
    
    return responseContent;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("Care plan generation timed out. Please try with a shorter assessment or contact support.");
    }
    throw new Error("Failed to generate care plan: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}
