/**
 * Command-line script for converting JSON files back to MARC format.
 * 
 * This is the inverse operation of convert.ts, which takes a MARC file and outputs JSON.
 * This script takes a directory of JSON files and outputs a single MARC file.
 * 
 * Run with: deno run --allow-read --allow-write json_to_marc.ts input-dir output.marc
 */

import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { JsonToMarcConverter } from "../src/jsonToMarcConverter.ts";
import { dirname } from "https://deno.land/std@0.181.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.181.0/fs/ensure_dir.ts";

// Parse command-line arguments
const args = parse(Deno.args, {
  boolean: ["help", "verbose"],
  alias: {
    h: "help",
    v: "verbose",
    o: "output"
  },
  string: ["output"]
});

// Show help text
if (args.help) {
  console.log(`
MARC_Off JSON to MARC Converter

USAGE:
  deno run --allow-read --allow-write json_to_marc.ts [OPTIONS] <input-dir> [output-file]

ARGUMENTS:
  <input-dir>         Directory containing JSON files to convert
  [output-file]       Output MARC file (defaults to output.marc)

OPTIONS:
  -o, --output <file> Output file path (alternative to positional argument)
  -v, --verbose       Display verbose progress information
  -h, --help          Show this help message

DESCRIPTION:
  Reads all JSON files from the input directory and converts them back to MARC format.
  This is the inverse operation of the marc-to-json converter.
  `);
  Deno.exit(0);
}

// Get input directory
const inputDir = args._[0] as string;
if (!inputDir) {
  console.error("Error: Input directory path is required");
  Deno.exit(1);
}

// Get output file path
const outputPath = args.output || args._[1] as string || "output.marc";

async function main() {
  try {
    console.log(`Reading JSON files from: ${inputDir}`);
    
    // Ensure output directory exists
    await ensureDir(dirname(outputPath));
    
    // Initialize converter
    const converter = new JsonToMarcConverter({
      verbose: args.verbose,
      preserveFieldOrder: true,
      sortByControlNumber: true
    });
    
    // Convert directory of JSON files to MARC
    console.log("Converting JSON files to MARC format...");
    const marcData = await converter.convertDirectory(inputDir);
    
    console.log(`Converted data is ${marcData.length} bytes`);
    
    // Write to output file
    console.log(`Writing MARC data to: ${outputPath}`);
    await Deno.writeFile(outputPath, marcData);
    
    console.log(`Conversion complete. MARC data written to: ${outputPath}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    Deno.exit(1);
  }
}

// Run the main function
main();