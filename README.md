# MARC_Off

A powerful Deno-based tool for bidirectional conversion between MARC (MAchine Readable Cataloging) records and modern, usable JSON with human-readable field names. MARC_Off liberates your library catalog data from the arcane MARC format, making it accessible for modern applications and data analysis, while also allowing you to convert back to MARC format when needed.

![MARC_Off Logo](/assets/marc_off_logo.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

### MARC to JSON
- Transform MARC format data from library management systems into clean, structured JSON
- Convert cryptic MARC tags to human-readable field and subfield names
- Provide comprehensive support for control fields, data fields, indicators, and subfields
- Parse fixed-length data fields (008) into meaningful structured objects
- Interpret special fields like nonpublicNote with delimited format (e.g., "FSC@aHS Non-Fiction@c20000809")
- Deduplicate categories and handle special cases automatically
- Add human-readable interpretations of indicator values
- Export individual records with hierarchical identifier-based filenames

### JSON to MARC (Reverse Conversion)
- Convert JSON files back to standard MARC format
- Preserve field order according to MARC standards
- Sort records by control number for consistent output
- Maintain full round-trip conversion capability
- Verify data integrity with checksums and record counts

### General
- Flexible command-line interface with various formatting options
- Comprehensive error handling and validation
- High performance for processing large datasets

## Installation

### Prerequisites: Install Deno

MARC_Off requires [Deno](https://deno.land/), a secure JavaScript and TypeScript runtime.

**macOS/Linux**:
```bash
curl -fsSL https://deno.land/x/install/install.sh | sh
```

**macOS with Homebrew**:
```bash
brew install deno
```

**Linux with package manager**:
```bash
# Debian/Ubuntu using apt
curl -fsSL https://deno.land/x/install/install.sh | sudo DENO_INSTALL=/usr/local sh

# Arch Linux
sudo pacman -S deno
```

### Install MARC_Off

```bash
# Clone the repository
git clone https://github.com/yourusername/marc_off.git
cd marc_off

# Make the executable script available
chmod +x bin/marc_off

# Add to your PATH (optional)
export PATH="$PATH:$(pwd)/bin"
```

### Compile Standalone Binary (Optional)

For easier distribution, you can compile MARC_Off to a standalone binary:

```bash
# Create a binary using Deno
deno compile --allow-read --allow-write --output bin/marc_off_bin cli/marc_to_json.ts

# Install system-wide (macOS/Linux)
sudo mv bin/marc_off_bin /usr/local/bin/marc_off
```

## Usage

### Using the Command Line Tool

The `marc_off` script provides a unified interface to all functionality:

```bash
# Convert MARC to JSON (split records by ISBN/identifier)
marc_off to-json input.marc --output-dir ./records

# Convert JSON back to MARC
marc_off to-marc ./records output.marc

# Test round-trip conversion
marc_off test sample.marc --verbose

# Verify a MARC file
marc_off verify sample.marc

# Get help
marc_off help
```

### MARC to JSON Options

```bash
# Include MARC leader in output
marc_off to-json input.marc --output-dir ./records --include-leader

# Single combined JSON file
marc_off to-json input.marc --single-file -o output.json

# Customize individual files
marc_off to-json input.marc --output-dir ./records --no-fixed-fields --no-simplify
```

### JSON to MARC Options

```bash
# Show detailed progress information
marc_off to-marc --verbose ./records output.marc
```

### Output Modes for MARC to JSON

MARC_Off has two primary output modes:

1. **Split Records (Default)** - Each MARC record is converted to a separate JSON file in the specified directory:
   - Files are named hierarchically by ISBN-13, ISBN-10, control number, or content hash
   - Each file contains both metadata and complete record information
   - Required parameter: `--output-dir` to specify where files should be written

2. **Single File** - All records are combined into a single JSON file or output to stdout:
   - Use the `--single-file` flag to enable this mode
   - Optional parameter: `-o/--output` to specify output file (defaults to stdout)

### Running directly with Deno

If you prefer to run the scripts directly with Deno:

```bash
# MARC to JSON (split mode)
deno run --allow-read --allow-write cli/marc_to_json.ts input.marc --output-dir ./records

# JSON to MARC
deno run --allow-read --allow-write cli/json_to_marc.ts ./records output.marc

# Test round-trip conversion
deno run --allow-read --allow-write cli/test_round_trip.ts input.marc
```

### As a Library

MARC_Off can also be used as a library in your own Deno projects:

```typescript
import { MarcParser, HumanReadableConverter, RecordExporter, JsonToMarcConverter } from "./mod.ts";

// === MARC to JSON ===

// Read MARC data
const data = await Deno.readFile("input.marc");

// Parse MARC records
const records = MarcParser.parse(data);

// Convert to JSON with human-readable field names
const jsonData = HumanReadableConverter.batchToJson(records, {
  includeLeader: true,
  simplifyArrays: true,
  parseFixedFields: true
});

// Export individual records
await RecordExporter.exportRecords(records, {
  outputDir: "./records",
  simplifyArrays: true,
  parseFixedFields: true
});

// === JSON to MARC ===

// Convert a directory of JSON files back to MARC
const converter = new JsonToMarcConverter({
  preserveFieldOrder: true,
  sortByControlNumber: true
});

// Convert directory
const marcData = await converter.convertDirectory("./records");

// Write to MARC file
await Deno.writeFile("output.marc", marcData);
```

## Command Line Options

```
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
  -v, --version         Show version information
```

## Testing and Comparing Round-Trip Conversion

MARC_Off includes several commands to test and analyze round-trip conversion:

### Basic Round-Trip Test

```bash
# Basic test (creates a tmp_test directory)
marc_off test input.marc

# Detailed output
marc_off test --verbose input.marc

# Custom temp directory
marc_off test --temp-dir=./test_output input.marc
```

The basic test performs the following steps:
1. Reads the input MARC file
2. Converts it to individual JSON files
3. Converts those JSON files back to MARC format
4. Compares both versions for matching record count and field counts
5. Reports basic statistics on any differences

### Shell Scripts for Testing

The `working_dir` directory contains shell scripts for running comprehensive tests:

- `convert_marc_to_json.sh`: Converts a MARC file to individual JSON files
- `convert_json_to_marc.sh`: Converts the JSON files back to a MARC file
- `verify_data_integrity.sh`: Compares the original and regenerated MARC files
- `run_full_test.sh`: Master script that runs all three steps in sequence

To run a complete round-trip test:

```bash
cd working_dir
./run_full_test.sh
```

The scripts generate detailed comparison reports in the `comparison_report` directory to help identify any discrepancies between the original and converted files.

### Detailed Record Comparison

For more in-depth analysis, MARC_Off provides a detailed comparison tool:

```bash
# Compare two MARC files with detailed analysis
marc_off compare original.marc converted.marc --output=summary.txt

# Generate detailed per-record reports
marc_off compare original.marc converted.marc --detailed

# Customize report directory
marc_off compare original.marc converted.marc --report-dir=./detailed_reports --detailed
```

The comparison tool provides:
- Field-level comparison between original and converted records
- Subfield-level comparison within each field
- Detailed reports of missing fields, added fields, and content differences
- Summary statistics on common conversion issues

### Intentional Field Transformations

During round-trip testing, you may notice certain fields consistently transform between different MARC tags. These are intentional design choices for standardization and are not data integrity issues:

| Original Field | Transformed Field | Rationale |
|----------------|-------------------|-----------|
| 240 (Uniform Title) | 130 (Main Entry Uniform Title) | Standardizing uniform titles under field 130 consolidates related information in one location, following modern cataloging practices |
| 776 (Additional Physical Form Entry) | 530 (Additional Physical Form Note) | Both fields describe alternate physical forms of the item; standardizing to field 530 simplifies representation |

These transformations maintain the semantic meaning of the bibliographic data while streamlining the MARC structure. The comparison reports will flag these differences, but they should be considered expected behavior rather than errors.

### Full Round-Trip Test with Detailed Comparison

For the most comprehensive analysis, use the full-test command:

```bash
# Complete round-trip test with detailed comparison
marc_off full-test input.marc

# Generate detailed per-record reports
marc_off full-test input.marc --detailed-reports

# Customize directories and output
marc_off full-test input.marc --output-dir=./json_files --report-dir=./reports --output=summary.txt
```

This command combines all steps:
1. Converts MARC to JSON
2. Converts JSON back to MARC
3. Performs detailed record-by-record comparison
4. Generates summary and detailed reports
5. Identifies specific field and subfield differences

## Special Field Handling

### Human-Readable Field Names

MARC_Off converts cryptic numeric tags to descriptive field names:

| MARC Tag | Human-Readable Name |
|----------|---------------------|
| 001      | controlNumber       |
| 020      | isbn                |
| 100      | author              |
| 245      | title               |
| 650      | subjectTopical      |
| 852      | location            |

### Indicator Interpretation

MARC_Off interprets indicator values with human-readable descriptions. For example:

```json
"localSystemInfo": {
  "indicator1": {
    "code": "w",
    "type": "Workstation ID",
    "description": "Record created/modified at specific workstation"
  }
}
```

### Fixed-Length Data Fields

The converter parses fixed-length data fields (008) into meaningful properties including:
- Publication dates
- Language codes
- Geographic area codes
- Date types and other cataloging information

```json
"fixedLengthData": {
  "dateEntered": "23-04-20",
  "dateType": "single",
  "publicationDate": "2022",
  "language": "eng"
}
```

### NonpublicNote Field Parsing

MARC_Off intelligently parses special formatted fields like the nonpublicNote which follows a pattern like:
```
FSC@aHS Non-Fiction@c20000809
```

This is transformed into a structured object:
```json
"parsedNonpublicNote": {
  "raw": "FSC@aHS Non-Fiction@c20000809",
  "code": "FSC",
  "location": "HS Non-Fiction",
  "date": "2000-08-09",
  "rawDate": "20000809"
}
```

The format uses:
- FSC: A library system code
- @a: Delimiter followed by location/collection information
- @c: Delimiter followed by date in YYYYMMDD format

## Project Structure

```
/marc_off
├── bin/                # Executable scripts
│   └── marc_off        # Main command-line tool
├── cli/                # Command-line interfaces
│   ├── marc_to_json.ts # MARC to JSON converter
│   ├── json_to_marc.ts # JSON to MARC converter
│   ├── test_round_trip.ts # Round-trip tester
│   ├── compare_records.ts # Detailed record comparison tool
│   ├── full_compare.ts # Full test with detailed comparison
│   └── verify_marc.ts  # MARC file verification tool
├── src/                # Core library code
│   ├── parser.ts       # MARC parser
│   ├── converter.ts    # Basic converter
│   ├── humanReadableConverter.ts # Enhanced converter
│   ├── jsonToMarcConverter.ts # Reverse converter
│   ├── recordExporter.ts # File exporter
│   └── types.ts        # TypeScript types
├── assets/             # Project assets
├── sample.marc         # Sample MARC file for testing
└── sample.json         # Sample JSON output
```

## Performance

MARC_Off is designed to be efficient for processing large MARC files:
- Processes thousands of records per second
- Successfully tested with library export files containing 15,000+ records
- Memory-efficient implementation handles large datasets

## License

MIT