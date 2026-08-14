import { describe, it, expect } from "vitest";
import { normalizeNumber, normalizeDate, normalizeIdCode, normalizeTextForMatching, normalizeOrderId, validateISBN13, normalizeChannel, normalizeOrderStatus, normalizeBrand } from "../normalize";
import { detectFields, buildRows } from "../fieldMapping";
import { resolveEntities, tokenSortRatio } from "../entityResolution";
import { runAllChecks, checkDuplicates, checkMissingAttributes, checkCrossChannelPrice, checkNullVsZero, checkCategoricalMismatch, checkEncodingIssues, checkStaleData, checkReferentialIntegrity, GROUP_LABELS } from "../qualityRules";

describe("normalizeNumber", () => {
  it("parses plain integer string", () => { expect(normalizeNumber("65000")).toBe(65000); });
  it("parses dot as thousand separator", () => { expect(normalizeNumber("79.000")).toBe(79000); });
  it("parses comma as thousand separator", () => { expect(normalizeNumber("79,000")).toBe(79000); });
  it("strips currency symbol", () => { expect(normalizeNumber("79.000 đ")).toBe(79000); });
  it("returns null for empty/null", () => {
    expect(normalizeNumber("")).toBeNull();
    expect(normalizeNumber(null)).toBeNull();
  });
  it("parses comma as decimal separator when 2 digits follow", () => { expect(normalizeNumber("12,50")).toBe(12.5); });
});

describe("normalizeDate", () => {
  it("parses dd/mm/yyyy", () => { expect(normalizeDate("05/08/2026")).toBe("2026-08-05"); });
  it("parses iso format", () => { expect(normalizeDate("2026-08-05")).toBe("2026-08-05"); });
  it("returns null for invalid/empty", () => { expect(normalizeDate("")).toBeNull(); });
});

describe("normalizeIdCode", () => {
  it("strips dashes and spaces, uppercases", () => { expect(normalizeIdCode("978-604-5 123456")).toBe("9786045123456"); });
  it("returns null for null input", () => { expect(normalizeIdCode(null)).toBeNull(); });
});

describe("normalizeTextForMatching", () => {
  it("removes diacritics and parenthetical annotations", () => {
    expect(normalizeTextForMatching("Nhà Giả Kim (bản đẹp)")).toBe("nha gia kim");
  });
});

describe("normalizeOrderId", () => {
  it("strips invisible characters", () => {
    expect(normalizeOrderId('\u200BDH001\uFEFF')).toBe('DH001');
  });
  it("returns null for null/empty", () => {
    expect(normalizeOrderId(null)).toBeNull();
    expect(normalizeOrderId("")).toBeNull();
  });
});

describe("validateISBN13", () => {
  it("valid ISBN", () => {
    expect(validateISBN13('9780306406157').valid).toBe(true);
  });
  it("invalid checksum", () => {
    expect(validateISBN13('9780306406158').valid).toBe(false);
  });
  it("non-13-digit", () => {
    expect(validateISBN13('123').valid).toBe(false);
  });
});

describe("normalizeChannel", () => {
  it("normalizes to Shopee", () => {
    expect(normalizeChannel('shopee vn')).toBe('Shopee');
    expect(normalizeChannel('SHOPEE')).toBe('Shopee');
  });
  it("normalizes to TikTok Shop", () => {
    expect(normalizeChannel('tiktok shop')).toBe('TikTok Shop');
  });
  it("normalizes to POS", () => {
    expect(normalizeChannel('Tại quầy')).toBe('POS');
  });
  it("keeps unknown value", () => {
    expect(normalizeChannel('Zalo Shop')).toBe('Zalo Shop');
  });
});

describe("normalizeOrderStatus", () => {
  it("normalizes to Hoàn thành", () => {
    expect(normalizeOrderStatus('Đã giao')).toBe('Hoàn thành');
  });
  it("normalizes to Đã hủy", () => {
    expect(normalizeOrderStatus('cancelled')).toBe('Đã hủy');
  });
  it("normalizes to Đang xử lý", () => {
    expect(normalizeOrderStatus('Đang xử lý')).toBe('Đang xử lý');
  });
  it("keeps unknown value", () => {
    expect(normalizeOrderStatus('Chờ hàng')).toBe('Chờ hàng');
  });
});

describe("normalizeBrand", () => {
  it("normalizes to NXB Trẻ", () => {
    expect(normalizeBrand('NXB Trẻ')).toBe('NXB Trẻ');
    expect(normalizeBrand('nha xuat ban tre')).toBe('NXB Trẻ');
  });
  it("keeps unknown value", () => {
    expect(normalizeBrand('Alpha Books')).toBe('Alpha Books');
  });
});

describe("field mapping", () => {
  it("maps Vietnamese headers correctly", () => {
    const headers = ["Mã ISBN", "Tên sách", "SL", "Đơn giá", "Ngày bán"];
    const mapping = detectFields(headers);
    expect(mapping.ma_dinh_danh).toBe(0);
    expect(mapping.ten_sp).toBe(1);
    expect(mapping.so_luong).toBe(2);
  });

  it("builds rows from mapped data, filters fully-empty rows", () => {
    const headers = ["Tên sách", "SL"];
    const mapping = detectFields(headers);
    const rows = buildRows([["Nhà Giả Kim", "2"], ["", ""]], mapping);
    expect(rows.length).toBe(1);
    expect(rows[0].ten_sp).toBe("Nhà Giả Kim");
  });
});

describe("tokenSortRatio", () => {
  it("returns 100 for identical strings", () => { expect(tokenSortRatio("nha gia kim", "nha gia kim")).toBe(100); });
  it("is order-independent", () => { expect(tokenSortRatio("gia kim nha", "nha gia kim")).toBe(100); });
  it("returns 0 when one side is empty", () => { expect(tokenSortRatio("", "abc")).toBe(0); });
});

describe("resolveEntities", () => {
  const catalog = [{ ma_dinh_danh: "9786045123456", ten_sp: "Nhà Giả Kim", gia_chuan: "79000" }];

  it("matches exactly by id code", () => {
    const rows = [{ ma_dinh_danh: "978-6045-123456", ten_sp: "khong lien quan" }];
    const result = resolveEntities(rows, catalog);
    expect(result[0].matchStatus).toBe("MATCHED_EXACT");
  });

  it("falls back to fuzzy matching by title when id missing", () => {
    const rows = [{ ma_dinh_danh: "", ten_sp: "Nha Gia Kim" }];
    const result = resolveEntities(rows, catalog);
    expect(["MATCHED_EXACT", "MATCHED_FUZZY_HIGH", "NEEDS_CONFIRMATION"]).toContain(result[0].matchStatus);
  });

  it("returns UNRESOLVED when nothing matches", () => {
    const rows = [{ ma_dinh_danh: "XXXX", ten_sp: "hoan toan khong lien quan gi ca that su" }];
    const result = resolveEntities(rows, catalog);
    expect(result[0].matchStatus).toBe("UNRESOLVED");
  });
});

describe("quality rules — severity classification", () => {
  it("flags duplicated order codes as NEEDS_CONFIRMATION, not auto-removed", () => {
    const rows = [
      { ma_don: "DH001", __source: "pos", so_luong: "1", gia: "1000" },
      { ma_don: "DH001", __source: "pos", so_luong: "1", gia: "1000" },
    ];
    const issues = checkDuplicates(rows);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("NEEDS_CONFIRMATION");
  });

  it("checkMissingAttributes flags rows missing key fields based on source", () => {
    const rows = [
      { __source: "pos.xlsx", kenh: "" }
    ];
    const issues = checkMissingAttributes(rows);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("checkCrossChannelPrice flags price diff > 30% for same product across channels", () => {
    const rows = [
      { ma_dinh_danh: "SP1", kenh: "Shopee", gia: "100", matched: { gia_chuan: "100" }, matchStatus: "MATCHED_EXACT" },
      { ma_dinh_danh: "SP1", kenh: "Lazada", gia: "140", matched: { gia_chuan: "100" }, matchStatus: "MATCHED_EXACT" }
    ];
    const issues = checkCrossChannelPrice(rows);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("checkCrossChannelPrice does not flag price diff < 30%", () => {
    const rows = [
      { ma_dinh_danh: "SP1", kenh: "Shopee", gia: "100", matched: { gia_chuan: "100" }, matchStatus: "MATCHED_EXACT" },
      { ma_dinh_danh: "SP1", kenh: "Lazada", gia: "120", matched: { gia_chuan: "100" }, matchStatus: "MATCHED_EXACT" }
    ];
    const issues = checkCrossChannelPrice(rows);
    expect(issues.length).toBe(0);
  });

  it("checkNullVsZero flags gia = '0' but not gia = ''", () => {
    const rowsZero = [{ gia: "0" }];
    const issuesZero = checkNullVsZero(rowsZero);
    expect(issuesZero.length).toBe(1);

    const rowsNull = [{ gia: "" }];
    const issuesNull = checkNullVsZero(rowsNull);
    expect(issuesNull.length).toBe(0);
  });

  it("checkCategoricalMismatch flags unknown channel", () => {
    const rows = [{ kenh: "Unknown Channel" }];
    const issues = checkCategoricalMismatch(rows);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("checkCategoricalMismatch does not flag known channel", () => {
    const rows = [{ kenh: "Shopee" }];
    const issues = checkCategoricalMismatch(rows);
    const kenhIssues = issues.filter(i => i.field === "kenh");
    expect(kenhIssues.length).toBe(0);
  });

  it("checkEncodingIssues flags rows with \\uFFFD", () => {
    const rows = [{ ten_sp: "L\uFFFDi" }];
    const issues = checkEncodingIssues(rows);
    expect(issues.length).toBe(1);
  });

  it("checkEncodingIssues does not flag clean rows", () => {
    const rows = [{ ten_sp: "Sản phẩm tốt" }];
    const issues = checkEncodingIssues(rows);
    expect(issues.length).toBe(0);
  });

  it("checkStaleData flags cancelled order with stock and price", () => {
    const rows = [{ trang_thai: "Đã hủy", so_luong: "5", gia: "100000" }];
    const issues = checkStaleData(rows);
    expect(issues.length).toBe(1);
  });

  it("checkReferentialIntegrity flags UNRESOLVED matchStatus with ma_dinh_danh", () => {
    const rows = [{ ma_dinh_danh: "XX123", matchStatus: "UNRESOLVED" }];
    const issues = checkReferentialIntegrity(rows);
    expect(issues.length).toBe(1);
  });

  it("every issue produced by runAllChecks has a valid severity AND a valid group", () => {
    const rows = [
      { ma_don: "DH1", __source: "pos.xlsx", so_luong: "", gia: "0", ten_sp: "A\uFFFD", matchStatus: "UNRESOLVED", matched: null, ma_dinh_danh: "XX123", trang_thai: "Đã hủy", kenh: "Unknown" },
      { ma_don: "DH1", __source: "pos.xlsx", so_luong: "1", gia: "1000", ten_sp: "B", matchStatus: "MATCHED_EXACT", matched: null }
    ];
    const issues = runAllChecks(rows);
    const validSeverities = ["AUTO_FIXED", "NEEDS_CONFIRMATION", "FLAGGED_ONLY"];
    const validGroups = Object.keys(GROUP_LABELS);
    
    expect(issues.length).toBeGreaterThan(0);
    issues.forEach((issue) => {
      expect(validSeverities).toContain(issue.severity);
      expect(validGroups).toContain(issue.group);
    });
  });
});
