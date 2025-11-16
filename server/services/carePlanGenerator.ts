import { ExtractedFacts } from "@shared/schema";

export function generateOfflineFactsExtraction(transcript: string, clientName: string): ExtractedFacts {
  const lowerTranscript = transcript.toLowerCase();
  
  // Basic keyword extraction for offline mode
  const facts: ExtractedFacts = {
    clientDetails: {
      name: clientName,
      language: undefined,
      interpreterRequired: undefined,
    },
    medical: {
      gp: undefined,
      pharmacy: undefined,
      equipment: [],
      medications: undefined,
      allergies: undefined,
    },
    support: {
      primaryContact: undefined,
      secondaryContact: undefined,
      livingArrangement: undefined,
    },
    risks: [],
    preferences: {
      workerPreferences: undefined,
      serviceDeliveryPreferences: undefined,
      culturalConsiderations: undefined,
    },
  };

  // Language detection
  if (lowerTranscript.includes('spanish') || lowerTranscript.includes('italiano') || lowerTranscript.includes('greek')) {
    const languageMatch = lowerTranscript.match(/(spanish|italiano|greek|mandarin|cantonese)/i);
    if (languageMatch) {
      facts.clientDetails.language = languageMatch[1];
      facts.clientDetails.interpreterRequired = true;
    }
  }

  // Equipment detection
  const equipment = [];
  if (lowerTranscript.includes('wheelchair')) equipment.push('Wheelchair');
  if (lowerTranscript.includes('walker')) equipment.push('Walker');
  if (lowerTranscript.includes('personal alarm')) equipment.push('Personal Alarm');
  if (lowerTranscript.includes('grab rails')) equipment.push('Grab Rails');
  if (lowerTranscript.includes('shower chair')) equipment.push('Shower Chair');
  if (lowerTranscript.includes('ramp')) equipment.push('Ramp');
  facts.medical.equipment = equipment;

  // GP detection
  const gpMatch = transcript.match(/dr\.?\s+([a-z]+)/i);
  if (gpMatch) {
    facts.medical.gp = `Dr. ${gpMatch[1]}`;
  }

  // Risk detection
  const risks = [];
  if (lowerTranscript.includes('depression') || lowerTranscript.includes('mental health')) {
    risks.push({
      type: "Mental Health",
      description: "Depression and mental health concerns identified",
      severity: "medium" as const
    });
  }
  if (lowerTranscript.includes('falls') || lowerTranscript.includes('fall risk')) {
    risks.push({
      type: "Falls Risk",
      description: "Falls risk identified",
      severity: "high" as const
    });
  }
  facts.risks = risks;

  return facts;
}

export function generateOfflineCarePlan(transcript: string, clientName: string): string {
  const facts = generateOfflineFactsExtraction(transcript, clientName);
  const today = new Date().toLocaleDateString();
  
  // Generate care plan structure matching exact template format
  return `
    <h1>Draft Care Plan (Ready for Review)</h1>
    
    <h2><strong>Care Alerts:</strong></h2>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>My Care Plan</strong></h2>
    <p><strong>Date of this Care Plan:</strong> ${today}</p>
    <p><strong>Preferred Name:</strong> ${facts.clientDetails.name.split(' ')[0]}</p>
    <p><strong>Full Name:</strong> ${facts.clientDetails.name}</p>
    <p><strong>Purpose of this Care Plan:</strong> Support at Home Program</p>
    <p><strong>Preferred Language:</strong> ${facts.clientDetails.language || 'Not documented in this transcript; this section will be updated as further details are provided.'}</p>
    <p><strong>Interpreter required?:</strong> ${facts.clientDetails.interpreterRequired ? 'Yes' : 'Not documented in this transcript; this section will be updated as further details are provided.'}</p>
    
    <hr/>
    
    <h2><strong>People involved in developing my care plan</strong></h2>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>Things to consider about my cultural, diversity, values and belief</strong></h2>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>My care worker, communication and service delivery preferences</strong></h2>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>My Preferred Support People</strong></h2>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>Informal Supports</strong></h2>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>Important things to know about me</strong></h2>
    <h3><strong>Family Background and Life History</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    <h3><strong>Interests</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>My Medical Information</strong></h2>
    <h3><strong>Medical History</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    <h3><strong>Medication</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    <h3><strong>Mobility and Equipment</strong></h3>
    <p>${facts.medical.equipment?.length ? `I use ${facts.medical.equipment.join(', ')}.` : 'Not documented in this transcript; this section will be updated as further details are provided.'}</p>
    <h3><strong>GP / Pharmacy</strong></h3>
    <p><strong>GP:</strong> ${facts.medical.gp || 'Not documented in this transcript; this section will be updated as further details are provided.'}</p>
    
    <hr/>
    
    <h2><strong>Risk Assessment</strong></h2>
    <h3><strong>Vulnerable Person</strong></h3>
    <p><strong>CALD:</strong> ${facts.clientDetails.language ? 'Yes' : 'Not documented in this transcript; this section will be updated as further details are provided.'}</p>
    <p><strong>Living with disability (mobility):</strong> ${facts.medical.equipment?.length ? 'Yes' : 'Not documented in this transcript; this section will be updated as further details are provided.'}</p>
    <p><strong>Mental health (low mood/isolation risk):</strong> ${facts.risks?.some(r => r.type.toLowerCase().includes('mental')) ? 'Yes' : 'Not documented in this transcript; this section will be updated as further details are provided.'}</p>
    <h3><strong>Specific Risks</strong></h3>
    <p>${facts.risks?.length ? facts.risks.map(r => `${r.type}: ${r.description}`).join('. ') : 'Not documented in this transcript; this section will be updated as further details are provided.'}</p>
    
    <hr/>
    
    <h2><strong>Emergency Contacts & Instructions</strong></h2>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>My Goals</strong></h2>
    <p><strong>GOAL 1</strong> Goal: Maintain health and wellbeing</p>
    <p>Abilities and considerations (risks): Not documented in this transcript; this section will be updated as further details are provided.</p>
    <p>How will we do this? (Tasks): Not documented in this transcript; this section will be updated as further details are provided.</p>
    <p>Who is responsible?: When will it be done?: How much will it cost?: Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>Budget</strong></h2>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>Care Plan Consent and Distribution</strong></h2>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>Prepared By</strong></h2>
    <p>Name: __________ | Role: Care Partner</p>
    <p>Date: Today | Review Date: in ~6 months | Signature: __________</p>
    
    <hr/>
    
    <h2><strong>Transcript Summary – ${clientName}</strong></h2>
    <h3><strong>Standard 1 – Consumer dignity and choice</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    <h3><strong>Standard 2 – Ongoing assessment and planning with consumers</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    <h3><strong>Standard 3 – Personal care and clinical care</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    <h3><strong>Standard 4 – Services and supports for daily living</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    <h3><strong>Standard 5 – Organisation's service environment</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    <h3><strong>Standards 6–8 – Feedback & complaints; Human resources; Organisational governance</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
    <hr/>
    
    <h2><strong>Dignity of Risk Assessment</strong></h2>
    <h3><strong>Narrative</strong></h3>
    <p>Not documented in this transcript; this section will be updated as further details are provided.</p>
    
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
        ${facts.risks?.length ? 
          facts.risks.map(r => `
            <tr>
              <td>${r.type}</td>
              <td>Not documented in this transcript; this section will be updated as further details are provided.</td>
              <td>Not documented in this transcript; this section will be updated as further details are provided.</td>
              <td>Not documented in this transcript; this section will be updated as further details are provided.</td>
              <td>Yes</td>
              <td>Today</td>
            </tr>
          `).join('') : 
          `<tr><td colspan="6">Not documented in this transcript; this section will be updated as further details are provided.</td></tr>`
        }
      </tbody>
    </table>
  `;
}
