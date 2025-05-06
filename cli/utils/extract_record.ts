import { MarcParser } from "./src/parser.ts";
import { MarcConverter } from "./src/converter.ts";

// Get file path and record number from command line
if (Deno.args.length < 2) {
  console.error("Usage: deno run --allow-read --allow-write extract_record.ts <marc-file> <record-num> [output-file]");
  Deno.exit(1);
}

const filePath = Deno.args[0];
const recordNum = parseInt(Deno.args[1]);
const outputPath = Deno.args[2] || `record_${recordNum}.json`;

console.log(`Extracting record #${recordNum} from ${filePath}`);

try {
  // Read the file
  const data = Deno.readFileSync(filePath);
  console.log(`Read ${data.length} bytes`);
  
  // Parse records
  const records = MarcParser.parse(data);
  console.log(`Found ${records.length} records`);
  
  if (recordNum < 0 || recordNum >= records.length) {
    console.error(`Error: Record number ${recordNum} out of range (0-${records.length-1})`);
    Deno.exit(1);
  }
  
  // Get the specified record
  const record = records[recordNum];
  
  // Convert to JSON for easier inspection
  const json = MarcConverter.toJson(record, { includeLeader: true });
  
  // Write to output file
  const output = JSON.stringify(json, null, 2);
  Deno.writeTextFileSync(outputPath, output);
  console.log(`Wrote record to ${outputPath}`);
  
  // Show some basic info about the record
  console.log(`\nRecord Info:`);
  console.log(`Leader: ${record.leader}`);
  console.log(`Fields: ${record.fields.length}`);
  
  // Print a summary of fields
  console.log(`\nField Summary:`);
  const fieldCounts: Record<string, number> = {};
  
  for (const field of record.fields) {
    fieldCounts[field.tag] = (fieldCounts[field.tag] || 0) + 1;
  }
  
  for (const [tag, count] of Object.entries(fieldCounts).sort()) {
    console.log(`  ${tag}: ${count} field(s)`);
  }
  
} catch (e) {
  console.error(`Error: ${e.message}`);
  console.error(e.stack);
}