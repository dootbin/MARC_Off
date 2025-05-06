/**
 * MARC_Off - Bidirectional MARC/JSON conversion library
 * 
 * This module exports all components needed to convert MARC files to JSON and back.
 */

// Version information
export { VERSION } from "./version.ts";

// Core functionality exports
export { MarcParser } from "./src/parser.ts";
export { MarcConverter } from "./src/converter.ts";
export { HumanReadableConverter } from "./src/humanReadableConverter.ts";
export { RecordExporter } from "./src/recordExporter.ts";
export { JsonToMarcConverter } from "./src/jsonToMarcConverter.ts";

// Type exports
export type { MarcRecord, MarcField, ConversionOptions } from "./src/types.ts";
export type { HumanReadableOptions } from "./src/humanReadableConverter.ts";
export type { RecordExportOptions } from "./src/recordExporter.ts";
export type { JsonToMarcOptions } from "./src/jsonToMarcConverter.ts";