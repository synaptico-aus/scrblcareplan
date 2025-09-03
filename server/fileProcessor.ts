import multer from 'multer';
import mammoth from 'mammoth';
import tesseract from 'node-tesseract-ocr';
import puppeteer from 'puppeteer';
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
        content = await extractTextFromPDFWithPuppeteer(buffer, originalname);
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

async function extractTextFromPDFWithPuppeteer(buffer: Buffer, filename: string): Promise<string> {
  let browser;
  let tempFilePath;
  
  try {
    // Create a temporary file for the PDF
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `${Date.now()}_${filename}`);
    fs.writeFileSync(tempFilePath, buffer);
    
    // Launch puppeteer to extract text from PDF
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Load the PDF file
    await page.goto(`file://${tempFilePath}`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait a bit for PDF to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract text from the page
    const textContent = await page.evaluate(() => {
      return document.body.innerText || document.body.textContent || '';
    });
    
    return textContent.trim();
    
  } catch (error) {
    console.error(`Puppeteer PDF extraction failed for ${filename}:`, error);
    throw error;
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
    }
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn(`Failed to clean up temp file ${tempFilePath}:`, cleanupError);
      }
    }
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