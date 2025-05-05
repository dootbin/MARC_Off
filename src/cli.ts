import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { MarcParser } from "./parser.ts";
import { MarcConverter } from "./converter.ts";
import { HumanReadableConverter, HumanReadableOptions } from "./humanReadableConverter.ts";
import { RecordExporter } from "./recordExporter.ts";
import { ConversionOptions } from "./types.ts";

// Parse command line arguments
const args = parse(Deno.args, {
  boolean: [
    "include-leader", 
    "flatten-subfields", 
    "help",
    "single-file",
    "no-human-readable",
    "no-fixed-fields",
    "no-simplify"
  ],
  string: ["output", "o", "output-dir"],
  alias: {
    o: "output",
    h: "help",
    d: "output-dir"
  }
});

// Show help text
if (args.help) {
  console.log(`
MARC_Off - A MARC to JSON Converter

USAGE:
  marc_off [OPTIONS] <input-file>

OUTPUT MODES:
  --output-dir <dir>    Directory to output individual JSON files (default mode)
  --single-file         Output all records as a single JSON array (use with -o)
  -o, --output <file>   Output file for single file mode (defaults to stdout)

TRANSFORMATION OPTIONS:
  --no-human-readable   Disable human-readable field names (not recommended)
  --no-fixed-fields     Disable parsing of fixed-length fields
  --no-simplify         Disable simplification of single-value arrays
  --include-leader      Include the MARC leader in JSON output
  --flatten-subfields   Flatten subfields to a simple object instead of array

INFO OPTIONS:
  -h, --help            Show this help message
  `);
  Deno.exit(0);
}

// Get input file path
const inputPath = args._[0];
if (!inputPath || typeof inputPath !== "string") {
  console.error("Error: Input file path is required");
  Deno.exit(1);
}

// Default to split records mode unless single-file flag is provided
const singleFileMode = args["single-file"];

// Check if output directory is provided when in split mode
if (!singleFileMode && !args["output-dir"]) {
  console.error("Error: --output-dir is required for split records mode (default mode).");
  console.error("Use --single-file if you want to output to a single file or stdout instead.");
  Deno.exit(1);
}

// Configure conversion options with sensible defaults
const options: ConversionOptions & HumanReadableOptions = {
  includeLeader: args["include-leader"] || false,
  flattenSubfields: args["flatten-subfields"] || false,
  // Default to true for these options unless specifically disabled
  simplifyArrays: !args["no-simplify"],
  parseFixedFields: !args["no-fixed-fields"]
};

async function main() {
  try {
    console.log(`Reading file: ${inputPath}`);
    
    // Read input file
    const data = await Deno.readFile(inputPath);
    console.log(`Read ${data.length} bytes from input file`);
    
    // Parse MARC records
    const records = MarcParser.parse(data);
    console.log(`Parsed ${records.length} MARC records`);
    
    // Split records mode (default)
    if (!singleFileMode) {
      console.log(`Exporting records to individual files in ${args["output-dir"]}...`);
      
      const exportOptions = {
        outputDir: args["output-dir"],
        includeLeader: options.includeLeader,
        simplifyArrays: options.simplifyArrays,
        parseFixedFields: options.parseFixedFields
      };
      
      const result = await RecordExporter.exportRecords(records, exportOptions);
      console.log(`Successfully exported ${result.total} records to individual files`);
      console.log(`\nIdentifier statistics:`);
      console.log(`  ISBN-13: ${result.idTypes.isbn13} records`);
      console.log(`  ISBN-10: ${result.idTypes.isbn10} records`);
      console.log(`  Control numbers: ${result.idTypes.control} records`);
      console.log(`  Content hashes: ${result.idTypes.hash} records`);
      console.log(`  Index-based: ${result.idTypes.index} records`);
      return;
    }
    
    // Single file mode (old behavior)
    let jsonData;
    if (!args["no-human-readable"]) {
      const hrOptions = {
        includeLeader: options.includeLeader,
        simplifyArrays: options.simplifyArrays,
        parseFixedFields: options.parseFixedFields,
        flattenSubfields: options.flattenSubfields
      };
      
      jsonData = HumanReadableConverter.batchToJson(records, hrOptions);
      console.log(`Converted ${jsonData.length} records to human-readable JSON`);
    } else {
      const basicOptions = {
        includeLeader: options.includeLeader,
        flattenSubfields: options.flattenSubfields
      };
      
      jsonData = MarcConverter.batchToJson(records, basicOptions);
      console.log(`Converted ${jsonData.length} records to JSON`);
    }
    
    // Format JSON output
    const output = JSON.stringify(jsonData, null, 2);
    
    // Write to output file or stdout
    if (args.output || args.o) {
      const outputPath = args.output || args.o;
      console.log(`Writing to output file: ${outputPath}`);
      await Deno.writeTextFile(outputPath, output);
      console.log(`Converted data written to ${outputPath}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    Deno.exit(1);
  }
}

// Execute the main function
if (import.meta.main) {
  main();
}