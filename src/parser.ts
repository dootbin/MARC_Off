import { MarcField, MarcRecord } from "./types.ts";

/**
 * MARC record parser for USMARC format
 */
export class MarcParser {
  /**
   * Parse raw MARC record data into structured records
   * @param data Raw binary MARC data
   * @returns Array of parsed MARC records
   */
  public static parse(data: Uint8Array): MarcRecord[] {
    const records: MarcRecord[] = [];
    let offset = 0;

    while (offset < data.length) {
      // Get record length from the first 5 bytes
      const recordLengthStr = new TextDecoder().decode(data.slice(offset, offset + 5));
      const recordLength = parseInt(recordLengthStr, 10);
      
      if (isNaN(recordLength) || recordLength <= 0) {
        break; // End of data or invalid record
      }

      // Extract the complete record
      const recordData = data.slice(offset, offset + recordLength);
      const record = this.parseRecord(recordData);
      records.push(record);
      
      // Move to the next record
      offset += recordLength;
    }

    return records;
  }

  /**
   * Parse a single MARC record
   * @param data Raw record data
   * @returns Parsed MARC record
   */
  private static parseRecord(data: Uint8Array): MarcRecord {
    const decoder = new TextDecoder();
    
    // Parse leader (24 bytes at the beginning)
    const leader = decoder.decode(data.slice(0, 24));
    
    // Base address of data is at bytes 12-16
    const baseAddress = parseInt(decoder.decode(data.slice(12, 17)), 10);
    
    // Directory entries start at byte 24 and go until the field terminator marker (ASCII 30)
    const directoryData = data.slice(24, baseAddress - 1);
    
    // Field data starts after the base address
    const fieldsData = data.slice(baseAddress);
    
    // Parse directory entries (each entry is 12 bytes: 3-byte tag, 4-byte length, 5-byte starting position)
    const fields: MarcField[] = [];
    for (let i = 0; i < directoryData.length; i += 12) {
      if (i + 12 > directoryData.length) break;
      
      const tag = decoder.decode(directoryData.slice(i, i + 3));
      const fieldLength = parseInt(decoder.decode(directoryData.slice(i + 3, i + 7)), 10);
      const fieldStartPos = parseInt(decoder.decode(directoryData.slice(i + 7, i + 12)), 10);
      
      // Field data is at baseAddress + startPos, length = length - 1 (to exclude field terminator)
      const fieldData = fieldsData.slice(fieldStartPos, fieldStartPos + fieldLength - 1);
      
      if (tag < "010") {
        // Control fields have no indicators or subfields
        fields.push({
          tag,
          value: decoder.decode(fieldData)
        });
      } else {
        // Data fields have indicators and subfields
        const indicators = decoder.decode(fieldData.slice(0, 2));
        const indicator1 = indicators.charAt(0);
        const indicator2 = indicators.charAt(1);
        
        // Subfields start after indicators
        const subfieldData = fieldData.slice(2);
        const subfields: Record<string, string> = {};
        
        // Split on subfield delimiter (ASCII 31)
        let subfieldStart = 0;
        for (let j = 0; j < subfieldData.length; j++) {
          if (subfieldData[j] === 0x1F) { // Subfield delimiter
            subfieldStart = j;
            // Code is the character after the delimiter
            const code = decoder.decode(subfieldData.slice(j + 1, j + 2));
            
            // Find the end of this subfield (next delimiter or end of field)
            let subfieldEnd = j + 2;
            while (subfieldEnd < subfieldData.length && subfieldData[subfieldEnd] !== 0x1F) {
              subfieldEnd++;
            }
            
            // Extract subfield value
            const value = decoder.decode(subfieldData.slice(j + 2, subfieldEnd));
            subfields[code] = value;
            
            j = subfieldEnd - 1; // Move to end of current subfield
          }
        }
        
        fields.push({
          tag,
          indicator1,
          indicator2,
          subfields
        });
      }
    }
    
    return { leader, fields };
  }
}