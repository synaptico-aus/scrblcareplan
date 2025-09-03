import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Schema for document analysis results
export const documentAnalysisSchema = z.object({
  summary: z.string().describe("A concise summary of the document content"),
  keyInformation: z.object({
    documentType: z.string().describe("Type of document (e.g., medical report, legal document, business contract, etc.)"),
    mainTopics: z.array(z.string()).describe("Main topics or themes covered in the document"),
    importantDates: z.array(z.object({
      date: z.string(),
      description: z.string()
    })).optional().describe("Important dates mentioned in the document"),
    keyPeople: z.array(z.object({
      name: z.string(),
      role: z.string().optional()
    })).optional().describe("Important people mentioned in the document"),
    financialInformation: z.array(z.object({
      amount: z.string(),
      description: z.string()
    })).optional().describe("Financial amounts or costs mentioned"),
    actionItems: z.array(z.string()).optional().describe("Action items or tasks identified in the document"),
    riskFactors: z.array(z.string()).optional().describe("Potential risks or concerns identified"),
    recommendations: z.array(z.string()).optional().describe("Recommendations or suggestions from the document")
  }),
  extractedData: z.object({
    clientInformation: z.object({
      name: z.string().optional(),
      contactDetails: z.string().optional(),
      demographics: z.string().optional()
    }).optional().describe("Client or customer information if present"),
    medicalInformation: z.object({
      conditions: z.array(z.string()).optional(),
      medications: z.array(z.string()).optional(),
      allergies: z.array(z.string()).optional(),
      treatments: z.array(z.string()).optional()
    }).optional().describe("Medical information if this is a health-related document"),
    legalInformation: z.object({
      contractTerms: z.array(z.string()).optional(),
      obligations: z.array(z.string()).optional(),
      deadlines: z.array(z.string()).optional()
    }).optional().describe("Legal information if this is a legal document")
  }).optional()
});

export type DocumentAnalysisResult = z.infer<typeof documentAnalysisSchema>;

/**
 * Analyze document text using AI to extract key information
 */
export async function analyzeDocumentWithAI(
  documentText: string,
  fileName: string,
  mimeType: string
): Promise<DocumentAnalysisResult> {
  if (!documentText.trim()) {
    throw new Error("Document text is empty or could not be extracted");
  }

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert document analyzer that extracts key information from various types of documents. 
          
Your task is to analyze the provided document text and extract:
1. A concise summary of the document
2. Key information including document type, main topics, important dates, people, financial info, action items, risks, and recommendations
3. Structured data extraction for client info, medical info (if health-related), and legal info (if legal document)

Respond with structured JSON that follows the provided schema. Be thorough but concise. If certain fields don't apply to this document type, omit them or leave them empty.

Focus on extracting factual information rather than making assumptions. For dates, use the format found in the document. For financial amounts, include the currency if mentioned.`
        },
        {
          role: "user",
          content: `Please analyze this document and extract key information:

Document Name: ${fileName}
File Type: ${mimeType}

Document Content:
${documentText}

Please provide a comprehensive analysis following the specified JSON schema.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent, factual extraction
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response received from OpenAI");
    }

    try {
      const parsedResult = JSON.parse(content);
      return documentAnalysisSchema.parse(parsedResult);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
    }

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`AI document analysis failed: ${error.message}`);
    }
    throw new Error("AI document analysis failed with unknown error");
  }
}

/**
 * Generate a human-readable analysis summary
 */
export function generateAnalysisSummary(analysis: DocumentAnalysisResult): string {
  let summary = `## Document Analysis Summary\n\n`;
  
  summary += `**Document Type:** ${analysis.keyInformation.documentType}\n\n`;
  summary += `**Summary:** ${analysis.summary}\n\n`;
  
  if (analysis.keyInformation.mainTopics.length > 0) {
    summary += `**Main Topics:**\n${analysis.keyInformation.mainTopics.map(topic => `• ${topic}`).join('\n')}\n\n`;
  }
  
  if (analysis.keyInformation.keyPeople && analysis.keyInformation.keyPeople.length > 0) {
    summary += `**Key People:**\n${analysis.keyInformation.keyPeople.map(person => `• ${person.name}${person.role ? ` (${person.role})` : ''}`).join('\n')}\n\n`;
  }
  
  if (analysis.keyInformation.importantDates && analysis.keyInformation.importantDates.length > 0) {
    summary += `**Important Dates:**\n${analysis.keyInformation.importantDates.map(date => `• ${date.date}: ${date.description}`).join('\n')}\n\n`;
  }
  
  if (analysis.keyInformation.financialInformation && analysis.keyInformation.financialInformation.length > 0) {
    summary += `**Financial Information:**\n${analysis.keyInformation.financialInformation.map(info => `• ${info.amount}: ${info.description}`).join('\n')}\n\n`;
  }
  
  if (analysis.keyInformation.actionItems && analysis.keyInformation.actionItems.length > 0) {
    summary += `**Action Items:**\n${analysis.keyInformation.actionItems.map(item => `• ${item}`).join('\n')}\n\n`;
  }
  
  if (analysis.keyInformation.riskFactors && analysis.keyInformation.riskFactors.length > 0) {
    summary += `**Risk Factors:**\n${analysis.keyInformation.riskFactors.map(risk => `• ${risk}`).join('\n')}\n\n`;
  }
  
  if (analysis.keyInformation.recommendations && analysis.keyInformation.recommendations.length > 0) {
    summary += `**Recommendations:**\n${analysis.keyInformation.recommendations.map(rec => `• ${rec}`).join('\n')}\n\n`;
  }
  
  return summary;
}