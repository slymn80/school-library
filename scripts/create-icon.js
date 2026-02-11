const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

async function createIcon() {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - blue gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1976d2');
  gradient.addColorStop(1, '#1565c0');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 40);
  ctx.fill();

  // Book icon
  ctx.fillStyle = 'white';

  // Book base
  const bookX = 40;
  const bookY = 50;
  const bookW = 176;
  const bookH = 156;

  // Left page
  ctx.beginPath();
  ctx.moveTo(size/2, bookY + 20);
  ctx.lineTo(bookX + 10, bookY + 10);
  ctx.lineTo(bookX + 10, bookY + bookH);
  ctx.lineTo(size/2, bookY + bookH - 10);
  ctx.closePath();
  ctx.fill();

  // Right page
  ctx.beginPath();
  ctx.moveTo(size/2, bookY + 20);
  ctx.lineTo(size - bookX - 10, bookY + 10);
  ctx.lineTo(size - bookX - 10, bookY + bookH);
  ctx.lineTo(size/2, bookY + bookH - 10);
  ctx.closePath();
  ctx.fill();

  // Book spine shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.moveTo(size/2 - 5, bookY + 20);
  ctx.lineTo(size/2 + 5, bookY + 20);
  ctx.lineTo(size/2 + 5, bookY + bookH - 10);
  ctx.lineTo(size/2 - 5, bookY + bookH - 10);
  ctx.closePath();
  ctx.fill();

  // Lines on pages
  ctx.strokeStyle = 'rgba(25, 118, 210, 0.3)';
  ctx.lineWidth = 2;

  // Left page lines
  for (let i = 0; i < 4; i++) {
    const y = bookY + 50 + i * 25;
    ctx.beginPath();
    ctx.moveTo(bookX + 25, y);
    ctx.lineTo(size/2 - 15, y);
    ctx.stroke();
  }

  // Right page lines
  for (let i = 0; i < 4; i++) {
    const y = bookY + 50 + i * 25;
    ctx.beginPath();
    ctx.moveTo(size/2 + 15, y);
    ctx.lineTo(size - bookX - 25, y);
    ctx.stroke();
  }

  // Save PNG
  const pngPath = path.join(__dirname, '..', 'public', 'icon.png');
  const icoPath = path.join(__dirname, '..', 'public', 'icon.ico');

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);
  console.log('PNG created:', pngPath);

  // Convert to ICO
  try {
    const icoBuffer = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('ICO created:', icoPath);
  } catch (err) {
    console.error('Error creating ICO:', err);
  }
}

createIcon();
