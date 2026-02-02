import bwipjs from 'bwip-js';

export async function generateBarcode(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      bwipjs.toCanvas(canvas, {
        bcid: 'code128',
        text: text,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
        textsize: 8,
      });
      resolve(canvas.toDataURL('image/png'));
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateBarcodeForPrint(text: string, height: number = 10): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      bwipjs.toCanvas(canvas, {
        bcid: 'code128',
        text: text,
        scale: 2,
        height: height,
        includetext: false,
      });
      resolve(canvas.toDataURL('image/png'));
    } catch (error) {
      reject(error);
    }
  });
}
