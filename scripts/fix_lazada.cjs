const XLSX = require('xlsx');
const path = require('path');

const baseDir = path.join(__dirname, '..');

function calcCheckDigit(prefix12) {
  const s = String(prefix12).slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(s[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

function makeValidISBN(prefix12) {
  const s = String(prefix12).slice(0, 12);
  return s + calcCheckDigit(s);
}

// Đọc Master để lấy map tên sách -> barcode mới chuẩn
const masterPath = path.join(baseDir, 'sample-data/Danh_Muc_Sach_Master.xlsx');
const wbMaster = XLSX.readFile(masterPath);
const sheetNameMaster = wbMaster.SheetNames[0];
const rowsMaster = XLSX.utils.sheet_to_json(wbMaster.Sheets[sheetNameMaster], { header: 1, defval: '' });

const productToNewBarcode = new Map();
rowsMaster.slice(1).forEach((r) => {
  productToNewBarcode.set(String(r[2]).trim(), String(r[1]).trim());
});

// Cập nhật Lazada
const lazadaPath = path.join(baseDir, 'sample-data/Don_Hang_Lazada.xlsx');
const wbLazada = XLSX.readFile(lazadaPath);
const sheetNameLazada = wbLazada.SheetNames[0];
const rowsLazada = XLSX.utils.sheet_to_json(wbLazada.Sheets[sheetNameLazada], { header: 1, defval: '' });

let updated = 0;
rowsLazada.slice(1).forEach((r) => {
  const title = String(r[2]).trim();
  const oldCode = String(r[1]).trim();
  let newCode = productToNewBarcode.get(title);
  if (!newCode && /^\d{13}$/.test(oldCode)) {
    newCode = makeValidISBN(oldCode.slice(0, 12));
  }
  if (newCode) {
    r[1] = newCode;
    updated++;
  }
});

const newWs = XLSX.utils.aoa_to_sheet(rowsLazada);
wbLazada.Sheets[sheetNameLazada] = newWs;
XLSX.writeFile(wbLazada, lazadaPath);
console.log(`✓ Successfully updated Don_Hang_Lazada.xlsx: ${updated} barcodes fixed!`);
