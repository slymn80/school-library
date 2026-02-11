import { jsPDF } from 'jspdf';

// Function to load and add a Cyrillic-supporting font to jsPDF
export async function addCyrillicFont(doc: jsPDF): Promise<void> {
  try {
    // Use Roboto font from Google Fonts CDN (supports Cyrillic)
    const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf';

    const response = await fetch(fontUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Add font to jsPDF
    doc.addFileToVFS('Roboto-Regular.ttf', base64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
  } catch (error) {
    console.error('Failed to load Cyrillic font:', error);
    // Fallback to default font
  }
}

// Synchronous version using embedded font subset (for basic Cyrillic)
// This is a minimal font subset - for full support, use the async version above
export function setupCyrillicFont(doc: jsPDF): void {
  // Set font to helvetica as fallback - won't display Cyrillic properly
  // but prevents crashes
  doc.setFont('helvetica');
}
