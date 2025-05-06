/**
 * Detailed record-by-record comparison tool for MARC files
 * 
 * This script:
 * 1. Takes two MARC files (original and converted)
 * 2. Parses both files
 * 3. Matches records by control number
 * 4. Performs detailed field-by-field and subfield-by-subfield comparison
 * 5. Generates a comprehensive report of differences
 * 
 * Run with: deno run --allow-read --allow-write compare_records.ts original.marc converted.marc
 */

import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { ensureDir } from "https://deno.land/std@0.181.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.181.0/path/mod.ts";
import { MarcParser } from "../src/parser.ts";
import { MarcRecord, MarcField } from "../src/types.ts";

// Define interfaces for comparison results
interface FieldComparison {
  tag: string;
  inOriginal: boolean;
  inConverted: boolean;
  originalCount: number;
  convertedCount: number;
  subfieldDiffs?: SubfieldComparison[];
  valueComparison?: ValueComparison;
}

interface SubfieldComparison {
  code: string;
  inOriginal: boolean;
  inConverted: boolean;
  originalValue?: string;
  convertedValue?: string;
  isDifferent: boolean;
}

interface ValueComparison {
  original: string;
  converted: string;
  isDifferent: boolean;
}

interface RecordComparison {
  controlNumber: string;
  fieldsOnlyInOriginal: string[];
  fieldsOnlyInConverted: string[];
  fieldComparisons: FieldComparison[];
  leaderDiff?: ValueComparison;
  originalFieldCount: number;
  convertedFieldCount: number;
}

interface ComparisonSummary {
  recordCount: number;
  matchedRecordCount: number;
  unmatchedOriginalRecords: number;
  unmatchedConvertedRecords: number;
  totalFieldsOnlyInOriginal: number;
  totalFieldsOnlyInConverted: number;
  fieldTypesMissingInConverted: Record<string, number>;
  fieldTypesMissingInOriginal: Record<string, number>;
  recordComparisons: RecordComparison[];
}

// Parse command line arguments
const args = parse(Deno.args, {
  boolean: ["verbose", "help", "detailed"],
  string: ["output", "report-dir"],
  alias: {
    v: "verbose",
    h: "help",
    o: "output",
    d: "report-dir",
    t: "detailed"
  },
  default: {
    "verbose": false,
    "detailed": false,
    "report-dir": "./comparison_report"
  }
});

// Show help text
if (args.help) {
  console.log(`
MARC_Off Detailed Record Comparison

USAGE:
  deno run --allow-read --allow-write compare_records.ts [OPTIONS] <original-marc> <converted-marc>

ARGUMENTS:
  <original-marc>        Original MARC file
  <converted-marc>       Converted/reconstructed MARC file for comparison

OPTIONS:
  -o, --output <file>    Write summary report to file (default: stdout)
  -d, --report-dir <dir> Directory for detailed reports (default: ./comparison_report)
  -t, --detailed         Generate detailed reports for each record (large output)
  -v, --verbose          Show detailed progress information
  -h, --help             Show this help message
  `);
  Deno.exit(0);
}

// Get input file paths
const originalFile = args._[0] as string;
const convertedFile = args._[1] as string;

if (!originalFile || !convertedFile) {
  console.error("Error: Both original and converted MARC file paths are required");
  Deno.exit(1);
}

// Report options
const outputFile = args.output;
const reportDir = args["report-dir"];
const generateDetailedReports = args.detailed;

/**
 * Get control number from a MARC record
 * @param record MARC record
 * @returns Control number string or empty string if not found
 */
function getControlNumber(record: MarcRecord): string {
  const controlField = record.fields.find(f => f.tag === "001");
  if (controlField && controlField.value) {
    return controlField.value;
  }
  return "";
}

/**
 * Compare field values for control fields
 * @param originalField Original field
 * @param convertedField Converted field
 * @returns Comparison result
 */
function compareControlFieldValues(originalField: MarcField, convertedField: MarcField): ValueComparison {
  const originalValue = originalField.value || "";
  const convertedValue = convertedField.value || "";
  
  return {
    original: originalValue,
    converted: convertedValue,
    isDifferent: originalValue !== convertedValue
  };
}

/**
 * Compare subfields between two data fields
 * @param originalField Original field
 * @param convertedField Converted field
 * @returns Array of subfield comparisons
 */
function compareSubfields(originalField: MarcField, convertedField: MarcField): SubfieldComparison[] {
  const comparisons: SubfieldComparison[] = [];
  
  // Get all unique subfield codes
  const allCodes = new Set<string>();
  
  if (originalField.subfields) {
    Object.keys(originalField.subfields).forEach(code => allCodes.add(code));
  }
  
  if (convertedField.subfields) {
    Object.keys(convertedField.subfields).forEach(code => allCodes.add(code));
  }
  
  // Compare each subfield
  for (const code of allCodes) {
    const originalValue = originalField.subfields?.[code];
    const convertedValue = convertedField.subfields?.[code];
    
    comparisons.push({
      code,
      inOriginal: originalValue !== undefined,
      inConverted: convertedValue !== undefined,
      originalValue,
      convertedValue,
      isDifferent: originalValue !== convertedValue
    });
  }
  
  return comparisons;
}

/**
 * Compare two MARC records in detail
 * @param originalRecord Original record
 * @param convertedRecord Converted record
 * @returns Detailed comparison of the records
 */
function compareRecords(originalRecord: MarcRecord, convertedRecord: MarcRecord): RecordComparison {
  const controlNumber = getControlNumber(originalRecord) || getControlNumber(convertedRecord) || "unknown";
  
  // Compare leaders
  const leaderDiff = {
    original: originalRecord.leader,
    converted: convertedRecord.leader,
    isDifferent: originalRecord.leader !== convertedRecord.leader
  };
  
  // Get all unique field tags
  const allTags = new Set<string>();
  originalRecord.fields.forEach(field => allTags.add(field.tag));
  convertedRecord.fields.forEach(field => allTags.add(field.tag));
  
  // Count fields by tag
  const originalFieldCounts: Record<string, number> = {};
  const convertedFieldCounts: Record<string, number> = {};
  
  originalRecord.fields.forEach(field => {
    originalFieldCounts[field.tag] = (originalFieldCounts[field.tag] || 0) + 1;
  });
  
  convertedRecord.fields.forEach(field => {
    convertedFieldCounts[field.tag] = (convertedFieldCounts[field.tag] || 0) + 1;
  });
  
  const fieldsOnlyInOriginal: string[] = [];
  const fieldsOnlyInConverted: string[] = [];
  const fieldComparisons: FieldComparison[] = [];
  
  // Compare fields
  for (const tag of allTags) {
    const originalCount = originalFieldCounts[tag] || 0;
    const convertedCount = convertedFieldCounts[tag] || 0;
    
    // Check for tags only in one record
    if (originalCount > 0 && convertedCount === 0) {
      fieldsOnlyInOriginal.push(tag);
    }
    
    if (convertedCount > 0 && originalCount === 0) {
      fieldsOnlyInConverted.push(tag);
    }
    
    // Create the base comparison
    const comparison: FieldComparison = {
      tag,
      inOriginal: originalCount > 0,
      inConverted: convertedCount > 0,
      originalCount,
      convertedCount
    };
    
    // If field is in both, we can compare content
    if (originalCount > 0 && convertedCount > 0) {
      // For simplicity, we'll compare only the first instance of each field
      // For a more accurate comparison, we would need to match corresponding fields
      const originalField = originalRecord.fields.find(f => f.tag === tag);
      const convertedField = convertedRecord.fields.find(f => f.tag === tag);
      
      if (originalField && convertedField) {
        if (tag < "010") {
          // Control field
          comparison.valueComparison = compareControlFieldValues(originalField, convertedField);
        } else {
          // Data field - compare indicators and subfields
          if (originalField.indicator1 !== convertedField.indicator1 ||
              originalField.indicator2 !== convertedField.indicator2) {
            // Add indicator comparison if different
            comparison.valueComparison = {
              original: `Ind1: ${originalField.indicator1 || ' '}, Ind2: ${originalField.indicator2 || ' '}`,
              converted: `Ind1: ${convertedField.indicator1 || ' '}, Ind2: ${convertedField.indicator2 || ' '}`,
              isDifferent: true
            };
          }
          
          // Compare subfields
          comparison.subfieldDiffs = compareSubfields(originalField, convertedField);
        }
      }
    }
    
    fieldComparisons.push(comparison);
  }
  
  // Sort fieldComparisons by tag for readability
  fieldComparisons.sort((a, b) => a.tag.localeCompare(b.tag));
  
  return {
    controlNumber,
    fieldsOnlyInOriginal,
    fieldsOnlyInConverted,
    fieldComparisons,
    leaderDiff,
    originalFieldCount: originalRecord.fields.length,
    convertedFieldCount: convertedRecord.fields.length
  };
}

/**
 * Generate a detailed comparison report for a pair of records
 * @param comparison Record comparison result
 * @returns Formatted report as string
 */
function generateRecordReport(comparison: RecordComparison): string {
  let report = `Record Control Number: ${comparison.controlNumber}\n`;
  report += `Original Field Count: ${comparison.originalFieldCount}\n`;
  report += `Converted Field Count: ${comparison.convertedFieldCount}\n\n`;
  
  // Leader comparison
  if (comparison.leaderDiff?.isDifferent) {
    report += "LEADER DIFFERENCE:\n";
    report += `  Original: ${comparison.leaderDiff.original}\n`;
    report += `  Converted: ${comparison.leaderDiff.converted}\n\n`;
  }
  
  // Missing fields
  if (comparison.fieldsOnlyInOriginal.length > 0) {
    report += "FIELDS ONLY IN ORIGINAL:\n";
    comparison.fieldsOnlyInOriginal.forEach(tag => {
      report += `  ${tag}\n`;
    });
    report += "\n";
  }
  
  if (comparison.fieldsOnlyInConverted.length > 0) {
    report += "FIELDS ONLY IN CONVERTED:\n";
    comparison.fieldsOnlyInConverted.forEach(tag => {
      report += `  ${tag}\n`;
    });
    report += "\n";
  }
  
  // Detailed field comparisons
  report += "FIELD COMPARISONS:\n";
  for (const field of comparison.fieldComparisons) {
    // Skip fields that match perfectly
    const hasValueDiff = field.valueComparison?.isDifferent;
    const hasSubfieldDiffs = field.subfieldDiffs?.some(s => s.isDifferent || !s.inOriginal || !s.inConverted);
    const countDiff = field.originalCount !== field.convertedCount;
    
    if (!hasValueDiff && !hasSubfieldDiffs && !countDiff) {
      continue; // Skip fields with no differences
    }
    
    report += `  Field ${field.tag}:\n`;
    
    if (countDiff) {
      report += `    Count in Original: ${field.originalCount}\n`;
      report += `    Count in Converted: ${field.convertedCount}\n`;
    }
    
    if (hasValueDiff && field.valueComparison) {
      report += `    Original Value: ${field.valueComparison.original}\n`;
      report += `    Converted Value: ${field.valueComparison.converted}\n`;
    }
    
    if (hasSubfieldDiffs && field.subfieldDiffs) {
      report += "    Subfield Differences:\n";
      field.subfieldDiffs.forEach(sf => {
        // Skip subfields that are identical
        if (!sf.isDifferent && sf.inOriginal && sf.inConverted) {
          return;
        }
        
        report += `      Subfield ${sf.code}:\n`;
        if (!sf.inOriginal) {
          report += `        Only in converted: ${sf.convertedValue}\n`;
        } else if (!sf.inConverted) {
          report += `        Only in original: ${sf.originalValue}\n`;
        } else if (sf.isDifferent) {
          report += `        Original: ${sf.originalValue}\n`;
          report += `        Converted: ${sf.convertedValue}\n`;
        }
      });
    }
    
    report += "\n";
  }
  
  return report;
}

/**
 * Generate an aggregate summary of all record comparisons
 * @param summary Comparison summary
 * @returns Formatted summary report
 */
function generateSummaryReport(summary: ComparisonSummary): string {
  let report = "MARC RECORD COMPARISON SUMMARY\n";
  report += "==============================\n\n";
  
  report += `Total Records Analyzed: ${summary.recordCount}\n`;
  report += `Matched Record Count: ${summary.matchedRecordCount}\n`;
  report += `Unmatched Records in Original: ${summary.unmatchedOriginalRecords}\n`;
  report += `Unmatched Records in Converted: ${summary.unmatchedConvertedRecords}\n\n`;
  
  report += `Total Missing Fields in Converted: ${summary.totalFieldsOnlyInOriginal}\n`;
  report += `Total Extra Fields in Converted: ${summary.totalFieldsOnlyInConverted}\n\n`;
  
  // Field types missing from converted
  report += "FIELDS MISSING IN CONVERTED:\n";
  for (const [tag, count] of Object.entries(summary.fieldTypesMissingInConverted).sort()) {
    report += `  ${tag}: ${count} occurrences\n`;
  }
  report += "\n";
  
  // Field types missing from original
  report += "FIELDS ADDED IN CONVERTED:\n";
  for (const [tag, count] of Object.entries(summary.fieldTypesMissingInOriginal).sort()) {
    report += `  ${tag}: ${count} occurrences\n`;
  }
  report += "\n";
  
  // Sample of problematic records
  report += "SAMPLE PROBLEMATIC RECORDS:\n";
  const problemRecords = summary.recordComparisons
    .filter(rec => rec.fieldsOnlyInOriginal.length > 0 || rec.fieldsOnlyInConverted.length > 0)
    .slice(0, 10); // Take first 10 records with issues
  
  problemRecords.forEach(rec => {
    report += `  Record ${rec.controlNumber}:\n`;
    if (rec.fieldsOnlyInOriginal.length > 0) {
      report += `    Missing fields: ${rec.fieldsOnlyInOriginal.join(", ")}\n`;
    }
    if (rec.fieldsOnlyInConverted.length > 0) {
      report += `    Added fields: ${rec.fieldsOnlyInConverted.join(", ")}\n`;
    }
  });
  
  return report;
}

/**
 * Main function to compare two MARC files
 */
async function main() {
  console.log("Starting detailed record comparison...");
  
  try {
    // Step 1: Read and parse both MARC files
    console.log(`Reading original MARC file: ${originalFile}`);
    const originalData = await Deno.readFile(originalFile);
    const originalRecords = MarcParser.parse(originalData);
    console.log(`Parsed ${originalRecords.length} records from original file`);
    
    console.log(`Reading converted MARC file: ${convertedFile}`);
    const convertedData = await Deno.readFile(convertedFile);
    const convertedRecords = MarcParser.parse(convertedData);
    console.log(`Parsed ${convertedRecords.length} records from converted file`);
    
    // Step 2: Create maps for easier record lookup by control number
    const originalMap = new Map<string, MarcRecord>();
    const convertedMap = new Map<string, MarcRecord>();
    
    // Create maps keyed by control number
    originalRecords.forEach(record => {
      const controlNumber = getControlNumber(record);
      if (controlNumber) {
        originalMap.set(controlNumber, record);
      }
    });
    
    convertedRecords.forEach(record => {
      const controlNumber = getControlNumber(record);
      if (controlNumber) {
        convertedMap.set(controlNumber, record);
      }
    });
    
    console.log(`Found ${originalMap.size} records with control numbers in original file`);
    console.log(`Found ${convertedMap.size} records with control numbers in converted file`);
    
    // Step 3: Perform detailed record-by-record comparison
    console.log("Performing detailed record comparison...");
    
    const recordComparisons: RecordComparison[] = [];
    let matchedCount = 0;
    let progress = 0;
    
    // Get all unique control numbers
    const allControlNumbers = new Set<string>([
      ...originalMap.keys(),
      ...convertedMap.keys()
    ]);
    
    // Create report directory if needed
    if (generateDetailedReports) {
      await ensureDir(reportDir);
      console.log(`Created report directory: ${reportDir}`);
    }
    
    // Compare each record
    for (const controlNumber of allControlNumbers) {
      const originalRecord = originalMap.get(controlNumber);
      const convertedRecord = convertedMap.get(controlNumber);
      
      // Only compare records that exist in both files
      if (originalRecord && convertedRecord) {
        matchedCount++;
        const comparison = compareRecords(originalRecord, convertedRecord);
        recordComparisons.push(comparison);
        
        // Generate detailed report for this record if requested
        if (generateDetailedReports) {
          const reportPath = join(reportDir, `record_${controlNumber}.txt`);
          const detailedReport = generateRecordReport(comparison);
          await Deno.writeTextFile(reportPath, detailedReport);
        }
      }
      
      // Update progress for long-running operations
      progress++;
      if (args.verbose && progress % 100 === 0) {
        console.log(`Processed ${progress} of ${allControlNumbers.size} records...`);
      }
    }
    
    console.log(`Compared ${matchedCount} records that exist in both files`);
    
    // Step 4: Generate summary statistics
    console.log("Generating summary statistics...");
    
    // Count fields only in original and only in converted
    let totalFieldsOnlyInOriginal = 0;
    let totalFieldsOnlyInConverted = 0;
    const fieldTypesMissingInConverted: Record<string, number> = {};
    const fieldTypesMissingInOriginal: Record<string, number> = {};
    
    recordComparisons.forEach(comparison => {
      // Count missing fields
      totalFieldsOnlyInOriginal += comparison.fieldsOnlyInOriginal.length;
      totalFieldsOnlyInConverted += comparison.fieldsOnlyInConverted.length;
      
      // Track which field types are missing
      comparison.fieldsOnlyInOriginal.forEach(tag => {
        fieldTypesMissingInConverted[tag] = (fieldTypesMissingInConverted[tag] || 0) + 1;
      });
      
      comparison.fieldsOnlyInConverted.forEach(tag => {
        fieldTypesMissingInOriginal[tag] = (fieldTypesMissingInOriginal[tag] || 0) + 1;
      });
    });
    
    // Create summary object
    const summary: ComparisonSummary = {
      recordCount: allControlNumbers.size,
      matchedRecordCount: matchedCount,
      unmatchedOriginalRecords: originalMap.size - matchedCount,
      unmatchedConvertedRecords: convertedMap.size - matchedCount,
      totalFieldsOnlyInOriginal,
      totalFieldsOnlyInConverted,
      fieldTypesMissingInConverted,
      fieldTypesMissingInOriginal,
      recordComparisons
    };
    
    // Step 5: Generate and output the summary report
    const summaryReport = generateSummaryReport(summary);
    
    if (outputFile) {
      console.log(`Writing summary report to: ${outputFile}`);
      await Deno.writeTextFile(outputFile, summaryReport);
    } else {
      console.log("\n" + summaryReport);
    }
    
    // Final summary
    console.log(`Comparison complete.`);
    if (generateDetailedReports) {
      console.log(`Detailed reports written to ${reportDir} directory.`);
    }
    
  } catch (error) {
    console.error(`Error during comparison: ${error.message}`);
    console.error(error.stack);
    Deno.exit(1);
  }
}

// Execute the main function
main();