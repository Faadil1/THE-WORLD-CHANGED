/**
 * Live receipt writer. The ONLY filesystem-writing code in the live path.
 * Writes are confined to a single bounded directory; no overwrite; no path traversal;
 * test-double runs can never land in evidence/runs/live.
 */
import { closeSync, lstatSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLiveReceipt, type LiveReceipt } from "./receipt";

export const LIVE_RECEIPT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "evidence", "runs", "live");

export function receiptFileName(r: LiveReceipt): string {
  const ts = r.started_at.replace(/[:.]/g, "-");
  return `${ts}.${r.seed}.${r.outcome}.json`.replace(/[^A-Za-z0-9._-]/g, "_");
}

/** Resolve `name` inside `baseDir`, refusing anything that would land elsewhere. */
export function boundedPath(baseDir: string, name: string): string {
  if (typeof name !== "string" || !/^[A-Za-z0-9._-]{1,200}$/.test(name) || name.startsWith(".")) {
    throw new Error(`refused receipt file name: ${JSON.stringify(name)}`);
  }
  const base = resolve(baseDir);
  const target = resolve(base, name);
  const rel = relative(base, target);
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || rel.includes(sep)) {
    throw new Error(`refused path outside receipt directory: ${name}`);
  }
  return target;
}

export function writeLiveReceipt(receipt: LiveReceipt, baseDir: string = LIVE_RECEIPT_DIR): string {
  const v = validateLiveReceipt(receipt);
  if (!v.ok) throw new Error(`invalid live receipt: ${v.reason}`);
  const base = resolve(baseDir);
  if (base === LIVE_RECEIPT_DIR && receipt.transport !== "anthropic-api") {
    throw new Error("refused: only real anthropic-api runs may be written to evidence/runs/live");
  }
  mkdirSync(base, { recursive: true });
  if (lstatSync(base).isSymbolicLink()) throw new Error("refused: receipt directory is a symlink");
  const path = boundedPath(base, receiptFileName(receipt));
  const fd = openSync(path, "wx"); // fails if the file exists: receipts are never overwritten
  try {
    writeSync(fd, JSON.stringify(receipt, null, 2) + "\n");
  } finally {
    closeSync(fd);
  }
  return path;
}

