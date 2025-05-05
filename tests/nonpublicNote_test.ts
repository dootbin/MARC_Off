import { assertEquals, assertExists } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { HumanReadableConverter } from "../src/humanReadableConverter.ts";
import { MarcRecord, MarcField } from "../src/types.ts";

// Since parseNonpublicNote is a private method, we need to create a test record that
// includes a nonpublicNote field to test the parsing functionality indirectly

// Create a basic MARC record with a 852 field containing nonpublicNote
const createTestRecord = (nonpublicNote: string): MarcRecord => {
  return {
    leader: "00000nam a22000000a 4500",
    fields: [
      {
        tag: "852",
        indicator1: " ",
        indicator2: " ",
        subfields: {
          x: nonpublicNote
        }
      } as MarcField
    ]
  };
};

Deno.test("nonpublicNote parser - standard format", () => {
  const record = createTestRecord("FSC@aHS Non-Fiction@c20000809");
  const json = HumanReadableConverter.toJson(record);
  
  // Check that the location field has been properly parsed
  assertExists(json.location);
  const locationArray = json.location as Record<string, unknown>[];
  const location = locationArray[0] as Record<string, unknown>;
  const parsedNote = location.parsedNonpublicNote as Record<string, unknown>;
  
  assertEquals(parsedNote.raw, "FSC@aHS Non-Fiction@c20000809");
  assertEquals(parsedNote.code, "FSC");
  assertEquals(parsedNote.location, "HS Non-Fiction");
  assertEquals(parsedNote.date, "2000-08-09");
  assertEquals(parsedNote.rawDate, "20000809");
});

Deno.test("nonpublicNote parser - with additional codes", () => {
  const record = createTestRecord("FSC@aEL Nonfiction@c20000809@dXYZ123");
  const json = HumanReadableConverter.toJson(record);
  
  // Check that the location field has been properly parsed
  assertExists(json.location);
  const locationArray = json.location as Record<string, unknown>[];
  const location = locationArray[0] as Record<string, unknown>;
  const parsedNote = location.parsedNonpublicNote as Record<string, unknown>;
  
  assertEquals(parsedNote.raw, "FSC@aEL Nonfiction@c20000809@dXYZ123");
  assertEquals(parsedNote.code, "FSC");
  assertEquals(parsedNote.location, "EL Nonfiction");
  assertEquals(parsedNote.date, "2000-08-09");
  assertEquals(parsedNote.value_d, "XYZ123");
});

Deno.test("nonpublicNote parser - different date format", () => {
  const record = createTestRecord("FSC@aHS Fiction@c2000");
  const json = HumanReadableConverter.toJson(record);
  
  // Check that the location field has been properly parsed
  assertExists(json.location);
  const locationArray = json.location as Record<string, unknown>[];
  const location = locationArray[0] as Record<string, unknown>;
  const parsedNote = location.parsedNonpublicNote as Record<string, unknown>;
  
  assertEquals(parsedNote.raw, "FSC@aHS Fiction@c2000");
  assertEquals(parsedNote.code, "FSC");
  assertEquals(parsedNote.location, "HS Fiction");
  assertEquals(parsedNote.dateValue, "2000"); // Should not be parsed as a date
});

Deno.test("nonpublicNote parser - non-standard format", () => {
  const record = createTestRecord("Local note without expected format");
  const json = HumanReadableConverter.toJson(record);
  
  // Check that the location field has the original note but no parsed version
  assertExists(json.location);
  const locationArray = json.location as Record<string, unknown>[];
  const location = locationArray[0] as Record<string, unknown>;
  
  assertEquals(location.nonpublicNote, "Local note without expected format");
  assertEquals(location.parsedNonpublicNote, undefined);
});