/**
 * Dump MARC file contents in human-readable format
 * Usage: deno run --allow-read dump_marc.ts <marc-file>
 */

import { MarcParser } from "./src/parser.ts";

const filePath = Deno.args[0];
if (!filePath) {
  console.error("Please provide a MARC file path");
  Deno.exit(1);
}

try {
  // Read and parse the MARC file
  const data = Deno.readFileSync(filePath);
  const records = MarcParser.parse(data);

  console.log(`Found ${records.length} records in ${filePath}\n`);

  // Display each record in detail
  records.forEach((record, index) => {
    console.log(`Record ${index + 1} - Leader: ${record.leader}`);
    console.log("Fields:");

    record.fields.forEach(field => {
      if (field.value !== undefined) {
        // Control field (001-009)
        console.log(`  ${field.tag}: ${field.value}`);
      } else {
        // Data field (010+)
        console.log(`  ${field.tag}: ind1=${field.indicator1 || " "}, ind2=${field.indicator2 || " "}`);
        if (field.subfields) {
          for (const [code, value] of Object.entries(field.subfields)) {
            console.log(`    $${code}: ${value}`);
          }
        }
      }
    });
    console.log("");
  });

} catch (error) {
  console.error(`Error: ${error.message}`);
}