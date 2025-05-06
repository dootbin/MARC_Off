/**
 * MARC_Off CLI Tools
 * 
 * This module serves as an entry point for all CLI tools.
 * It provides convenient access to run the tools directly with Deno.
 */

import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { VERSION } from "../mod.ts";

// Parse command line arguments
const args = parse(Deno.args, {
  boolean: ["help", "version"],
  alias: {
    h: "help",
    v: "version",
  },
});

// Display version information
if (args.version) {
  console.log(`MARC_Off v${VERSION} - Bidirectional MARC/JSON conversion tool`);
  Deno.exit(0);
}

// Display help message
if (args.help || args._.length === 0) {
  console.log(`
MARC_Off CLI Tools

USAGE:
  deno run --allow-read --allow-write cli/index.ts <command> [args]

COMMANDS:
  marc-to-json    Convert MARC files to JSON format
  json-to-marc    Convert JSON files back to MARC format
  test            Run round-trip conversion test
  verify          Verify a MARC file

OPTIONS:
  -h, --help      Show this help message
  -v, --version   Show version information

Run with a specific command to see command-specific help.
Example: deno run --allow-read --allow-write cli/index.ts marc-to-json --help
  `);
  Deno.exit(0);
}

// Get the command to run
const command = String(args._[0]);

// Remove the command from args
args._.shift();

// Execute the appropriate command
switch (command) {
  case "marc-to-json":
    await import("./marc_to_json.ts");
    break;
  case "json-to-marc":
    await import("./json_to_marc.ts");
    break;
  case "test":
    await import("./test_round_trip.ts");
    break;
  case "verify":
    await import("./verify_marc.ts");
    break;
  default:
    console.error(`Error: Unknown command '${command}'`);
    console.error("Run with --help to see available commands");
    Deno.exit(1);
}