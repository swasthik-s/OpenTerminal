import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { rulesRouter } from "./rules.js";

describe("rules endpoints", () => {
  let server: Server | undefined;
  afterEach(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  });

  async function request(path: string): Promise<{ status: number; body: any }> {
    const app = express().use("/api/rules", rulesRouter);
    server = createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    return { status: response.status, body: await response.json() };
  }

  it("lists rule files but labels VERIFY placeholders unusable", async () => {
    const result = await request("/api/rules");
    expect(result.status).toBe(200);
    expect(result.body.length).toBeGreaterThanOrEqual(2);
    expect(result.body.every((rule: any) => rule.validForLiveUse === false)).toBe(true);
  });

  it("returns schema issues for an unverified rule and rejects traversal", async () => {
    const result = await request("/api/rules/ftmo-2step-100k");
    expect(result.status).toBe(200);
    expect(result.body.validForLiveUse).toBe(false);
    expect(result.body.validationErrors.length).toBeGreaterThan(0);

    const invalid = await request("/api/rules/%2e%2e");
    expect(invalid.status).toBe(404);
  });
});
