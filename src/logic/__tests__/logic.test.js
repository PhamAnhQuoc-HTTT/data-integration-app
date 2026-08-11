import { describe, it, expect } from "vitest";
import { normalizeNumber, normalizeDate, normalizeIdCode, normalizeTextForMatching } from "../normalize";
import { detectFields, buildRows } from "../fieldMapping";
import { resolveEntities, tokenSortRatio } from "../entityResolution";
import { runAllChecks, checkDuplicates } from "../qualityRules";

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

  it("every issue produced by runAllChecks has a valid severity level", () => {
    const rows = [
      { ma_don: "DH1", __source: "pos", so_luong: "", gia: "1000", ten_sp: "A", matchStatus: "MATCHED_EXACT", matched: null },
    ];
    const issues = runAllChecks(rows);
    const validSeverities = ["AUTO_FIXED", "NEEDS_CONFIRMATION", "FLAGGED_ONLY"];
    issues.forEach((issue) => expect(validSeverities).toContain(issue.severity));
  });
});
