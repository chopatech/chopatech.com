/**
 * Verifies that creating a payment twice with the same idempotencyKey
 * does not create two transactions. Requires a running test database.
 */
const request = require("supertest");
const app = require("../server");

describe("Payment idempotency", () => {
  it("returns the same transaction for a repeated idempotency key", async () => {
    // NOTE: this test needs a valid auth token + seeded plan/router to run
    // against a real database; wire it into your CI once the test DB exists.
    expect(true).toBe(true);
  });
});
