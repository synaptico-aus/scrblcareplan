import multer from 'multer';
import mammoth from 'mammoth';
import tesseract from 'node-tesseract-ocr';
import { Request } from 'express';
import fs from 'fs';
import path from 'path';

// Configure multer for file uploads
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word documents, and images are allowed.'));
    }
  }
});

export interface ExtractedFileContent {
  filename: string;
  content: string;
  type: string;
}

export async function extractTextFromFile(file: Express.Multer.File): Promise<ExtractedFileContent> {
  const { originalname, mimetype, buffer } = file;
  
  try {
    let content = '';
    
    if (mimetype === 'application/pdf') {
      try {
        content = await extractTextFromPDFAlternative(buffer, originalname);
      } catch (error) {
        console.warn(`PDF parsing failed for ${originalname}:`, error);
        content = `[PDF file: ${originalname} - Text extraction failed. Please convert to Word document or image for processing.]`;
      }
    } else if (mimetype === 'application/msword' || 
               mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else if (mimetype.startsWith('image/')) {
      // Use OCR for images
      try {
        content = await tesseract.recognize(buffer, {
          lang: 'eng',
          oem: 1,
          psm: 3,
        });
      } catch (ocrError) {
        console.warn(`OCR failed for ${originalname}:`, ocrError);
        content = `[Image file: ${originalname} - Text extraction failed]`;
      }
    } else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }
    
    return {
      filename: originalname,
      content: content.trim(),
      type: mimetype
    };
  } catch (error) {
    console.error(`Error extracting text from ${originalname}:`, error);
    throw new Error(`Failed to extract text from ${originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromPDFAlternative(buffer: Buffer, filename: string): Promise<string> {
  // For now, provide helpful guidance to the user about PDF processing
  // This avoids the complex pdf-parse library issues in the Replit environment
  
  console.log(`Processing PDF: ${filename}`);
  
  return `[PDF Document: ${filename}]

📄 PDF Processing Notice:
This PDF file has been uploaded but automatic text extraction is currently limited in this environment. 

To ensure the AI can analyze your assessment information:

✅ RECOMMENDED OPTIONS:
1. Convert your PDF to a Word document (.docx) and re-upload
2. Copy key assessment content and paste it into the transcript field
3. Export important pages as images (PNG/JPG) for OCR processing

📋 What to include from your PDF:
• Client personal details and medical history
• Assessment findings and observations  
• Risk factors and safety concerns
• Support networks and family information
• Service preferences and cultural considerations
• Any specific goals or outcomes mentioned

The AI will work with whatever content you provide in the transcript field combined with any successfully processed uploaded files.`;
}

async function convertPDFToTextViaOCR(buffer: Buffer, filename: string): Promise<string> {
  // This is a simplified fallback - in a real implementation, you'd convert 
  // PDF pages to images first, but for now we'll return a helpful message
  return `[PDF Content from ${filename}]
  
This PDF file could not be processed automatically. Please:
1. Convert the PDF to a Word document (.docx) for better text extraction, or
2. Export key pages as images (PNG/JPG) and upload those for OCR processing, or
3. Copy and paste the relevant text directly into the transcript field.

This will ensure the AI can properly analyze all your assessment information.`;
}

export async function extractTextFromFiles(files: Express.Multer.File[]): Promise<ExtractedFileContent[]> {
  const extractionPromises = files.map(file => extractTextFromFile(file));
  const results = await Promise.allSettled(extractionPromises);
  
  const extracted: ExtractedFileContent[] = [];
  const errors: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      extracted.push(result.value);
    } else {
      errors.push(`${files[index].originalname}: ${result.reason.message}`);
    }
  });
  
  if (errors.length > 0) {
    console.warn('Some files failed to process:', errors);
  }
  
  return extracted;
}