/**
 * Test script for round-trip conversion (MARC → JSON → MARC)
 * 
 * This script:
 * 1. Takes an input MARC file
 * 2. Converts it to individual JSON files
 * 3. Converts those JSON files back to a MARC file
 * 4. Compares the original and reconstructed MARC files
 * 
 * Run with: deno run --allow-read --allow-write test_round_trip.ts input.marc
 */

import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { ensureDir } from "https://deno.land/std@0.181.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.181.0/path/mod.ts";
import { MarcParser } from "../src/parser.ts";
import { HumanReadableConverter } from "../src/humanReadableConverter.ts";
import { RecordExporter } from "../src/recordExporter.ts";
import { JsonToMarcConverter } from "../src/jsonToMarcConverter.ts";
import * as crypto from "https://deno.land/std@0.181.0/crypto/mod.ts";

// Parse command line arguments
const args = parse(Deno.args, {
  boolean: ["verbose", "skip-hash-check", "help"],
  string: ["temp-dir"],
  alias: {
    v: "verbose",
    t: "temp-dir",
    s: "skip-hash-check",
    h: "help"
  },
  default: {
    "temp-dir": "./tmp_test",
    "verbose": false,
    "skip-hash-check": true
  }
});

// Show help text
if (args.help) {
  console.log(`
MARC_Off Round-Trip Test

USAGE:
  deno run --allow-read --allow-write test_round_trip.ts [OPTIONS] <input-marc-file>

ARGUMENTS:
  <input-marc-file>    Input MARC file for testing

OPTIONS:
  -t, --temp-dir <dir> Directory for temporary JSON files (default: ./tmp_test)
  -v, --verbose        Show detailed progress information
  -s, --skip-hash-check Skip exact hash comparison (only check record count)
  -h, --help           Show this help message
  `);
  Deno.exit(0);
}

// Get input file path
const inputFile = args._[0] as string;
if (!inputFile) {
  console.error("Error: Input MARC file path is required");
  Deno.exit(1);
}

// Configure temp directory and output MARC file
const tempDir = args["temp-dir"];
const outputMarcFile = join(tempDir, "output.marc");

/**
 * Create a SHA-256 hash of a file
 * @param filePath Path to file
 * @returns Hex string of hash
 */
async function hashFile(filePath: string): Promise<string> {
  const fileData = await Deno.readFile(filePath);
  
  // Use Deno's native crypto API
  const hashBuffer = await crypto.subtle.digest("SHA-256", fileData.buffer);
  
  // Convert hash to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compare MARC records for content (ignoring ordering differences)
 * @param records1 First set of records
 * @param records2 Second set of records
 * @returns Object with comparison results
 */
function compareRecordContents(records1: any[], records2: any[]): {
  recordsMatch: boolean;
  totalFields1: number;
  totalFields2: number;
  fieldCountDiff: number;
  recordsWithFieldCountMismatch: number;
  detailedMismatches: string[];
} {
  // Sort both sets of records by control number for comparison
  const sortedRecords1 = [...records1].sort((a, b) => {
    const aControl = getControlNumber(a);
    const bControl = getControlNumber(b);
    return aControl.localeCompare(bControl);
  });
  
  const sortedRecords2 = [...records2].sort((a, b) => {
    const aControl = getControlNumber(a);
    const bControl = getControlNumber(b);
    return aControl.localeCompare(bControl);
  });
  
  let totalFields1 = 0;
  let totalFields2 = 0;
  let recordsWithFieldCountMismatch = 0;
  const detailedMismatches: string[] = [];
  
  // Helper to get control number from a record
  function getControlNumber(record: any): string {
    if (record.fields) {
      const controlField = record.fields.find((f: any) => f.tag === "001");
      if (controlField && controlField.value) {
        return controlField.value;
      }
    }
    return "";
  }
  
  // Compare records
  for (let i = 0; i < Math.min(sortedRecords1.length, sortedRecords2.length); i++) {
    const record1 = sortedRecords1[i];
    const record2 = sortedRecords2[i];
    
    // Count fields
    const fields1 = record1.fields || [];
    const fields2 = record2.fields || [];
    totalFields1 += fields1.length;
    totalFields2 += fields2.length;
    
    // Check if field counts match
    if (fields1.length !== fields2.length) {
      recordsWithFieldCountMismatch++;
      
      // Add detailed info for the first few mismatches
      if (detailedMismatches.length < 5) {
        const controlNum = getControlNumber(record1);
        detailedMismatches.push(
          `Record ${controlNum || i}: field count mismatch (${fields1.length} vs ${fields2.length})`
        );
      }
    }
  }
  
  return {
    recordsMatch: recordsWithFieldCountMismatch === 0 && 
                 sortedRecords1.length === sortedRecords2.length,
    totalFields1,
    totalFields2,
    fieldCountDiff: totalFields2 - totalFields1,
    recordsWithFieldCountMismatch,
    detailedMismatches
  };
}

/**
 * Main test function
 */
async function main() {
  console.log("Starting round-trip conversion test...");
  
  try {
    // Step 1: Ensure temp directory exists
    await ensureDir(tempDir);
    console.log(`Created temporary directory: ${tempDir}`);
    
    // Step 2: Read original MARC file
    console.log(`Reading input MARC file: ${inputFile}`);
    const originalData = await Deno.readFile(inputFile);
    console.log(`Read ${originalData.length} bytes`);
    
    // Step 3: Parse MARC records
    const records = MarcParser.parse(originalData);
    console.log(`Parsed ${records.length} MARC records`);
    
    // Step 4: Export records to JSON files
    console.log(`Exporting to individual JSON files in ${tempDir}...`);
    const exportResult = await RecordExporter.exportRecords(records, {
      outputDir: tempDir,
      parseFixedFields: true,
      simplifyArrays: true
    });
    
    console.log(`Exported ${exportResult.total} records to JSON files`);
    console.log(`ISBN-13: ${exportResult.idTypes.isbn13}, ISBN-10: ${exportResult.idTypes.isbn10}, Other: ${exportResult.idTypes.control + exportResult.idTypes.hash + exportResult.idTypes.index}`);
    
    // Step 5: Convert JSON files back to MARC
    console.log("Converting JSON files back to MARC format...");
    const converter = new JsonToMarcConverter({
      verbose: args.verbose,
      sortByControlNumber: true,
      preserveFieldOrder: true
    });
    
    const newMarcData = await converter.convertDirectory(tempDir);
    
    // Step 6: Write reconstructed MARC file
    console.log(`Writing reconstructed MARC file to: ${outputMarcFile}`);
    await Deno.writeFile(outputMarcFile, newMarcData);
    
    // Step 7: Parse the reconstructed MARC file to verify
    console.log("Verifying reconstructed MARC file...");
    const newRecords = MarcParser.parse(newMarcData);
    console.log(`Found ${newRecords.length} records in reconstructed file`);
    
    // Step 8: Compare record counts and do content comparison
    if (records.length === newRecords.length) {
      console.log(`✅ Record counts match (${records.length} records)`);
      
      // Compare content ignoring order
      const contentComparison = compareRecordContents(records, newRecords);
      console.log(`Total fields in original: ${contentComparison.totalFields1}`);
      console.log(`Total fields in reconstructed: ${contentComparison.totalFields2}`);
      console.log(`Field count difference: ${contentComparison.fieldCountDiff}`);
      console.log(`Records with field count mismatch: ${contentComparison.recordsWithFieldCountMismatch} / ${records.length}`);
      
      if (contentComparison.detailedMismatches.length > 0) {
        console.log("Sample mismatches:");
        contentComparison.detailedMismatches.forEach(msg => console.log(`- ${msg}`));
      }
      
      if (contentComparison.recordsMatch) {
        console.log("✅ All records match in field count!");
      } else {
        console.log("⚠️ Some records have field count differences");
      }
    } else {
      console.error(`❌ Record counts differ! Original: ${records.length}, New: ${newRecords.length}`);
    }
    
    // Step 9: Compare file hashes if requested
    if (!args["skip-hash-check"]) {
      console.log("Comparing file hashes...");
      const originalHash = await hashFile(inputFile);
      const newHash = await hashFile(outputMarcFile);
      
      console.log(`Original hash: ${originalHash}`);
      console.log(`New hash:      ${newHash}`);
      
      if (originalHash === newHash) {
        console.log("✅ Hashes match! Perfect round-trip conversion.");
      } else {
        console.log("⚠️ Hashes do not match");
        console.log("  This can be due to differences in formatting, field ordering, whitespace, etc.");
      }
    }
    
    // Output file sizes
    const originalSize = originalData.length;
    const newSize = newMarcData.length;
    console.log(`Original file size: ${originalSize} bytes`);
    console.log(`New file size: ${newSize} bytes`);
    console.log(`Size difference: ${((newSize - originalSize) / originalSize * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error(`Error during round-trip test: ${error.message}`);
    console.error(error.stack);
    Deno.exit(1);
  }
}

// Execute the main function
main();