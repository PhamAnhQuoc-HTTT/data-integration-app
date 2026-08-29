const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const baseDir = __dirname;
const targetFiles = [
  'sample-data/Danh_Muc_Sach_Master.xlsx',
  'sample-data/Don_Hang_Shopee.xlsx',
  'sample-data/Don_Hang_POS.xlsx',
  'sample-data/Don_Hang_TikTok_Shop.xlsx',
  'sample-data/Don_Hang_Lazada.xlsx',
  'Ground Truth/Ground_Truth_Lazada.xlsx',
  'Ground Truth/Ground_Truth_Master_All_Channels.xlsx',
  'Ground Truth/Ground_Truth_POS.xlsx',
  'Ground Truth/Ground_Truth_Shopee.xlsx',
  'Ground Truth/Ground_Truth_TikTok.xlsx'
];

function validateISBN13(code) {
  if (!code) return { valid: false, reason: 'Trống' };
  const clean = String(code).replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(clean)) return { valid: false, reason: `Không phải 13 chữ số (${clean})`, clean };
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  const valid = check === parseInt(clean[12], 10);
  return { valid, clean, reason: valid ? 'OK' : `Sai checksum (expected ${check}, got ${clean[12]})` };
}

for (const relPath of targetFiles) {
  const fullPath = path.join(baseDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`\n❌ ${relPath}: FILE KHÔNG TỒN TẠI`);
    continue;
  }

  const wb = XLSX.readFile(fullPath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headers = (rows[0] || []).map(h => String(h));
  const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim() !== ''));

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 ${relPath}`);
  console.log(`   Sheet: "${sheetName}" | Số dòng dữ liệu: ${dataRows.length}`);
  console.log(`   Headers (${headers.length} cột): ${headers.join(' | ')}`);
  
  // Show first 3 rows
  console.log(`   --- 3 dòng đầu ---`);
  dataRows.slice(0, 3).forEach((r, i) => {
    const vals = headers.map((_, ci) => String(r[ci] || '').substring(0, 30));
    console.log(`   [${i+1}] ${vals.join(' | ')}`);
  });

  // Check ISBN/Barcode columns
  const isbnColIdx = headers.findIndex(h => /isbn|barcode|ma.*vach|ma.*dinh.*danh|sku|ma_san_pham/i.test(h));
  if (isbnColIdx !== -1) {
    let valid = 0, invalid = 0, empty = 0, errors = [];
    dataRows.forEach((r, idx) => {
      const val = r[isbnColIdx];
      if (!val || String(val).trim() === '') { empty++; return; }
      const check = validateISBN13(val);
      if (check.valid) valid++;
      else { invalid++; if (errors.length < 5) errors.push(`Row ${idx+1}: "${val}" → ${check.reason}`); }
    });
    console.log(`   📊 Cột mã "${headers[isbnColIdx]}": ${valid} hợp lệ, ${invalid} sai, ${empty} trống`);
    if (errors.length > 0) console.log(`   ⚠️ Mã lỗi: ${errors.join('; ')}`);
  }
}
