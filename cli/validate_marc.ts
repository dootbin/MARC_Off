/**
 * MARC record validator
 * 
 * This script validates MARC files according to the MARC21 specification
 * 
 * Usage: deno run --allow-read validate_marc.ts <marc-file>
 */

import { MarcRecord, MarcField } from "../src/types.ts";
import { MarcParser } from "../src/parser.ts";

// Rules for valid MARC records
const MARC_RULES = {
  leader: {
    length: 24,
    // Updated pattern that is more compatible with real-world MARC records
    // This pattern allows for any characters in positions with practical variation
    pattern: /^\d{5}[a-z0-9 ][a-z0-9 ][a-z0-9 ][a-z0-9 ][a-z0-9 ][0-9 ][0-9 ][a-z0-9 ]{5}[a-z0-9 ][a-z0-9 ][a-z0-9 ]4500$/i,
    recordLength: { start: 0, length: 5 },
    recordStatus: { start: 5, length: 1, validCodes: ['a', 'c', 'd', 'n', 'p', ' '] },
    recordType: { start: 6, length: 1, validCodes: ['a', 'c', 'd', 'e', 'f', 'g', 'i', 'j', 'k', 'm', 'o', 'p', 'r', 't'] },
    bibLevel: { start: 7, length: 1, validCodes: ['a', 'b', 'c', 'd', 'i', 'm', 's'] },
    controlType: { start: 8, length: 1, validCodes: [' ', 'a'] },
    charCodingScheme: { start: 9, length: 1, validCodes: ['a', ' '] },
    indicatorCount: { start: 10, length: 1, validCodes: ['2'] },
    subfieldCodeCount: { start: 11, length: 1, validCodes: ['2'] },
    baseAddress: { start: 12, length: 5 },
    encodingLevel: { start: 17, length: 1, validCodes: [' ', '1', '2', '3', '4', '5', '7', '8', 'u', 'z'] },
    descCatalogingForm: { start: 18, length: 1, validCodes: [' ', 'a', 'c', 'i', 'u'] },
    multipartLevel: { start: 19, length: 1, validCodes: [' ', 'a', 'b', 'c'] },
    entryMapLength: { start: 20, length: 4, expected: "4500" }
  },
  
  requiredFields: ['001', '003', '005', '008'],
  
  fixedLength: {
    '001': { minLength: 1, maxLength: 20 },
    '003': { minLength: 1, maxLength: 10 },
    '005': { pattern: /^\d{14}\.\d$/ },
    '006': { length: 18 },
    '007': { minLength: 2 },
    '008': { length: 40 }
  },
  
  dataFields: {
    // Indicators must be a valid character (alphanumeric or space)
    indicatorPattern: /^[ 0-9a-z]$/i,
    
    // Subfield codes must be alphanumeric
    subfieldCodePattern: /^[0-9a-z]$/i
  }
};

/**
 * Validate the MARC leader
 * @param leader MARC leader string
 * @returns Array of validation errors
 */
function validateLeader(leader: string): string[] {
  const errors: string[] = [];
  
  // Check basic length
  if (!leader || leader.length !== 24) {
    errors.push(`Leader length must be 24 characters (found ${leader?.length || 0})`);
    return errors;
  }
  
  // Check overall pattern
  if (!MARC_RULES.leader.pattern.test(leader)) {
    errors.push(`Leader format invalid: "${leader}"`);
  }
  
  // Check specific positions
  const recordStatus = leader.charAt(5);
  if (!MARC_RULES.leader.recordStatus.validCodes.includes(recordStatus.toLowerCase())) {
    errors.push(`Invalid record status '${recordStatus}' at leader position 5`);
  }
  
  const recordType = leader.charAt(6);
  if (!MARC_RULES.leader.recordType.validCodes.includes(recordType.toLowerCase())) {
    errors.push(`Invalid record type '${recordType}' at leader position 6`);
  }
  
  const bibLevel = leader.charAt(7);
  if (!MARC_RULES.leader.bibLevel.validCodes.includes(bibLevel.toLowerCase())) {
    errors.push(`Invalid bibliographic level '${bibLevel}' at leader position 7`);
  }
  
  const controlType = leader.charAt(8);
  if (!MARC_RULES.leader.controlType.validCodes.includes(controlType)) {
    errors.push(`Invalid control type '${controlType}' at leader position 8`);
  }
  
  const charCoding = leader.charAt(9);
  if (!MARC_RULES.leader.charCodingScheme.validCodes.includes(charCoding)) {
    errors.push(`Invalid character coding scheme '${charCoding}' at leader position 9`);
  }
  
  const indicatorCount = leader.charAt(10);
  if (indicatorCount !== '2') {
    errors.push(`Indicator count must be '2' (found '${indicatorCount}')`);
  }
  
  const subfieldCodeCount = leader.charAt(11);
  if (subfieldCodeCount !== '2') {
    errors.push(`Subfield code count must be '2' (found '${subfieldCodeCount}')`);
  }
  
  const entryMap = leader.substring(20, 24);
  if (entryMap !== "4500") {
    errors.push(`Entry map must be '4500' (found '${entryMap}')`);
  }
  
  // Check if base address is a valid number
  const baseAddress = leader.substring(12, 17);
  const baseAddressNum = parseInt(baseAddress, 10);
  if (isNaN(baseAddressNum) || baseAddressNum < 24) {
    errors.push(`Invalid base address '${baseAddress}' (must be a number ≥ 24)`);
  }
  
  return errors;
}

/**
 * Validate a fixed-length control field
 * @param field Control field
 * @returns Array of validation errors
 */
function validateControlField(field: MarcField): string[] {
  const errors: string[] = [];
  
  if (!field.tag || !field.value) {
    errors.push(`Control field ${field.tag} missing value`);
    return errors;
  }
  
  // Check field-specific rules
  const rule = MARC_RULES.fixedLength[field.tag];
  if (rule) {
    if (rule.length && field.value.length !== rule.length) {
      errors.push(`Field ${field.tag} must be exactly ${rule.length} characters (found ${field.value.length})`);
    }
    
    if (rule.minLength && field.value.length < rule.minLength) {
      errors.push(`Field ${field.tag} must be at least ${rule.minLength} characters (found ${field.value.length})`);
    }
    
    if (rule.maxLength && field.value.length > rule.maxLength) {
      errors.push(`Field ${field.tag} must be at most ${rule.maxLength} characters (found ${field.value.length})`);
    }
    
    if (rule.pattern && !rule.pattern.test(field.value)) {
      errors.push(`Field ${field.tag} does not match expected pattern: "${field.value}"`);
    }
  }
  
  return errors;
}

/**
 * Validate a variable data field
 * @param field Data field
 * @returns Array of validation errors
 */
function validateDataField(field: MarcField): string[] {
  const errors: string[] = [];
  
  if (!field.tag) {
    errors.push("Data field missing tag");
    return errors;
  }
  
  // Check indicators
  if (!field.indicator1) {
    errors.push(`Field ${field.tag}: Missing first indicator`);
  } else if (!MARC_RULES.dataFields.indicatorPattern.test(field.indicator1)) {
    errors.push(`Field ${field.tag}: Invalid first indicator '${field.indicator1}'`);
  }
  
  if (!field.indicator2) {
    errors.push(`Field ${field.tag}: Missing second indicator`);
  } else if (!MARC_RULES.dataFields.indicatorPattern.test(field.indicator2)) {
    errors.push(`Field ${field.tag}: Invalid second indicator '${field.indicator2}'`);
  }
  
  // Check subfields
  if (!field.subfields || Object.keys(field.subfields).length === 0) {
    errors.push(`Field ${field.tag}: Missing subfields`);
  } else {
    for (const [code, value] of Object.entries(field.subfields)) {
      if (!MARC_RULES.dataFields.subfieldCodePattern.test(code)) {
        errors.push(`Field ${field.tag}: Invalid subfield code '${code}'`);
      }
      
      if (!value || value.trim() === "") {
        errors.push(`Field ${field.tag}: Empty value for subfield '${code}'`);
      }
    }
  }
  
  return errors;
}

/**
 * Validate a MARC record
 * @param record MARC record
 * @returns Array of validation errors
 */
function validateRecord(record: MarcRecord): string[] {
  const errors: string[] = [];
  
  // Validate leader
  errors.push(...validateLeader(record.leader));
  
  // Check if required fields exist
  const tags = record.fields.map(f => f.tag);
  for (const requiredTag of MARC_RULES.requiredFields) {
    if (!tags.includes(requiredTag)) {
      errors.push(`Missing required field: ${requiredTag}`);
    }
  }
  
  // Validate each field
  for (const field of record.fields) {
    if (field.tag < "010") {
      // Control field
      errors.push(...validateControlField(field));
    } else {
      // Data field
      errors.push(...validateDataField(field));
    }
  }
  
  // Check if control fields are in correct order - relaxed validation
  // Many real-world MARC records don't strictly follow the ascending order of control fields
  // For our converter, we'll accept these records but sort them when converting
  
  // Uncomment this section if strict validation is required:
  // const controlFields = record.fields.filter(f => f.tag < "010");
  // const controlTags = controlFields.map(f => f.tag);
  // const sortedControlTags = [...controlTags].sort();
  // 
  // if (JSON.stringify(controlTags) !== JSON.stringify(sortedControlTags)) {
  //   errors.push("Control fields are not in ascending order");
  // }
  
  // Note: MARC21 doesn't actually require data fields to be in strict ascending order,
  // so we won't check data field order as it would generate false warnings
  
  return errors;
}

/**
 * Main function to validate a MARC file
 * @param filepath Path to MARC file
 */
async function validateMarcFile(filepath: string): Promise<void> {
  console.log(`Validating MARC file: ${filepath}`);
  
  try {
    // Read the file
    const data = await Deno.readFile(filepath);
    console.log(`Read ${data.length} bytes from file`);
    
    // Parse the MARC records
    const records = MarcParser.parse(data);
    console.log(`Parsed ${records.length} records from file`);
    
    // Validate each record
    let validRecords = 0;
    let invalidRecords = 0;
    let totalErrors = 0;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const errors = validateRecord(record);
      
      if (errors.length === 0) {
        validRecords++;
      } else {
        invalidRecords++;
        totalErrors += errors.length;
        
        // Print errors for invalid records
        console.log(`\nRecord ${i + 1} - Control Number: ${getControlNumber(record)}`);
        console.log(`  ERRORS: ${errors.length}`);
        errors.forEach(err => console.log(`  - ${err}`));
      }
    }
    
    // Print summary
    console.log(`\nValidation Summary:`);
    console.log(`  Records analyzed: ${records.length}`);
    console.log(`  Valid records: ${validRecords}`);
    console.log(`  Invalid records: ${invalidRecords}`);
    console.log(`  Total errors: ${totalErrors}`);
    
    if (invalidRecords === 0) {
      console.log(`\n✅ All records are valid MARC21 records!`);
    } else {
      console.log(`\n❌ ${invalidRecords} record(s) have validation errors`);
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

/**
 * Get the control number from a MARC record
 * @param record MARC record
 * @returns Control number or "unknown"
 */
function getControlNumber(record: MarcRecord): string {
  const field001 = record.fields.find(f => f.tag === "001");
  return field001?.value || "unknown";
}

// Main script
if (Deno.args.length < 1) {
  console.error("Usage: deno run --allow-read validate_marc.ts <marc-file>");
  Deno.exit(1);
}

const filepath = Deno.args[0];
await validateMarcFile(filepath);