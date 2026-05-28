import { invoke } from "@tauri-apps/api/core";
import type { ApplyResult, EvaluationResult } from "../types";

export async function validateRules(yaml: string): Promise<void> {
  return invoke("validate_rules", { yaml });
}

export async function previewRules(yaml: string): Promise<EvaluationResult> {
  return invoke("preview_rules", { yaml });
}

export async function applyRules(yaml: string): Promise<ApplyResult> {
  return invoke("apply_rules", { yaml });
}

export async function readTextFile(path: string): Promise<string> {
  return invoke("read_text_file", { path });
}

export async function writeTextFile(
  path: string,
  contents: string,
): Promise<void> {
  return invoke("write_text_file", { path, contents });
}
