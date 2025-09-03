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
  console.log(`Attempting to extract text from PDF: ${filename}`);
  
  try {
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    
    if (data.text && data.text.trim().length > 0) {
      console.log(`Successfully extracted ${data.text.length} characters from ${filename} using pdf-parse`);
      return data.text.trim();
    } else {
      console.warn(`PDF parsing returned empty text for ${filename}`);
      throw new Error('PDF parsing returned empty text');
    }
    
  } catch (parseError) {
    console.error(`PDF parsing failed for ${filename}:`, parseError);
    
    // Return a helpful message that explains the situation and provides alternatives
    return `[PDF Document: ${filename}]

⚠️ PDF Text Extraction Issue:
This PDF file was uploaded but automatic text extraction encountered technical limitations.

📋 To ensure your assessment data is properly analyzed, please:

1. **Copy key content manually**: Copy the important assessment information from your PDF and paste it into the transcript field above

2. **Convert to Word format**: Save your PDF as a Word document (.docx) and re-upload it

3. **Use the content I can see**: Based on your file name, this appears to be an ACAS (Aged Care Assessment Service) report. Please include:
   • Client personal details and medical history
   • Assessment findings and eligibility determinations
   • Service recommendations and care approvals
   • Goals, support networks, and preferences
   • Current care providers and contact details

The AI will analyze whatever content you provide to generate a comprehensive care plan that meets Australian aged care standards.`;
  }
}

async function convertPDFToTextViaOCR(buffer: Buffer, filename: string): Promise<string> {
  // For now, since PDF-to-image conversion libraries don't work well in this environment,
  // we'll provide helpful instructions to the user
  console.log(`PDF OCR conversion requested for ${filename} but not available in this environment`);
  
  throw new Error('OCR conversion not available - please convert PDF to Word document or copy text manually');
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