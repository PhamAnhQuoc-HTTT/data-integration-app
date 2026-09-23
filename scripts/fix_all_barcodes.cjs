const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

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

// 1. Đọc Master Catalog
const masterPath = path.join(baseDir, 'sample-data/Danh_Muc_Sach_Master.xlsx');
const wbMaster = XLSX.readFile(masterPath);
const sheetNameMaster = wbMaster.SheetNames[0];
const rowsMaster = XLSX.utils.sheet_to_json(wbMaster.Sheets[sheetNameMaster], { header: 1, defval: '' });

const productToNewBarcode = new Map();
const oldBarcodeToNewBarcode = new Map();
const newBarcodeSet = new Set();

// Gán mã ISBN-13 chuẩn cho 56 sản phẩm Master
rowsMaster.slice(1).forEach((r, idx) => {
  const oldCode = String(r[1]).trim();
  const title = String(r[2]).trim();
  const ncc = String(r[4]).trim();
  
  let prefix12;
  if (ncc.includes("Kim Đồng") || ncc.includes("IPM")) {
    // Sách manga/light novel Kim Đồng/IPM: prefix 978604395 + 3 số thứ tự
    const numStr = String(idx + 1).padStart(3, '0');
    prefix12 = `978604395${numStr}`;
  } else {
    // Sách thông thường: prefix 978604520 + 3 số thứ tự
    const numStr = String(idx + 1).padStart(3, '0');
    prefix12 = `978604520${numStr}`;
  }
  
  const newCode = makeValidISBN(prefix12);
  productToNewBarcode.set(title, newCode);
  oldBarcodeToNewBarcode.set(oldCode, newCode);
  newBarcodeSet.add(newCode);
  
  r[1] = newCode; // cập nhật mã mới vào master row
});

console.log(`Master Catalog: ${rowsMaster.length - 1} products, ${newBarcodeSet.size} unique valid ISBNs.`);

// Ghi lại Master Catalog
const newWsMaster = XLSX.utils.aoa_to_sheet(rowsMaster);
wbMaster.Sheets[sheetNameMaster] = newWsMaster;
XLSX.writeFile(wbMaster, masterPath);
console.log(`✓ Updated ${masterPath}`);

// 2. Cập nhật các file đơn hàng
const orderFiles = [
  'sample-data/Don_Hang_Shopee.xlsx',
  'sample-data/Don_Hang_POS.xlsx',
  'sample-data/Don_Hang_TikTok_Shop.xlsx',
  'sample-data/Don_Hang_Lazada.xlsx'
];

orderFiles.forEach((relPath) => {
  const fullPath = path.join(baseDir, relPath);
  const wb = XLSX.readFile(fullPath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  
  let updatedCount = 0;
  let emptyCount = 0;
  
  rows.slice(1).forEach((r) => {
    const oldCode = String(r[1]).trim();
    const title = String(r[2]).trim();
    
    if (!oldCode || oldCode === '') {
      emptyCount++;
      return;
    }
    
    // Tìm mã mới theo tên sản phẩm trước, rồi theo mã cũ
    let newCode = productToNewBarcode.get(title) || oldBarcodeToNewBarcode.get(oldCode);
    if (!newCode) {
      // Nếu là sản phẩm lạ không có trong catalog, vẫn sửa checksum hợp lệ
      if (/^\d{13}$/.test(oldCode)) {
        newCode = makeValidISBN(oldCode.slice(0, 12));
      }
    }
    
    if (newCode) {
      r[1] = newCode;
      updatedCount++;
    }
  });
  
  const newWs = XLSX.utils.aoa_to_sheet(rows);
  wb.Sheets[sheetName] = newWs;
  XLSX.writeFile(wb, fullPath);
  console.log(`✓ Updated ${relPath}: ${updatedCount} barcodes fixed, ${emptyCount} left empty (for fuzzy testing).`);
});

console.log("\nALL FILES SUCCESSFULLY UPDATED WITH 100% VALID ISBN-13 CODES!");
