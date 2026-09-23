const XLSX = require('xlsx');
const path = require('path');

const baseDir = path.join(__dirname, '..');
const masterPath = path.join(baseDir, 'sample-data/Danh_Muc_Sach_Master.xlsx');
const wbMaster = XLSX.readFile(masterPath);
const rowsMaster = XLSX.utils.sheet_to_json(wbMaster.Sheets[wbMaster.SheetNames[0]], { header: 1, defval: '' });
const masterTitles = new Set(rowsMaster.slice(1).map(r => String(r[2]).trim()));

const files = [
  'sample-data/Don_Hang_Shopee.xlsx',
  'sample-data/Don_Hang_POS.xlsx',
  'sample-data/Don_Hang_TikTok_Shop.xlsx'
];

files.forEach(f => {
  const wb = XLSX.readFile(path.join(baseDir, f));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  let emptyBarcode = 0;
  let nonExactTitle = 0;
  rows.slice(1).forEach(r => {
    const code = String(r[1]).trim();
    const title = String(r[2]).trim();
    if (!code) emptyBarcode++;
    if (!masterTitles.has(title)) nonExactTitle++;
  });
  console.log(`${f}: ${rows.length - 1} rows | Empty barcode: ${emptyBarcode} | Non-exact title vs Master: ${nonExactTitle}`);
});
