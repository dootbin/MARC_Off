# MARC_Off

A powerful Deno-based tool for converting MARC (MAchine Readable Cataloging) records to modern, usable JSON with human-readable field names. MARC_Off liberates your library catalog data from the arcane MARC format, making it accessible for modern applications and data analysis.

## Features

- Transform MARC format data from library management systems into clean, structured JSON
- Convert cryptic MARC tags to human-readable field and subfield names
- Provide comprehensive support for control fields, data fields, indicators, and subfields
- Parse fixed-length data fields (008) into meaningful structured objects
- Interpret special fields like nonpublicNote with delimited format (e.g., "FSC@aHS Non-Fiction@c20000809")
- Deduplicate categories and handle special cases automatically
- Add human-readable interpretations of indicator values
- Export individual records with hierarchical identifier-based filenames
- Flexible command-line interface with various formatting options

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

### Compile MARC_Off Binary

You can compile MARC_Off to a standalone binary for easier usage:

```bash
# Clone the repository
git clone https://github.com/yourusername/marc_off.git
cd marc_off

# Compile the binary
deno compile --allow-read --allow-write --output marc_off mod.ts
```

### Install System-wide

**macOS/Linux**:
```bash
# Move to a directory in your PATH
sudo mv marc_off /usr/local/bin/
```

**Alternative with symlink**:
```bash
# Create a symbolic link to the binary
sudo ln -s $(pwd)/marc_off /usr/local/bin/marc_off
```

## Usage

### Command Line

```bash
# Default: Split into individual JSON files named by ISBN/identifier
marc_off input.marc --output-dir ./records

# Include MARC leader in output
marc_off input.marc --output-dir ./records --include-leader

# Single combined JSON file (old method)
marc_off input.marc --single-file -o output.json

# Customize individual files
marc_off input.marc --output-dir ./records --no-fixed-fields --no-simplify

# Print to stdout (for debugging/viewing)
marc_off input.marc --single-file
```

### Output Modes

MARC_Off has two primary output modes:

1. **Split Records (Default)** - Each MARC record is converted to a separate JSON file in the specified directory:
   - Files are named hierarchically by ISBN-13, ISBN-10, control number, or content hash
   - Each file contains both metadata and complete record information
   - Required parameter: `--output-dir` to specify where files should be written

2. **Single File** - All records are combined into a single JSON file or output to stdout:
   - Use the `--single-file` flag to enable this mode
   - Optional parameter: `-o/--output` to specify output file (defaults to stdout)

### Running directly with Deno

If you prefer not to compile a binary, you can run MARC_Off directly with Deno:

```bash
# Split mode (default)
deno run --allow-read --allow-write mod.ts input.marc --output-dir ./records

# Single file mode
deno run --allow-read --allow-write mod.ts input.marc --single-file -o output.json
```

### As a Library

MARC_Off can also be used as a library in your own Deno projects:

```typescript
import { MarcParser, MarcConverter, HumanReadableConverter, RecordExporter } from "./mod.ts";

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

// Use the converted data
console.log(JSON.stringify(jsonData, null, 2));
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

## Performance

MARC_Off is designed to be efficient for processing large MARC files:
- Processes thousands of records per second
- Successfully tested with library export files containing 15,000+ records
- Memory-efficient implementation handles large datasets

## License

MIT