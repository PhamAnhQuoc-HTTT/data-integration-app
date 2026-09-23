const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const baseDir = path.join(__dirname, '..');
const masterPath = path.join(baseDir, 'sample-data/Danh_Muc_Sach_Master.xlsx');
const wbMaster = XLSX.readFile(masterPath);
const sheetMaster = wbMaster.Sheets[wbMaster.SheetNames[0]];
const rowsMaster = XLSX.utils.sheet_to_json(sheetMaster, { header: 1, defval: '' });

function fixBarcode(code) {
  const clean = String(code).trim().replace(/[\s-]/g, '');
  if (/^\d{13}$/.test(clean)) {
    const prefix12 = clean.slice(0, 12);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(prefix12[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return prefix12 + checkDigit;
  }
  return code;
}

const barcodeMap = new Map();
const newBarcodes = new Set();
let duplicates = 0;

rowsMaster.slice(1).forEach((r, idx) => {
  const oldCode = String(r[1]).trim();
  const newCode = fixBarcode(oldCode);
  barcodeMap.set(oldCode, newCode);
  if (newBarcodes.has(newCode)) {
    console.log(`⚠️ COLLISION: "${newCode}" for product "${r[2]}" (old: "${oldCode}")`);
    duplicates++;
  }
  newBarcodes.add(newCode);
  console.log(`[${idx + 1}] "${r[2]}": ${oldCode} → ${newCode}`);
});

console.log(`\nTotal products: ${rowsMaster.length - 1}`);
console.log(`Unique new barcodes: ${newBarcodes.size}`);
console.log(`Duplicates/Collisions: ${duplicates}`);
