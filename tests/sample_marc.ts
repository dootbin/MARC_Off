/**
 * Sample MARC record data for testing
 * 
 * This is a simplified representation of a MARC record
 * that we can use for unit testing without requiring a real MARC file.
 */

// Sample MARC record bytes as a hex string (we'll convert to Uint8Array for tests)
export const SAMPLE_MARC_RECORD_HEX = 
  // Record length (5 bytes): 00209 (length of 209)
  "3030323039" +
  // Rest of leader (19 bytes)
  "206e616d2061323220303231373561203435303020" +
  // Directory entries (12 bytes each: tag, length, start position)
  "303031303033300030300030303030" +  // 001 field
  "303035303031380030333000303438" +  // 005 field
  "303234303032370030343800303735" +  // 024 field
  "313030303032370031303200313032" +  // 100 field
  "3234350303333303132390313332" +    // 245 field
  // Field terminator
  "1e" +
  // Field data
  // 001 field (control number)
  "30313233343536373839" + "1e" +
  // 005 field (datetime)
  "3230323330353031313233343536" + "1e" +
  // 024 field (Standard Identifier)
  // Indicators: 1 and 2
  "3132" + 
  // Subfield delimiter + code 'a' + value
  "1f" + "61" + "3938373635343332313030" +
  // Field terminator
  "1e" +
  // 100 field (Main Entry-Personal Name)
  // Indicators: 1 and 0
  "3130" +
  // Subfields
  "1f" + "61" + "446f652c204a6f686e" +
  "1f" + "64" + "313937302d" +
  // Field terminator
  "1e" +
  // 245 field (Title Statement)
  // Indicators: 1 and 0
  "3130" +
  // Subfields
  "1f" + "61" + "53616d706c65207469746c65" +
  "1f" + "62" + "53616d706c6520737562746974696c65" +
  "1f" + "63" + "4a6f686e20446f65" +
  // Field terminator
  "1e" +
  // Record terminator
  "1d";

/**
 * Convert a hex string to a Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Create a sample MARC record as Uint8Array for testing
 */
export function getSampleMarcRecord(): Uint8Array {
  return hexToBytes(SAMPLE_MARC_RECORD_HEX);
}

/**
 * Expected parsed output for the sample MARC record
 */
export const EXPECTED_PARSED_RECORD = {
  leader: "00209 nam a22 02175a 4500  ",
  fields: [
    {
      tag: "001",
      value: "0123456789"
    },
    {
      tag: "005",
      value: "20230501123456"
    },
    {
      tag: "024",
      indicator1: "1",
      indicator2: "2",
      subfields: {
        "a": "9876543210"
      }
    },
    {
      tag: "100",
      indicator1: "1",
      indicator2: "0",
      subfields: {
        "a": "Doe, John",
        "d": "1970-"
      }
    },
    {
      tag: "245",
      indicator1: "1",
      indicator2: "0",
      subfields: {
        "a": "Sample title",
        "b": "Sample subtitle",
        "c": "John Doe"
      }
    }
  ]
};

// Type-safe version of EXPECTED_PARSED_RECORD for tests
import { MarcRecord } from "../src/types.ts";

export function getTestRecord(): MarcRecord {
  return {
    leader: EXPECTED_PARSED_RECORD.leader,
    fields: [
      {
        tag: "001",
        value: "0123456789"
      },
      {
        tag: "005",
        value: "20230501123456"
      },
      {
        tag: "024",
        indicator1: "1",
        indicator2: "2",
        subfields: {
          "a": "9876543210"
        }
      },
      {
        tag: "100",
        indicator1: "1",
        indicator2: "0",
        subfields: {
          "a": "Doe, John",
          "d": "1970-"
        }
      },
      {
        tag: "245",
        indicator1: "1",
        indicator2: "0",
        subfields: {
          "a": "Sample title",
          "b": "Sample subtitle",
          "c": "John Doe"
        }
      }
    ]
  };
}

/**
 * Expected JSON output for the sample MARC record with default options
 */
export const EXPECTED_JSON_OUTPUT = {
  "001": ["0123456789"],
  "005": ["20230501123456"],
  "024": [
    {
      "ind1": "1",
      "ind2": "2",
      "subfields": [
        { "code": "a", "value": "9876543210" }
      ]
    }
  ],
  "100": [
    {
      "ind1": "1", 
      "ind2": "0",
      "subfields": [
        { "code": "a", "value": "Doe, John" },
        { "code": "d", "value": "1970-" }
      ]
    }
  ],
  "245": [
    {
      "ind1": "1",
      "ind2": "0",
      "subfields": [
        { "code": "a", "value": "Sample title" },
        { "code": "b", "value": "Sample subtitle" },
        { "code": "c", "value": "John Doe" }
      ]
    }
  ]
};

/**
 * Expected JSON output with flattened subfields option
 */
export const EXPECTED_JSON_FLATTENED = {
  "001": ["0123456789"],
  "005": ["20230501123456"],
  "024": [
    {
      "ind1": "1",
      "ind2": "2",
      "subfields": {
        "a": "9876543210"
      }
    }
  ],
  "100": [
    {
      "ind1": "1", 
      "ind2": "0",
      "subfields": {
        "a": "Doe, John",
        "d": "1970-"
      }
    }
  ],
  "245": [
    {
      "ind1": "1",
      "ind2": "0",
      "subfields": {
        "a": "Sample title",
        "b": "Sample subtitle",
        "c": "John Doe"
      }
    }
  ]
};