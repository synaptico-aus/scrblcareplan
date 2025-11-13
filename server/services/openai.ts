import OpenAI from "openai";
import { storage } from "../storage";

// Validate API key on startup
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 300000, // 5 minutes timeout for long care plan generation
  maxRetries: 3,
  dangerouslyAllowBrowser: false
});

// Utility function to check transcript length and estimate tokens
function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// Enhanced function to chunk transcript intelligently for 80-minute transcripts
function chunkTranscript(transcript: string, maxTokens: number = 120000): string[] {
  const estimatedTokens = estimateTokenCount(transcript);
  
  if (estimatedTokens <= maxTokens) {
    return [transcript];
  }
  
  // Preprocess transcript to remove timestamps and clean up
  const cleanedTranscript = preprocessTranscript(transcript);
  
  // Use intelligent chunking for very long transcripts
  const chunks: string[] = [];
  const maxChunkSize = Math.floor(maxTokens * 4 * 0.75); // 75% of max for safety margin
  const overlapSize = Math.floor(maxChunkSize * 0.15); // 15% overlap for better context
  
  let start = 0;
  while (start < cleanedTranscript.length) {
    const end = Math.min(start + maxChunkSize, cleanedTranscript.length);
    
    // Try to break at natural conversation boundaries
    let chunkEnd = end;
    if (end < cleanedTranscript.length) {
      // Look for speaker changes first (common in assessment transcripts)
      const speakerBreak = findSpeakerBreak(cleanedTranscript, start + maxChunkSize * 0.3, end);
      if (speakerBreak > 0) {
        chunkEnd = speakerBreak;
      } else {
        // Fall back to paragraph or sentence boundaries
        const paragraphBreak = cleanedTranscript.lastIndexOf('\n\n', end);
        const sentenceBreak = cleanedTranscript.lastIndexOf('.', end);
        
        if (paragraphBreak > start + maxChunkSize * 0.5) {
          chunkEnd = paragraphBreak + 2;
        } else if (sentenceBreak > start + maxChunkSize * 0.5) {
          chunkEnd = sentenceBreak + 1;
        }
      }
    }
    
    const chunk = cleanedTranscript.slice(start, chunkEnd).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    start = chunkEnd - overlapSize;
  }
  
  return chunks;
}

// Preprocess transcript to remove timestamps and clean up for better processing
function preprocessTranscript(transcript: string): string {
  let cleaned = transcript
    // Remove timestamps (various formats)
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?\b/gi, '')
    .replace(/\[\d{2}:\d{2}(:\d{2})?\]/g, '')
    // Remove call system artifacts
    .replace(/\b(this call is being recorded|recording started|recording ended)\b/gi, '')
    .replace(/\b(press \d+ for|to speak to|please hold|connecting)\b/gi, '')
    // Clean up multiple spaces and newlines
    .replace(/\s{3,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    // Remove empty lines
    .replace(/^\s*$/gm, '')
    .trim();
    
  return cleaned;
}

// Find speaker change boundaries for better chunking
function findSpeakerBreak(text: string, minPos: number, maxPos: number): number {
  // Look for common speaker patterns in assessment transcripts
  const speakerPatterns = [
    /\n(Care Partner|Assessor|Interviewer|Worker):/gi,
    /\n(Client|Patient|Resident):/gi,
    /\n(Family Member|Daughter|Son|Spouse):/gi,
    /\n[A-Z][a-z]+:\s/g, // Generic "Name: " pattern
    /\n\n[A-Z]/g // New paragraph with capital letter
  ];
  
  for (const pattern of speakerPatterns) {
    const matches = [...text.slice(minPos, maxPos).matchAll(pattern)];
    if (matches.length > 0) {
      // Return position of first match after minPos
      return minPos + matches[0].index! + matches[0][0].length;
    }
  }
  
  return -1; // No speaker break found
}

export async function extractFactsFromTranscript(transcript: string, clientName: string, progressCallback?: (progress: number, stage: string) => void) {
  const startTime = Date.now();
  
  progressCallback?.(5, 'Analyzing transcript structure');
  
  try {
    // Check if transcript is too long and needs chunking
    progressCallback?.(10, 'Preparing transcript for processing');
    const chunks = chunkTranscript(transcript, 120000); // GPT-5 context limit
    
    if (chunks.length > 1) {
      // Process chunks and merge results with progress tracking
      const allFacts = [];
      for (let i = 0; i < chunks.length; i++) {
        try {
          // Report progress for each chunk
          const chunkProgress = 15 + (i / chunks.length) * 70; // 15% to 85% range
          progressCallback?.(chunkProgress, `Extracting facts from chunk ${i + 1}/${chunks.length}`);
          
          const chunkFacts = await extractFactsFromChunk(chunks[i], clientName, i + 1, chunks.length);
          allFacts.push(chunkFacts);
        } catch (error) {
          console.error(`Error processing chunk ${i + 1}/${chunks.length}:`, error);
          // Continue with other chunks - don't fail entire extraction for one chunk
          allFacts.push({
            clientDetails: { name: clientName, language: null, interpreterRequired: null },
            medical: { gp: null, pharmacy: null, equipment: [], medications: null, allergies: null },
            support: { primaryContact: null, secondaryContact: null, livingArrangement: null },
            risks: [],
            preferences: { workerPreferences: null, serviceDeliveryPreferences: null, culturalConsiderations: null }
          });
        }
      }
      
      // Merge all facts from chunks with enhanced deduplication
      progressCallback?.(90, 'Merging and deduplicating extracted facts');
      const mergedFacts = mergeFacts(allFacts);
      progressCallback?.(100, 'Fact extraction complete');
      return mergedFacts;
    }
    
    // Process single transcript
    const response = await openai.chat.completions.create({
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
    }, {
      timeout: 180000, // 3 minutes for fact extraction
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    progressCallback?.(100, 'Fact extraction complete');
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Fact extraction failed after ${duration}ms:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`Fact extraction timed out after ${Math.floor(duration/1000)} seconds. This may be due to a very long transcript or API issues.`);
      } else if (error.message.includes('rate_limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a few moments.');
      } else if (error.message.includes('insufficient_quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your API usage and billing.');
      }
    }
    
    throw new Error("Failed to extract facts from transcript: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

// Helper function to extract facts from a single chunk
async function extractFactsFromChunk(chunk: string, clientName: string, chunkNum: number, totalChunks: number) {
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content: `You are an AI care-planning assistant for the Australian home care sector. Extract key facts from assessment transcripts.

This is chunk ${chunkNum} of ${totalChunks} from a longer transcript.

Rules:
- Extract facts that are clearly mentioned or strongly implied in this chunk
- Ignore IVR menus, timestamps, and administrative questions  
- Look for: language mentions, communication needs, medical practitioners, equipment, family members, risks, daily routines, mobility aids, mental health mentions
- Be thorough but accurate - extract information that's actually discussed
- If this is a partial chunk, focus on complete information rather than fragments

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
        content: `Extract key facts from this assessment transcript chunk (${chunkNum}/${totalChunks}). Look for clearly stated information about language, family, medical details, equipment, and social needs.

Client Name: ${clientName}

Transcript Chunk:
${chunk}

Build comprehensive facts from the information discussed in this chunk.`
      }
    ],
    response_format: { type: "json_object" },
  }, {
    timeout: 120000, // 2 minutes for chunk processing
  });
  
  return JSON.parse(response.choices[0].message.content || "{}");
}

// Enhanced helper function to merge facts from multiple chunks with better deduplication
function mergeFacts(factsList: any[]): any {
  
  const merged = {
    clientDetails: { name: null, language: null, interpreterRequired: null },
    medical: { gp: null, pharmacy: null, equipment: [] as string[], medications: null, allergies: null },
    support: { primaryContact: null, secondaryContact: null, livingArrangement: null },
    risks: [] as any[],
    preferences: { workerPreferences: null, serviceDeliveryPreferences: null, culturalConsiderations: null }
  };
  
  // Track confidence scores for better merging decisions
  const confidenceScores = {
    clientDetails: {} as any,
    medical: {} as any,
    support: {} as any
  };
  
  factsList.forEach((facts, chunkIndex) => {
    if (!facts) return;
    
    // Merge client details with preference for more complete information
    if (facts.clientDetails) {
      if (!merged.clientDetails.name && facts.clientDetails.name) {
        merged.clientDetails.name = facts.clientDetails.name;
      }
      
      // Language info - prefer specific language over generic "English"
      if (facts.clientDetails.language) {
        if (!merged.clientDetails.language || 
            (merged.clientDetails.language.toLowerCase() === 'english' && 
             facts.clientDetails.language.toLowerCase() !== 'english')) {
          merged.clientDetails.language = facts.clientDetails.language;
        }
      }
      
      // Interpreter requirement - prefer explicit true over null
      if (facts.clientDetails.interpreterRequired !== null) {
        merged.clientDetails.interpreterRequired = merged.clientDetails.interpreterRequired ?? facts.clientDetails.interpreterRequired;
      }
    }
    
    // Enhanced medical info merging
    if (facts.medical) {
      // Prefer more specific/complete information
      merged.medical.gp = selectBestValue(merged.medical.gp, facts.medical.gp);
      merged.medical.pharmacy = selectBestValue(merged.medical.pharmacy, facts.medical.pharmacy);
      merged.medical.medications = selectBestValue(merged.medical.medications, facts.medical.medications);
      merged.medical.allergies = selectBestValue(merged.medical.allergies, facts.medical.allergies);
      
      // Smart equipment merging with deduplication and normalization
      if (facts.medical.equipment && Array.isArray(facts.medical.equipment)) {
        facts.medical.equipment.forEach((item: string) => {
          const normalizedItem = normalizeEquipmentName(item);
          const existingItem = merged.medical.equipment.find(existing => 
            normalizeEquipmentName(existing) === normalizedItem
          );
          
          if (!existingItem) {
            merged.medical.equipment.push(item);
          }
        });
      }
    }
    
    // Enhanced support info merging
    if (facts.support) {
      merged.support.primaryContact = selectBestValue(merged.support.primaryContact, facts.support.primaryContact);
      merged.support.secondaryContact = selectBestValue(merged.support.secondaryContact, facts.support.secondaryContact);
      merged.support.livingArrangement = selectBestValue(merged.support.livingArrangement, facts.support.livingArrangement);
    }
    
    // Enhanced risk merging with deduplication by similarity
    if (facts.risks && Array.isArray(facts.risks)) {
      facts.risks.forEach((risk: any) => {
        if (!risk || !risk.type || !risk.description) return;
        
        const similarRisk = merged.risks.find((r: any) => 
          areSimilarRisks(r, risk)
        );
        
        if (!similarRisk) {
          merged.risks.push({
            ...risk,
            source: `chunk_${chunkIndex + 1}` // Track source for debugging
          });
        } else {
          // Merge severity (take highest)
          if (risk.severity && getSeverityScore(risk.severity) > getSeverityScore(similarRisk.severity)) {
            similarRisk.severity = risk.severity;
          }
        }
      });
    }
    
    // Enhanced preferences merging
    if (facts.preferences) {
      merged.preferences.workerPreferences = selectBestValue(merged.preferences.workerPreferences, facts.preferences.workerPreferences);
      merged.preferences.serviceDeliveryPreferences = selectBestValue(merged.preferences.serviceDeliveryPreferences, facts.preferences.serviceDeliveryPreferences);
      merged.preferences.culturalConsiderations = selectBestValue(merged.preferences.culturalConsiderations, facts.preferences.culturalConsiderations);
    }
  });
  
  return merged;
}

// Helper function to select the best value between two options
function selectBestValue(existing: string | null, newValue: string | null): string | null {
  if (!existing) return newValue;
  if (!newValue) return existing;
  
  // Prefer longer, more descriptive values
  if (newValue.length > existing.length * 1.5) {
    return newValue;
  }
  
  return existing;
}

// Normalize equipment names for better deduplication
function normalizeEquipmentName(name: string): string {
  return name.toLowerCase()
    .replace(/\b(walking|mobility)\s+(frame|aid)\b/g, 'walker')
    .replace(/\b(wheel\s*chair|wheelchair)\b/g, 'wheelchair')
    .replace(/\b(shower\s*chair|bath\s*chair)\b/g, 'shower chair')
    .replace(/\b(toilet\s*seat|raised\s*seat)\b/g, 'toilet seat')
    .trim();
}

// Check if two risks are similar (for deduplication)
function areSimilarRisks(risk1: any, risk2: any): boolean {
  if (!risk1 || !risk2) return false;
  
  const type1 = risk1.type?.toLowerCase() || '';
  const type2 = risk2.type?.toLowerCase() || '';
  const desc1 = risk1.description?.toLowerCase() || '';
  const desc2 = risk2.description?.toLowerCase() || '';
  
  // Same type
  if (type1 === type2) return true;
  
  // Similar descriptions (basic similarity check)
  const commonWords = desc1.split(' ').filter(word => 
    word.length > 3 && desc2.includes(word)
  );
  
  return commonWords.length >= 2;
}

// Get numeric severity score for comparison
function getSeverityScore(severity: string | null): number {
  if (!severity) return 0;
  const sev = severity.toLowerCase();
  if (sev.includes('high')) return 3;
  if (sev.includes('medium')) return 2;
  if (sev.includes('low')) return 1;
  return 0;
}

export async function generateCarePlanHtml(transcript: string, clientName: string, organizationId: string, progressCallback?: (progress: number, stage: string) => void) {
  const startTime = Date.now();
  
  // Fetch service rates for this organization with fallback
  let serviceRatesText = "";
  let serviceRatesJson: Array<{service: string, hourlyRate: number, category: string}> = [];
  try {
    const serviceRates = await storage.getServiceRates(organizationId);
    
    // Build JSON array of service rates for easier AI parsing
    serviceRates.forEach(rate => {
      if (rate.hourlyRate) {
        serviceRatesJson.push({
          service: rate.serviceName,
          hourlyRate: parseFloat(rate.hourlyRate),
          category: rate.category
        });
      }
    });
    
    // Format service rates both as text and JSON for the prompt
    if (serviceRatesJson.length > 0) {
      // Text format (human-readable)
      const groupedRates: Record<string, Array<{name: string, rate: string}>> = {};
      serviceRates.forEach(rate => {
        if (!groupedRates[rate.category]) {
          groupedRates[rate.category] = [];
        }
        if (rate.hourlyRate) {
          groupedRates[rate.category].push({
            name: rate.serviceName,
            rate: `$${rate.hourlyRate}/hour`
          });
        }
      });
      
      for (const [category, rates] of Object.entries(groupedRates)) {
        serviceRatesText += `\n**${category}:**\n`;
        rates.forEach(rate => {
          serviceRatesText += `- ${rate.name}: ${rate.rate}\n`;
        });
      }
      
      // Add JSON format for structured parsing
      serviceRatesText += `\n**JSON FORMAT (for exact matching):**\n\`\`\`json\n${JSON.stringify(serviceRatesJson, null, 2)}\n\`\`\`\n`;
    } else {
      // Fallback to a generic message if no rates are configured
      serviceRatesText = "\n(Service rates not configured - please contact your administrator to set up pricing)\n";
    }
  } catch (error) {
    console.error("Error fetching service rates, using fallback:", error);
    // Fallback to generic message if storage fails
    serviceRatesText = "\n(Service rates temporarily unavailable - using standard provider pricing)\n";
  }
  
  try {
    // For care plan generation, we'll use a different strategy for long transcripts
    // Instead of chunking, we'll summarize very long transcripts first
    progressCallback?.(5, 'Analyzing transcript for care plan generation');
    let processedTranscript = transcript;
    
    const estimatedTokens = estimateTokenCount(transcript);
    if (estimatedTokens > 120000) {
      // For extremely long transcripts (80+ minutes), use multi-pass summarization
      progressCallback?.(20, 'Creating comprehensive summary of long transcript');
      if (estimatedTokens > 200000) {
        processedTranscript = await multiPassSummarize(transcript, clientName);
      } else {
        processedTranscript = await summarizeTranscript(transcript, clientName);
      }
      progressCallback?.(40, 'Transcript summarization complete');
    }
    
    progressCallback?.(50, 'Generating Gold Standard Care Plan with AI');
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an AI care-planning assistant for the Australian home care sector.

Your job: read a full assessment transcript between a care partner and a client/family, and generate a **Gold Standard draft Care Plan** aligned with:
- Aged Care Act (current)
- Support at Home Program (from November 1, 2025)
- Aged Care Quality Standards (1–8)
- Your provider's "Gold Standard" headings and order
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

For Goals format EXACTLY like this using SMARTA principles:
<p><strong>GOAL 1</strong> Goal: …</p>
<p>Abilities and considerations (risks): …</p>
<p>How will we do this? (Tasks): …</p>
<p>Who is responsible?: … When will it be done?: … How much will it cost?: [Service Name] at $X/hour ($Y/month)</p>
<p>Service Category: Clinical Care / Independence Support / Everyday Living</p>

CRITICAL PRICING FORMAT REQUIREMENT:
The "How much will it cost?" line MUST include the EXACT format: "$X/hour ($Y/month)" where:
- $X is the hourly rate from the service rates list above
- $Y is the monthly cost (hourly rate × hours per week × 4.33 weeks)
- NEVER leave this blank or use narrative text - ALWAYS include the dollar amounts
- Example: "How much will it cost?: Personal Care at $85/hour ($1,102/month) for 3 hours weekly"

## SMARTA Goal-Setting Principles (CRITICAL for Support at Home compliance)
All goals MUST follow SMARTA framework:
- **SPECIFIC**: Use client's own language, be precise about who/what/where/when/why
- **MEASURABLE**: Include trackable metrics so client can monitor progress  
- **ACHIEVABLE**: Balance challenge with realistic expectations based on client capacity
- **RELEVANT**: Must align with client's interests, needs and values - avoid generic goals
- **TIME-LIMITED**: Set clear timeframes tied to client's ability (typically 3-month quarterly cycles)
- **AGREED**: Goals must be co-designed with client and include their verbal commitment

## PROVIDER SERVICE ALIGNMENT (MANDATORY)
Every goal MUST specify which of your provider's services will be used and include pricing:
${serviceRatesText}
**Service Categories for Support at Home Program:**
- Clinical Care (100% government funded)
- Independence Support 
- Everyday Living

Examples:
❌ Generic: "I want to be healthy"
✅ SMARTA + Provider: "I will receive Allied Health Therapy from your provider for 1 hour fortnightly ($180/hour, $360/month) to improve my balance and mobility over the next 3 months"

❌ Vague: "I need help with cleaning"
✅ SMARTA + Provider: "I will have Domestic Assistance from your provider for 2 hours weekly ($85/hour, $680/month) to maintain my home including cleaning, laundry and linen changes"

❌ No service specified: "I want to dress myself independently"
✅ SMARTA + Provider: "I will work with Personal Care support from your provider (3 hours weekly, $85/hour, $1020/month) to dress myself independently within 6 weeks"

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
${processedTranscript}

CRITICAL: For the "My Goals" section, apply SMARTA principles AND provider service alignment:

**SMARTA Requirements:**
1. **SPECIFIC**: Use the client's own words and language. Be precise about who, what, where, when, why
2. **MEASURABLE**: Include trackable metrics (time, frequency, distance, etc.) so progress can be monitored
3. **ACHIEVABLE**: Ensure goals balance challenge with realistic expectations based on the client's capacity
4. **RELEVANT**: Goals must align with the client's stated interests, needs and values - avoid generic health goals
5. **TIME-LIMITED**: Set clear timeframes appropriate to client's ability (typically 3-month quarterly cycles)
6. **AGREED**: Frame as collaborative goals developed together with the client

**MANDATORY Provider Service Specifications:**
Every goal MUST specify:
- Which of your provider's services will be used from the list below
- ONLY use the EXACT hourly rates from the service rates list provided above - DO NOT make up or guess rates
- Frequency (daily, weekly, fortnightly)
- Monthly cost calculation
- Service category (Clinical Care/Independence Support/Everyday Living)

CRITICAL: You MUST use ONLY the rates from the service rates list above. If a rate is not provided for a service (shows as blank), do NOT include pricing for that service in the goal.

Examples of properly formatted goals (using rates from the service list above):
"I will receive Personal Care assistance from your provider's support workers 3 times weekly (3 hours each, [use actual rate from list]/hour, [calculated total]/month) to shower and dress independently by March 2025 under the Independence Support category."

"I will have Domestic Assistance from your provider for 2 hours fortnightly ([use actual rate from list]/hour, [calculated total]/month) to maintain my home including cleaning and laundry under the Everyday Living category."

Create comprehensive care plan sections based on the information provided in the transcript. Use first-person "I" statements and build narratives from the assessment discussion. For goals, extract what the client wants to achieve and frame using BOTH SMARTA principles AND specific provider service alignment. Only use the fallback sentence for sections where no relevant information was discussed.`
        }
      ],
    }, {
      timeout: 300000, // 5 minutes for care plan generation
    });

    const result = response.choices[0].message.content || "";
    
    progressCallback?.(100, 'Care plan generation complete');
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Care plan generation failed after ${duration}ms:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`Care plan generation timed out after ${Math.floor(duration/1000)} seconds. This may be due to a very long transcript or API issues.`);
      } else if (error.message.includes('rate_limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a few moments.');
      } else if (error.message.includes('insufficient_quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your API usage and billing.');
      } else if (error.message.includes('context_length_exceeded')) {
        throw new Error('Transcript is too long for processing. Please try with a shorter transcript or contact support.');
      }
    }
    
    throw new Error("Failed to generate care plan: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

// Helper function to summarize very long transcripts
async function summarizeTranscript(transcript: string, clientName: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content: `You are an AI assistant helping to summarize assessment transcripts for care planning. Your job is to create a comprehensive summary that preserves all important details for care plan generation.

Create a structured summary that includes:
1. Client demographics and communication needs
2. Medical history, conditions, and medications
3. Current functional abilities and limitations
4. Family and social support networks
5. Living arrangements and environment
6. Risks and safety concerns
7. Goals and preferences expressed by client/family
8. Services currently received or needed
9. Key quotes or specific client statements

Preserve all specific details like names, addresses, medication names, equipment used, etc. The summary should be comprehensive enough to generate a complete care plan.

Maintain the narrative flow and preserve the conversational context where important.`
      },
      {
        role: "user",
        content: `Please create a comprehensive summary of this assessment transcript for ${clientName}. Preserve all important details needed for care plan generation:

${transcript}`
      }
    ],
  }, {
    timeout: 180000, // 3 minutes for summarization
  });
  
  return response.choices[0].message.content || transcript;
}

// Multi-pass summarization for extremely long transcripts (80+ minute assessments)
async function multiPassSummarize(transcript: string, clientName: string): Promise<string> {
  // First pass: Split into logical sections and summarize each
  const sections = splitIntoSections(transcript);
  
  const sectionSummaries = [];
  for (let i = 0; i < sections.length; i++) {
    
    const sectionSummary = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Summarize this section of an aged care assessment transcript, preserving all medically relevant details, client goals, family information, and care requirements. Be comprehensive but concise.`
        },
        {
          role: "user",
          content: `Summarize this section (${i + 1}/${sections.length}) of ${clientName}'s assessment:\n\n${sections[i]}`
        }
      ]
    }, { timeout: 120000 });
    
    sectionSummaries.push(sectionSummary.choices[0].message.content || '');
  }
  
  // Second pass: Combine section summaries into final comprehensive summary
  const combinedSummary = sectionSummaries.join('\n\n---\n\n');
  
  if (estimateTokenCount(combinedSummary) > 100000) {
    // Still too long, need final condensation
    const finalSummary = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Create a comprehensive but concise summary of this aged care assessment, preserving all critical information for care plan generation. Focus on: client demographics, medical conditions, functional abilities, family support, risks, goals, and preferences.`
        },
        {
          role: "user",
          content: `Create final summary for ${clientName}'s assessment:\n\n${combinedSummary}`
        }
      ]
    }, { timeout: 120000 });
    
    return finalSummary.choices[0].message.content || combinedSummary;
  }
  
  return combinedSummary;
}

// Split transcript into logical sections based on content patterns
function splitIntoSections(transcript: string): string[] {
  // Clean the transcript first
  const cleaned = preprocessTranscript(transcript);
  
  // Look for natural section breaks in assessment transcripts
  const sectionBreaks = [
    /\b(demographics?|personal\s+information)\b/gi,
    /\b(medical\s+history|health\s+conditions?)\b/gi,
    /\b(medications?|prescriptions?)\b/gi,
    /\b(family|relatives?|contacts?)\b/gi,
    /\b(daily\s+activities|functional\s+abilities?)\b/gi,
    /\b(goals?|objectives?|what.*want)\b/gi,
    /\b(risks?|safety|concerns?)\b/gi,
    /\b(services?|supports?|help)\b/gi
  ];
  
  const sections: string[] = [];
  const maxSectionSize = 30000; // ~7500 tokens
  
  let currentSection = '';
  const lines = cleaned.split('\n');
  
  for (const line of lines) {
    currentSection += line + '\n';
    
    // Check if we've hit a natural break and the section is large enough
    if (currentSection.length > maxSectionSize * 0.5) {
      const foundBreak = sectionBreaks.some(pattern => pattern.test(line));
      
      if (foundBreak || currentSection.length > maxSectionSize) {
        sections.push(currentSection.trim());
        currentSection = '';
      }
    }
  }
  
  // Add remaining content
  if (currentSection.trim()) {
    sections.push(currentSection.trim());
  }
  
  // Ensure no section is too small (merge with previous if needed)
  const mergedSections = [];
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].length < 5000 && mergedSections.length > 0) {
      mergedSections[mergedSections.length - 1] += '\n\n' + sections[i];
    } else {
      mergedSections.push(sections[i]);
    }
  }
  
  return mergedSections;
}
