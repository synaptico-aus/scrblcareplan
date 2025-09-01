import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export async function extractFactsFromTranscript(transcript: string, clientName: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an AI care-planning assistant for the Australian home care sector. Extract key facts from assessment transcripts.

Rules:
- Extract facts ONLY if clearly stated in the transcript
- Ignore IVR menus, timestamps, and administrative questions
- Focus on: language, interpreter needs, GP/pharmacy, equipment, services, risks, preferences
- Do not invent details

Respond with JSON in this exact format:
{
  "clientDetails": {
    "name": "string",
    "language": "string or null",
    "interpreterRequired": "boolean or null"
  },
  "medical": {
    "gp": "string or null",
    "pharmacy": "string or null", 
    "equipment": ["array of strings or empty"],
    "medications": "string or null",
    "allergies": "string or null"
  },
  "support": {
    "primaryContact": "string or null",
    "secondaryContact": "string or null",
    "livingArrangement": "string or null"
  },
  "risks": [
    {
      "type": "string",
      "description": "string",
      "severity": "low|medium|high or null"
    }
  ],
  "preferences": {
    "workerPreferences": "string or null",
    "serviceDeliveryPreferences": "string or null",
    "culturalConsiderations": "string or null"
  }
}`
        },
        {
          role: "user",
          content: `Client Name: ${clientName}\n\nTranscript:\n${transcript}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    throw new Error("Failed to extract facts from transcript: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

export async function generateCarePlanHtml(transcript: string, clientName: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an AI care-planning assistant for the Australian home care sector.

Your job: read a full assessment transcript between a care partner and a client/family, and generate a **Gold Standard draft Care Plan** aligned with:
- Aged Care Act (current)
- Support at Home Program (from July 2025)
- Aged Care Quality Standards (1–8)
- Salveo "Gold Standard" headings and order

## Non-negotiable rules
- Use **first-person "I" statements** in a clinical, plain-English, narrative style.
- **Do not invent** details. If a section is silent, output exactly: 
  "Not documented in this transcript; this section will be updated as further details are provided."
- Output **HTML only** (no Markdown). Use <h1>, <h2>, <h3>, <p>, <strong>, <hr>, <table>, <ul>, <li>. No images, no scripts.
- Keep headings **exactly** as specified. Bold section labels with <strong>; for goals, only bold **GOAL #**, not the rest of the line.
- Always use the user-provided clientName verbatim.
- Wrap each sentence/paragraph in <p>…</p>.
- Use <hr/> between major blocks.
- Use <strong> for section labels (e.g., <strong>Medical History:</strong>).

## Required output order (exact template format)
1. Care Plan (H1 title)
2. Care Alerts
3. My Care Plan
   - Date of this Care Plan: 
   - Preferred Name: 
   - Full Name: 
   - Purpose of this Care Plan: 
   - Preferred Language: 
   - Interpreter required?:
4. People involved in developing my care plan
5. Things to consider about my cultural, diversity, values and belief
6. My care worker, communication and service delivery preferences
7. My Preferred Support People
8. Informal Supports
9. Important things to know about me
   - Family Background and Life History
   - Interests
10. My Medical Information
    - Medical History
    - Medication
    - Mobility and Equipment
    - GP / Pharmacy
11. Risk Assessment
    - Vulnerable Person (CALD:, Living with disability (mobility):, Mental health (low mood/isolation risk):)
    - Specific Risks
12. Emergency Contacts & Instructions
13. My Goals (render each goal exactly as specified)
14. Budget
15. Care Plan Consent and Distribution
16. Prepared By (Name: __________ | Role: Care Partner, Date: Today | Review Date: in ~6 months | Signature: __________)
17. Transcript Summary – {Client Name} (map to Standards 1–8)
    - Standard 1 – Consumer dignity and choice
    - Standard 2 – Ongoing assessment and planning with consumers
    - Standard 3 – Personal care and clinical care
    - Standard 4 – Services and supports for daily living
    - Standard 5 – Organisation's service environment
    - Standards 6–8 – Feedback & complaints; Human resources; Organisational governance
18. Dignity of Risk Assessment (Narrative + Table)

For Dignity of Risk table use this exact format:
<table>
  <thead>
    <tr>
      <th>Risk identified</th>
      <th>Client's choice / decision</th>
      <th>Potential consequences</th>
      <th>Mitigation strategies</th>
      <th>Acknowledgement</th>
      <th>Date</th>
    </tr>
  </thead>
  <tbody>
    <!-- One or more rows; use transcript-only details. If none, include fallback sentence above table -->
  </tbody>
</table>

For Goals format exactly like this:
<p><strong>GOAL 1</strong> Goal: …</p>
<p>Abilities and considerations (risks): …</p>
<p>How will we do this? (Tasks): …</p>
<p>Who is responsible?: When will it be done?: How much will it cost?: …</p>

## Transcript handling
- Ignore IVR menus, timestamps, and administrative questions (e.g., "This call is recorded", "Can I have your name?")
- Extract facts only if clearly stated: language, interpreter, GP/pharmacy, equipment (wheelchair, walker, grab rails, shower chair, ramp, lifter, electric bed, lift recliner, personal alarm), services/frequency/times, risks (falls, pain with score, mental health, CALD), preferences (female worker, after 11am)
- Build narrative paragraphs by stitching adjacent relevant sentences; only light grammar fixes
- When unsure, prefer the fallback sentence
- No placeholders besides the fallback sentence
- No disclaimers beyond what's explicitly listed`
        },
        {
          role: "user",
          content: `Generate a complete Gold Standard Care Plan HTML for:

Client Name: ${clientName}

Transcript:
${transcript}

Output the full Care Plan HTML exactly in the required order and formatting rules.`
        }
      ],
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate care plan: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}
