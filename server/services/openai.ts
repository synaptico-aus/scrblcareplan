import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 second timeout for deployment environments
  maxRetries: 2 // Reduce retries for faster failure handling
});

export async function extractFactsFromTranscript(transcript: string, clientName: string) {
  try {
    // Add timeout wrapper for deployment environment
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OpenAI fact extraction timeout')), 45000)
    );
    
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-5",
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
      temperature: 0.1, // Lower temperature for faster, more consistent responses
    }),
    timeoutPromise
  ]);

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error("AI processing took too long. Please try with a shorter transcript.");
    }
    throw new Error("Failed to extract facts from transcript: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

export async function generateCarePlanHtml(transcript: string, clientName: string) {
  try {
    // Add timeout wrapper for deployment environment 
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OpenAI care plan generation timeout')), 45000)
    );
    
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an AI care-planning assistant for the Australian home care sector.

Your job: read a full assessment transcript between a care partner and a client/family, and generate a **Gold Standard draft Care Plan** aligned with:
- Aged Care Act (current)
- Support at Home Program (from November 1, 2025)
- Aged Care Quality Standards (1–8)
- Salveo "Gold Standard" headings and order
- Single Assessment System with Integrated Assessment Tool (IAT)
- Quarterly care plan review cycle (not annual)

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
   - Purpose of this Care Plan: To outline services and supports under the Support at Home Program (November 2025)
   - Preferred Language: 
   - Interpreter required?:
4. People involved in developing my care plan
5. Things to consider about my cultural, diversity, values and belief
6. My care worker, communication and service delivery preferences
   - Single Provider Model: Under Support at Home, one provider manages all care coordination
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
14. Budget and Service Classifications
    - Service Category: Clinical Care (100% government funded) / Independence Support / Everyday Living
    - Quarterly Budget Allocation
    - Classification Level (1-8 under Support at Home)
15. Care Plan Consent and Distribution
16. Prepared By (Name: __________ | Role: Care Partner, Date: Today | Review Date: Quarterly (every 3 months) | Signature: __________)
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

For Goals format exactly like this using SMARTA principles:
<p><strong>GOAL 1</strong> Goal: …</p>
<p>Abilities and considerations (risks): …</p>
<p>How will we do this? (Tasks): …</p>
<p>Who is responsible?: When will it be done?: How much will it cost?: …</p>
<p>Service Category: Clinical Care / Independence Support / Everyday Living</p>

## SMARTA Goal-Setting Principles (CRITICAL for Support at Home compliance)
All goals MUST follow SMARTA framework:
- **SPECIFIC**: Use client's own language, be precise about who/what/where/when/why
- **MEASURABLE**: Include trackable metrics so client can monitor progress  
- **ACHIEVABLE**: Balance challenge with realistic expectations based on client capacity
- **RELEVANT**: Must align with client's interests, needs and values - avoid generic goals
- **TIME-LIMITED**: Set clear timeframes tied to client's ability (typically 3-month quarterly cycles)
- **AGREED**: Goals must be co-designed with client and include their verbal commitment

## SALVEO HOMECARE SERVICE ALIGNMENT (MANDATORY)
Every goal MUST specify which Salveo HomeCare service will be used and include pricing:

**Care and Support Services:**
- Domestic Assistance (cleaning, linen, laundry): $85/hour
- Personal Care (shower, toileting): $85/hour (day), $95/hour (night)
- Social Support: $85/hour (day) + $1.40/km for transport
- Transport: $85/hour (day) + $1.40/km
- Respite Care: $85/hour (day), $95/hour (night)
- Light Home & Gardening Maintenance: $85/hour

**Health and Nursing Services:**
- Enrolled Nurse: $121/hour (day)
- Registered Nurse: $148.50/hour (day)
- Allied Health Therapist (Physio/OT): $180/hour

**Service Categories for Support at Home Program:**
- Clinical Care (100% government funded)
- Independence Support 
- Everyday Living

Examples:
❌ Generic: "I want to be healthy"
✅ SMARTA + Salveo: "I will receive Allied Health Therapy from Salveo HomeCare for 1 hour fortnightly ($180/hour, $360/month) to improve my balance and mobility over the next 3 months"

❌ Vague: "I need help with cleaning"
✅ SMARTA + Salveo: "I will have Domestic Assistance from Salveo HomeCare for 2 hours weekly ($85/hour, $680/month) to maintain my home including cleaning, laundry and linen changes"

❌ No service specified: "I want to dress myself independently"
✅ SMARTA + Salveo: "I will work with Personal Care support from Salveo HomeCare (3 hours weekly, $85/hour, $1020/month) to dress myself independently within 6 weeks"

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
          content: `Generate a complete Gold Standard Care Plan HTML for this client following Support at Home Program requirements (November 2025).

Client Name: ${clientName}

Transcript:
${transcript}

CRITICAL: For the "My Goals" section, apply SMARTA principles AND Salveo HomeCare service alignment:

**SMARTA Requirements:**
1. **SPECIFIC**: Use the client's own words and language. Be precise about who, what, where, when, why
2. **MEASURABLE**: Include trackable metrics (time, frequency, distance, etc.) so progress can be monitored
3. **ACHIEVABLE**: Ensure goals balance challenge with realistic expectations based on the client's capacity
4. **RELEVANT**: Goals must align with the client's stated interests, needs and values - avoid generic health goals
5. **TIME-LIMITED**: Set clear timeframes appropriate to client's ability (typically 3-month quarterly cycles)
6. **AGREED**: Frame as collaborative goals developed together with the client

**MANDATORY Salveo Service Specifications:**
Every goal MUST specify:
- Which Salveo HomeCare service will be used (Personal Care, Domestic Assistance, Allied Health, etc.)
- Exact hourly rate ($85, $121, $148.50, $180/hour)
- Frequency (daily, weekly, fortnightly)
- Monthly cost calculation
- Service category (Clinical Care/Independence Support/Everyday Living)

Examples of properly formatted goals:
"I will receive Personal Care assistance from Salveo HomeCare support workers 3 times weekly (3 hours each, $85/hour, $1020/month) to shower and dress independently by March 2025 under the Independence Support category."

"I will have Domestic Assistance from Salveo HomeCare for 2 hours fortnightly ($85/hour, $340/month) to maintain my home including cleaning and laundry under the Everyday Living category."

Create comprehensive care plan sections based on the information provided in the transcript. Use first-person "I" statements and build narratives from the assessment discussion. For goals, extract what the client wants to achieve and frame using BOTH SMARTA principles AND specific Salveo service alignment. Only use the fallback sentence for sections where no relevant information was discussed.`
        }
      ],
      temperature: 0.1, // Lower temperature for faster responses
    }),
    timeoutPromise
  ]) as any;

    return response.choices[0].message.content || "";
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error("AI processing took too long. Please try with a shorter transcript.");
    }
    throw new Error("Failed to generate care plan: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}
