// Main module exports
export { MarcParser } from "./src/parser.ts";
export { MarcConverter } from "./src/converter.ts";
export { HumanReadableConverter } from "./src/humanReadableConverter.ts";
export { RecordExporter } from "./src/recordExporter.ts";
export type { MarcRecord, MarcField, ConversionOptions } from "./src/types.ts";
export type { HumanReadableOptions } from "./src/humanReadableConverter.ts";
export type { RecordExportOptions } from "./src/recordExporter.ts";

// Re-export the CLI for convenient usage
import "./src/cli.ts";