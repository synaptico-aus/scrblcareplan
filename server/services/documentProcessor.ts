import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

export interface DocumentProcessingResult {
  text: string;
  metadata: {
    pages?: number;
    wordCount: number;
    fileType: string;
    extractionMethod: string;
  };
}

export class DocumentProcessor {
  
  /**
   * Extracts text from various document types
   */
  async extractTextFromFile(filePath: string, mimeType: string): Promise<DocumentProcessingResult> {
    try {
      if (mimeType === 'application/pdf') {
        return await this.extractTextFromPDF(filePath);
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return await this.extractTextFromDocx(filePath);
      } else if (mimeType.startsWith('image/')) {
        return await this.extractTextFromImage(filePath, mimeType);
      } else if (mimeType === 'text/plain') {
        return await this.extractTextFromPlainText(filePath);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      throw new Error(`Failed to extract text from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF files
   */
  private async extractTextFromPDF(filePath: string): Promise<DocumentProcessingResult> {
    try {
      // Dynamic import to avoid startup issues
      const pdfParse = await import('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse.default(dataBuffer);
      
      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          wordCount: this.countWords(data.text),
          fileType: 'PDF',
          extractionMethod: 'pdf-parse'
        }
      };
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from Word documents (.docx)
   */
  private async extractTextFromDocx(filePath: string): Promise<DocumentProcessingResult> {
    const result = await mammoth.extractRawText({ path: filePath });
    
    return {
      text: result.value,
      metadata: {
        wordCount: this.countWords(result.value),
        fileType: 'DOCX',
        extractionMethod: 'mammoth'
      }
    };
  }

  /**
   * Extract text from images using OCR
   */
  private async extractTextFromImage(filePath: string, mimeType: string): Promise<DocumentProcessingResult> {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
      logger: m => console.log(m) // Optional: log OCR progress
    });
    
    return {
      text: text,
      metadata: {
        wordCount: this.countWords(text),
        fileType: mimeType.split('/')[1].toUpperCase(),
        extractionMethod: 'tesseract-ocr'
      }
    };
  }

  /**
   * Extract text from plain text files
   */
  private async extractTextFromPlainText(filePath: string): Promise<DocumentProcessingResult> {
    const text = fs.readFileSync(filePath, 'utf-8');
    
    return {
      text: text,
      metadata: {
        wordCount: this.countWords(text),
        fileType: 'TXT',
        extractionMethod: 'fs-read'
      }
    };
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract text from a buffer (useful for processing uploaded files)
   */
  async extractTextFromBuffer(buffer: Buffer, mimeType: string, originalName: string): Promise<DocumentProcessingResult> {
    // Create a temporary file to process
    const tempDir = '/tmp';
    const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${originalName}`);
    
    try {
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, buffer);
      
      // Process the file
      const result = await this.extractTextFromFile(tempFilePath, mimeType);
      
      return result;
    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
}