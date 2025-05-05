/**
 * Test for nonpublicNote parser
 * Tests various formats and edge cases
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { HumanReadableConverter } from "../src/humanReadableConverter.ts";

import { MarcRecord, MarcField } from "../src/types.ts";

// Create a record with a nonpublicNote field
const createRecordWithNonpublicNote = (nonpublicNote: string): MarcRecord => {
  return {
    leader: "00000nam a22000000a 4500",
    fields: [
      {
        tag: "852",
        indicator1: " ",
        indicator2: " ",
        subfields: {
          "a": "TEST",
          "h": "123.45 TST",
          "x": nonpublicNote
        }
      } as MarcField
    ]
  };
};

// Standard format test
Deno.test("nonpublicNote parser - standard format", () => {
  const record = createRecordWithNonpublicNote("FSC@aHS Non-Fiction@c20000809");
  const json = HumanReadableConverter.toJson(record) as Record<string, any>;
  
  const location = json.location[0] as Record<string, any>;
  assertExists(location.parsedNonpublicNote);
  
  assertEquals(location.parsedNonpublicNote.raw, "FSC@aHS Non-Fiction@c20000809");
  assertEquals(location.parsedNonpublicNote.code, "FSC");
  assertEquals(location.parsedNonpublicNote.location, "HS Non-Fiction");
  assertEquals(location.parsedNonpublicNote.date, "2000-08-09");
  assertEquals(location.parsedNonpublicNote.rawDate, "20000809");
  
  // The original nonpublicNote should be removed
  assertEquals(location.nonpublicNote, undefined);
});

// Test with additional fields
Deno.test("nonpublicNote parser - additional fields", () => {
  const record = createRecordWithNonpublicNote("FSC@aHS Non-Fiction@c20000809@dExtra Info");
  const json = HumanReadableConverter.toJson(record) as Record<string, any>;
  
  const location = json.location[0] as Record<string, any>;
  assertExists(location.parsedNonpublicNote);
  
  assertEquals(location.parsedNonpublicNote.raw, "FSC@aHS Non-Fiction@c20000809@dExtra Info");
  assertEquals(location.parsedNonpublicNote.code, "FSC");
  assertEquals(location.parsedNonpublicNote.location, "HS Non-Fiction");
  assertEquals(location.parsedNonpublicNote.date, "2000-08-09");
  assertEquals(location.parsedNonpublicNote.value_d, "Extra Info");
});

// Test with non-standard date format
Deno.test("nonpublicNote parser - non-standard date", () => {
  const record = createRecordWithNonpublicNote("FSC@aHS Non-Fiction@c2000");
  const json = HumanReadableConverter.toJson(record) as Record<string, any>;
  
  const location = json.location[0] as Record<string, any>;
  assertExists(location.parsedNonpublicNote);
  
  assertEquals(location.parsedNonpublicNote.raw, "FSC@aHS Non-Fiction@c2000");
  assertEquals(location.parsedNonpublicNote.code, "FSC");
  assertEquals(location.parsedNonpublicNote.location, "HS Non-Fiction");
  assertEquals(location.parsedNonpublicNote.dateValue, "2000");
  // No "date" field since it's not in YYYYMMDD format
  assertEquals(location.parsedNonpublicNote.date, undefined);
});

// Test with non-FSC format
Deno.test("nonpublicNote parser - different prefix", () => {
  const record = createRecordWithNonpublicNote("ABC@aHS Non-Fiction@c20000809");
  const json = HumanReadableConverter.toJson(record) as Record<string, any>;
  
  const location = json.location[0] as Record<string, any>;
  // Should have the nonpublicNote but not parse it
  assertEquals(location.nonpublicNote, "ABC@aHS Non-Fiction@c20000809");
  assertEquals(location.parsedNonpublicNote, undefined);
});

// Test with unrelated format
Deno.test("nonpublicNote parser - unrelated format", () => {
  const record = createRecordWithNonpublicNote("Just a regular note");
  const json = HumanReadableConverter.toJson(record) as Record<string, any>;
  
  const location = json.location[0] as Record<string, any>;
  // Should keep the nonpublicNote intact
  assertEquals(location.nonpublicNote, "Just a regular note");
  assertEquals(location.parsedNonpublicNote, undefined);
});

// Run the tests if this file is executed directly
if (import.meta.main) {
  console.log("Running nonpublicNote parser tests...");
}