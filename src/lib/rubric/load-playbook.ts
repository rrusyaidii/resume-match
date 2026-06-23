import "server-only";

import { readFileSync } from "fs";
import { join } from "path";

let cachedPlaybook: string | null = null;

const PLAYBOOK_PATH = join(process.cwd(), "src/lib/rubric/recruiter-playbook.md");

export function loadRecruiterPlaybook(): string {
  if (cachedPlaybook !== null) {
    return cachedPlaybook;
  }

  try {
    cachedPlaybook = readFileSync(PLAYBOOK_PATH, "utf-8").trim();
  } catch {
    cachedPlaybook = "";
  }

  return cachedPlaybook;
}
