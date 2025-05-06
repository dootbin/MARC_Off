import { MarcParser } from "../src/parser.ts";

// Get file path from command line
const filePath = Deno.args[0];
if (!filePath) {
  console.error("Error: MARC file path required");
  Deno.exit(1);
}

console.log(`Verifying MARC file: ${filePath}`);

try {
  // Read the file
  const data = Deno.readFileSync(filePath);
  console.log(`Read ${data.length} bytes`);
  
  // Parse records
  const records = MarcParser.parse(data);
  console.log(`Successfully parsed ${records.length} records`);
  
  // Print information about a few records
  const sampleSize = Math.min(3, records.length);
  console.log(`Sample of ${sampleSize} records:`);
  
  for (let i = 0; i < sampleSize; i++) {
    const record = records[i];
    console.log(`\nRecord ${i+1} - Leader: ${record.leader}`);
    console.log(`Fields: ${record.fields.length}`);
    
    // Print the first few fields
    const fieldSample = record.fields.slice(0, 5);
    for (const field of fieldSample) {
      if (field.value !== undefined) {
        console.log(`  ${field.tag}: ${field.value}`);
      } else {
        console.log(`  ${field.tag}: ind1=${field.indicator1 || " "}, ind2=${field.indicator2 || " "}, ${Object.keys(field.subfields || {}).length} subfields`);
      }
    }
    console.log("  ...");
  }
  
} catch (e) {
  console.error(`Error: ${e.message}`);
  console.error(e.stack);
}