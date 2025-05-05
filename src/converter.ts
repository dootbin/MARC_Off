import { MarcRecord, ConversionOptions } from "./types.ts";

/**
 * Converts MARC records to JSON format
 */
export class MarcConverter {
  /**
   * Convert a MARC record to a JSON object
   * @param record The MARC record to convert
   * @param options Conversion options
   * @returns JSON representation of the MARC record
   */
  public static toJson(
    record: MarcRecord, 
    options: ConversionOptions = {}
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    // Include leader if specified in options
    if (options.includeLeader) {
      result.leader = record.leader;
    }
    
    // Process each field
    record.fields.forEach(field => {
      const { tag } = field;
      
      // Initialize array for this tag if it doesn't exist
      if (!result[tag]) {
        result[tag] = [];
      }
      
      const fieldArray = result[tag] as Array<unknown>;
      
      if (field.value !== undefined) {
        // Control field with simple value
        fieldArray.push(field.value);
      } else {
        // Data field with indicators and subfields
        const fieldObject: Record<string, unknown> = {};
        
        // Add indicators if they exist
        if (field.indicator1) {
          fieldObject.ind1 = field.indicator1;
        }
        
        if (field.indicator2) {
          fieldObject.ind2 = field.indicator2;
        }
        
        // Process subfields
        if (field.subfields) {
          if (options.flattenSubfields) {
            // Flatten subfields into a simple object
            fieldObject.subfields = field.subfields;
          } else {
            // Convert subfields to an array of code-value pairs
            const subfieldArray: Array<Record<string, string>> = [];
            
            for (const [code, value] of Object.entries(field.subfields)) {
              subfieldArray.push({ code, value });
            }
            
            fieldObject.subfields = subfieldArray;
          }
        }
        
        fieldArray.push(fieldObject);
      }
    });
    
    return result;
  }

  /**
   * Convert multiple MARC records to JSON
   * @param records Array of MARC records
   * @param options Conversion options
   * @returns Array of JSON objects
   */
  public static batchToJson(
    records: MarcRecord[], 
    options: ConversionOptions = {}
  ): Record<string, unknown>[] {
    return records.map(record => this.toJson(record, options));
  }
}