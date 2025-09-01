import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 second timeout
});

export async function extractFactsFromTranscript(transcript: string, clientName: string) {
  console.log("Starting fact extraction for client:", clientName);
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI care-planning assistant for the Australian home care sector. Extract key facts from assessment transcripts.

Rules:
- Extract facts that are clearly mentioned or strongly implied in the transcript
- Ignore IVR menus, timestamps, and administrative questions  
- Look for: language mentions, communication needs, medical practitioners, equipment, family members, risks, daily routines, mobility aids, mental health mentions
- Be thorough but accurate - extract information that's actually discussed

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
          content: `Extract key facts from this assessment transcript. Look for clearly stated information about language, family, medical details, equipment, and social needs.

Client Name: ${clientName}

Transcript:
${transcript}

Build comprehensive facts from the information discussed, not just isolated details.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("Fact extraction completed successfully");
    return result;
  } catch (error) {
    console.error("Fact extraction failed:", error);
    throw new Error("Failed to extract facts from transcript: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

export async function generateCarePlanHtml(transcript: string, clientName: string) {
  console.log("Starting care plan generation for client:", clientName);
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
- Extract and build narratives from information that's clearly discussed in the transcript
- Look for: client's language needs, family relationships, medical practitioners, equipment used, daily routines, social support, mental health concerns, mobility limitations, living arrangements
- Build meaningful first-person narratives using the information provided
- Use the fallback sentence only when a section has no relevant information in the transcript
- Focus on creating coherent care plan sections that reflect what was actually discussed`
        },
        {
          role: "user",
          content: `Generate a complete Gold Standard Care Plan HTML for this client. Extract and use the information that's clearly discussed in the transcript to build meaningful care plan sections.

Client Name: ${clientName}

Transcript:
${transcript}

Create comprehensive care plan sections based on the information provided in the transcript. Use first-person "I" statements and build narratives from the assessment discussion. Only use the fallback sentence for sections where no relevant information was discussed.`
        }
      ],
    });

    const result = response.choices[0].message.content || "";
    console.log("Care plan generation completed successfully");
    return result;
  } catch (error) {
    console.error("Care plan generation failed:", error);
    throw new Error("Failed to generate care plan: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}
