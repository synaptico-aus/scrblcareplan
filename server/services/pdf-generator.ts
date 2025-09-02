import { PDFDocument, PDFForm, PDFTextField, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

interface CarePlanSection {
  heading: string;
  content: string;
}

export class PDFGeneratorService {
  private cleanTextForPDF(text: string): string {
    return text
      .replace(/[\u2010-\u2015]/g, '-') // Replace various dashes with hyphen
      .replace(/[\u2018-\u2019]/g, "'") // Replace smart quotes with straight quotes
      .replace(/[\u201C-\u201D]/g, '"') // Replace smart double quotes
      .replace(/[\u2026]/g, '...') // Replace ellipsis
      .replace(/[^\x00-\x7F]/g, '') // Remove other non-ASCII characters
      .trim();
  }
  private async parseHTMLToSections(html: string): Promise<CarePlanSection[]> {
    const sections: CarePlanSection[] = [];
    
    // Simple HTML parsing to extract headings and content
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    const cleanTextRegex = /<[^>]*>/g;
    
    const matches = Array.from(html.matchAll(headingRegex));
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const heading = match[2].replace(cleanTextRegex, '').trim();
      
      let content = '';
      const nextMatch = matches[i + 1];
      if (nextMatch) {
        content = html.substring(match.index! + match[0].length, nextMatch.index!);
      } else {
        content = html.substring(match.index! + match[0].length);
      }
      
      // Clean HTML from content
      content = content.replace(cleanTextRegex, ' ').replace(/\s+/g, ' ').trim();
      
      if (heading && heading !== 'Care Plan') {
        sections.push({ heading, content });
      }
    }
    
    return sections;
  }

  private async addLogoToPDF(pdfDoc: PDFDocument, page?: PDFPage): Promise<void> {
    try {
      const logoPath = path.join(process.cwd(), 'attached_assets', 'scrbl-logo.png');
      const logoBytes = await fs.readFile(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      
      // Use provided page or get first page
      const targetPage = page || pdfDoc.getPages()[0];
      if (!targetPage) {
        console.warn('No page available for logo');
        return;
      }
      
      const { width, height } = targetPage.getSize();
      
      // Add logo to top center of page
      const logoWidth = 150;
      const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
      
      targetPage.drawImage(logoImage, {
        x: (width - logoWidth) / 2,
        y: height - 80,
        width: logoWidth,
        height: logoHeight,
      });
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
  }

  async generateEditablePDF(html: string, clientName: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const form = pdfDoc.getForm();
    
    // Enable automatic appearance generation
    form.markFieldsDirty();
    
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    // Add logo to the PDF
    await this.addLogoToPDF(pdfDoc, page);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let yPosition = 720; // Start below logo
    const margin = 50;
    const pageWidth = 595;
    const contentWidth = pageWidth - (margin * 2);
    
    // Add title
    const cleanClientName = this.cleanTextForPDF(clientName);
    page.drawText(`Care Plan - ${cleanClientName}`, {
      x: margin,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;
    
    // Parse HTML into sections
    const sections = await this.parseHTMLToSections(html);
    
    for (const section of sections) {
      // Check if we need a new page
      if (yPosition < 150) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPosition = 780;
      }
      
      // Draw section heading
      const cleanHeading = this.cleanTextForPDF(section.heading);
      page.drawText(cleanHeading, {
        x: margin,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 25;
      
      // Create editable text field for this section
      const fieldName = `section_${section.heading.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const textField = form.createTextField(fieldName);
      
      // Set font size and appearance to avoid /DA entry error
      textField.setFontSize(10);
      
      // Clean and set text content
      const cleanContent = this.cleanTextForPDF(section.content);
      textField.setText(cleanContent);
      
      // Calculate text field height based on content
      const lines = Math.max(3, Math.ceil(section.content.length / 80));
      const fieldHeight = Math.min(100, lines * 15);
      
      textField.addToPage(page, {
        x: margin,
        y: yPosition - fieldHeight,
        width: contentWidth,
        height: fieldHeight,
      });
      
      yPosition -= fieldHeight + 20;
    }
    
    // Add footer with generation info
    const currentPage = pdfDoc.getPages().slice(-1)[0];
    currentPage.drawText(`Generated by scrbl_v2 Digital Care Plan Agent - ${new Date().toLocaleDateString()}`, {
      x: margin,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    return await pdfDoc.save();
  }

  async generateStandardPDF(html: string, clientName: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    // Add logo to the PDF
    await this.addLogoToPDF(pdfDoc, page);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let yPosition = 720; // Start below logo
    const margin = 50;
    
    // Add title
    const cleanClientName2 = this.cleanTextForPDF(clientName);
    page.drawText(`Care Plan - ${cleanClientName2}`, {
      x: margin,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;
    
    // Parse and add content
    const sections = await this.parseHTMLToSections(html);
    
    for (const section of sections) {
      if (yPosition < 100) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPosition = 780;
      }
      
      // Draw heading
      const cleanHeading2 = this.cleanTextForPDF(section.heading);
      page.drawText(cleanHeading2, {
        x: margin,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      // Draw content
      const cleanContent = this.cleanTextForPDF(section.content);
      const words = cleanContent.split(' ');
      let currentLine = '';
      const lineHeight = 12;
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length > 80) {
          if (currentLine) {
            const cleanLine = this.cleanTextForPDF(currentLine);
            page.drawText(cleanLine, {
              x: margin,
              y: yPosition,
              size: 10,
              font: font,
              color: rgb(0, 0, 0),
            });
            yPosition -= lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        const cleanLine = this.cleanTextForPDF(currentLine);
        page.drawText(cleanLine, {
          x: margin,
          y: yPosition,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
      }
      
      yPosition -= 15; // Extra spacing between sections
    }
    
    // Add footer
    page.drawText(`Generated by scrbl_v2 Digital Care Plan Agent - ${new Date().toLocaleDateString()}`, {
      x: margin,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    return await pdfDoc.save();
  }
}

export const pdfGenerator = new PDFGeneratorService();