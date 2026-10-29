import { Router } from "express";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePropRule, PropRuleSchema } from "../rules/schema.js";

export const rulesRouter = Router();
const rulesDir = join(fileURLToPath(new URL("../rules/", import.meta.url)));

function loadRuleFile(id: string): unknown | null {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return null;
  const path = join(rulesDir, `${id}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

rulesRouter.get("/", (_req, res) => {
  const files = readdirSync(rulesDir).filter((name) => name.endsWith(".json"));
  const rules = files.map((file) => {
    const id = file.slice(0, -5);
    const raw = loadRuleFile(id);
    const parsed = raw === null ? null : PropRuleSchema.safeParse(raw);
    return {
      id,
      validForLiveUse: parsed?.success ?? false,
      firm: raw && typeof raw === "object" && "firm" in raw ? (raw as { firm: unknown }).firm : null,
      program: raw && typeof raw === "object" && "program" in raw ? (raw as { program: unknown }).program : null,
      status: parsed?.success ? "verified-schema" : "unverified-or-invalid",
    };
  });
  res.json(rules);
});

rulesRouter.get("/:id", (req, res) => {
  const raw = loadRuleFile(req.params.id);
  if (!raw) return res.status(404).json({ error: "rule file not found" });
  const parsed = PropRuleSchema.safeParse(raw);
  res.json({
    rule: raw,
    validForLiveUse: parsed.success,
    validationErrors: parsed.success ? [] : parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
});
