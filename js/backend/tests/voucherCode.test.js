const { generateCode, generateUniqueCodes } = require("../src/utils/voucherCode");

describe("voucher code generator", () => {
  it("generates codes of the requested length", () => {
    const code = generateCode(8, "CHOPA");
    expect(code.startsWith("CHOPA-")).toBe(true);
    expect(code.replace("CHOPA-", "")).toHaveLength(8);
  });

  it("never repeats a code within one unique batch", () => {
    const codes = generateUniqueCodes(500, 6, "TEST");
    expect(new Set(codes).size).toBe(500);
  });

  it("avoids ambiguous characters (0/O, 1/I/L)", () => {
    const codes = generateUniqueCodes(200, 8, "TEST");
    const joined = codes.join("");
    expect(/[0OIL1]/.test(joined)).toBe(false);
  });
});
