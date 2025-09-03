import multer from 'multer';
// Use dynamic import to avoid startup issues with pdf-parse
// import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import tesseract from 'node-tesseract-ocr';
import { Request } from 'express';

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
        const pdfParse = await import('pdf-parse');
        const pdfData = await pdfParse.default(buffer);
        content = pdfData.text;
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