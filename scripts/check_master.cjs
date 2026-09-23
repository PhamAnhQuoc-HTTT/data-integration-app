const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const baseDir = path.join(__dirname, '..');
const masterPath = path.join(baseDir, 'sample-data/Danh_Muc_Sach_Master.xlsx');
const wbMaster = XLSX.readFile(masterPath);
const sheetMaster = wbMaster.Sheets[wbMaster.SheetNames[0]];
const rowsMaster = XLSX.utils.sheet_to_json(sheetMaster, { header: 1, defval: '' });

console.log("Master Catalog Headers:", rowsMaster[0]);
console.log("Total Master rows:", rowsMaster.length - 1);
rowsMaster.slice(1).forEach((r, idx) => {
  console.log(`[${idx + 1}] Barcode: "${r[1]}" | Tên: "${r[2]}" | NCC: "${r[4]}" | Giá: "${r[5]}"`);
});
