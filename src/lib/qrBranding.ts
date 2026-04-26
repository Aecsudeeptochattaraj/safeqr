
export async function drawBrandedQR(canvas: HTMLCanvasElement, qrId: string, qrCanvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Portrait orientation for sticker-style look
  const width = 800;
  const height = 1000;
  canvas.width = width;
  canvas.height = height;

  const BRAND_YELLOW = '#FFDE00';
  const TEXT_BLACK = '#000000';
  const TEXT_GRAY = '#444444';

  // 1. Background & Border
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Thick Yellow Border
  ctx.strokeStyle = BRAND_YELLOW;
  ctx.lineWidth = 15;
  ctx.strokeRect(7.5, 7.5, width - 15, height - 15);

  // 2. Header Content (Centered)
  ctx.textAlign = 'center';

  // Title: MyPark Saathi
  ctx.fillStyle = TEXT_BLACK;
  ctx.font = '900 80px sans-serif';
  ctx.fillText('MyPark Saathi', width / 2, 140);

  // Subtitle
  ctx.font = '600 32px sans-serif';
  ctx.fillText('Scan to contact vehicle owner.', width / 2, 210);

  // 3. QR Code Section
  const qrSize = 400;
  const qrX = (width - qrSize) / 2;
  const qrY = 320;

  // Draw Yellow Corner Brackets
  ctx.strokeStyle = BRAND_YELLOW;
  ctx.lineWidth = 12;
  const bracketLen = 40;

  // Top Left
  ctx.beginPath();
  ctx.moveTo(qrX - 20, qrY - 20 + bracketLen);
  ctx.lineTo(qrX - 20, qrY - 20);
  ctx.lineTo(qrX - 20 + bracketLen, qrY - 20);
  ctx.stroke();

  // Top Right
  ctx.beginPath();
  ctx.moveTo(qrX + qrSize + 20 - bracketLen, qrY - 20);
  ctx.lineTo(qrX + qrSize + 20, qrY - 20);
  ctx.lineTo(qrX + qrSize + 20, qrY - 20 + bracketLen);
  ctx.stroke();

  // Bottom Left
  ctx.beginPath();
  ctx.moveTo(qrX - 20, qrY + qrSize + 20 - bracketLen);
  ctx.lineTo(qrX - 20, qrY + qrSize + 20);
  ctx.lineTo(qrX - 20 + bracketLen, qrY + qrSize + 20);
  ctx.stroke();

  // Bottom Right
  ctx.beginPath();
  ctx.moveTo(qrX + qrSize + 20 - bracketLen, qrY + qrSize + 20);
  ctx.lineTo(qrX + qrSize + 20, qrY + qrSize + 20);
  ctx.lineTo(qrX + qrSize + 20, qrY + qrSize + 20 - bracketLen);
  ctx.stroke();

  // Draw the actual QR Code
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // 4. Footer Messages
  ctx.fillStyle = TEXT_GRAY;
  
  // High-level guidance
  ctx.font = '600 28px sans-serif';
  ctx.fillText('For wrong parking or emergencies', width / 2, 780);
  
  // Tech guidance
  ctx.font = '500 24px sans-serif';
  ctx.fillText('Scan using phone camera or any QR app.', width / 2, 830);

  // 5. Technical Identifier (Unobtrusive)
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '900 16px sans-serif';
  ctx.fillText(`ID: ${qrId} • MYPARKSAATHI.IN`, width / 2, height - 50);
}
