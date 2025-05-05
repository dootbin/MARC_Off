/**
 * Tests for indicator interpretation
 * Ensures that numeric codes are properly converted to human-readable values
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { HumanReadableConverter } from "../src/humanReadableConverter.ts";

import { MarcRecord, MarcField } from "../src/types.ts";

// Test different indicator combinations for important field types
Deno.test("Author field indicator interpretation", () => {
  // Test different author nameType values
  const nameTypes = [
    { code: "0", expected: "Forename" },
    { code: "1", expected: "Surname" },
    { code: "3", expected: "Family name" }
  ];
  
  for (const { code, expected } of nameTypes) {
    const record: MarcRecord = {
      leader: "00000nam a22000000a 4500",
      fields: [
        { 
          tag: "100", 
          indicator1: code, 
          indicator2: " ",
          subfields: {
            "a": "Test Author"
          }
        } as MarcField
      ]
    };
    
    const json = HumanReadableConverter.toJson(record, { simplifyArrays: true });
    
    // Check the nameType was properly interpreted
    assertExists(json.author);
    const author = json.author as Record<string, unknown>;
    assertEquals(author.nameForm, expected);
    // Original nameType code should be removed
    assertEquals(author.nameType, undefined);
  }
});

Deno.test("Title field indicator interpretation", () => {
  // Create a title field with specific indicators
  const record: MarcRecord = {
    leader: "00000nam a22000000a 4500",
    fields: [
      { 
        tag: "245", 
        indicator1: "1", // Has added entry
        indicator2: "4", // 4 nonfiling characters
        subfields: {
          "a": "The Test Title"
        }
      } as MarcField
    ]
  };
  
  const json = HumanReadableConverter.toJson(record, { simplifyArrays: true });
  
  // Check interpretation of both indicators
  assertExists(json.title);
  const title = json.title as Record<string, unknown>;
  assertEquals(title.titleIncludesAddedEntry, true);
  assertEquals(title.nonfilingCharacterCount, 4);
  assertEquals(title.nonfilingDescription, "4 characters are not used for sorting");
  
  // Original indicator codes should be removed
  assertEquals(title.titleAddedEntry, undefined);
  assertEquals(title.nonfilingCharacters, undefined);
});

Deno.test("LC Call Number indicator interpretation", () => {
  // Create a call number field with specific indicators
  const record: MarcRecord = {
    leader: "00000nam a22000000a 4500",
    fields: [
      { 
        tag: "050", 
        indicator1: "0", // In LC
        indicator2: "0", // Assigned by LC
        subfields: {
          "a": "PN1997",
          "b": ".T485 2024"
        }
      } as MarcField
    ]
  };
  
  const json = HumanReadableConverter.toJson(record, { simplifyArrays: true });
  
  // Check LC indicators interpretation
  assertExists(json.libraryOfCongressCallNumber);
  const lcCallNumber = json.libraryOfCongressCallNumber as Record<string, unknown>;
  assertEquals(lcCallNumber.inLC, true);
  assertEquals(lcCallNumber.lcNoteDisplay, "Item is in LC");
  assertEquals(lcCallNumber.lcSubjectType, "No subject subdivision");
});

Deno.test("Subject field indicator interpretation", () => {
  // Test subject field with different thesaurus indicators
  const thesaurusTypes = [
    { code: "0", expected: "Library of Congress Subject Headings" },
    { code: "1", expected: "LC Subject Headings for Children's Literature" },
    { code: "2", expected: "Medical Subject Headings" }
  ];
  
  for (const { code, expected } of thesaurusTypes) {
    const record: MarcRecord = {
      leader: "00000nam a22000000a 4500",
      fields: [
        { 
          tag: "650", 
          indicator1: " ", 
          indicator2: code,
          subfields: {
            "a": "Test Subject"
          }
        } as MarcField
      ]
    };
    
    const json = HumanReadableConverter.toJson(record, { simplifyArrays: true });
    
    // Check the subject thesaurus was properly interpreted
    assertExists(json.subjectTopical);
    const subjectTopical = json.subjectTopical as Record<string, unknown>[];
    assertEquals(subjectTopical[0].subjectThesaurus, expected);
    // Original code should be removed
    assertEquals(subjectTopical[0].subjectSystem, undefined);
  }
});

Deno.test("localSystemInfo indicator interpretation", () => {
  // Test local system info field with specific indicators
  const record: MarcRecord = {
    leader: "00000nam a22000000a 4500",
    fields: [
      { 
        tag: "961", 
        indicator1: "w", 
        indicator2: "l",
        subfields: {
          "t": "100"
        }
      } as MarcField
    ]
  };
  
  const json = HumanReadableConverter.toJson(record, { simplifyArrays: true });
  
  // Check detailed indicator interpretation
  assertExists(json.localSystemInfo);
  const localSystemInfo = json.localSystemInfo as Record<string, unknown>;
  
  // First indicator
  assertExists(localSystemInfo.indicator1);
  const indicator1 = localSystemInfo.indicator1 as Record<string, unknown>;
  assertEquals(indicator1.code, "w");
  assertEquals(indicator1.type, "Workstation ID");
  assertEquals(typeof indicator1.description, "string");
  
  // Second indicator
  assertExists(localSystemInfo.indicator2);
  const indicator2 = localSystemInfo.indicator2 as Record<string, unknown>;
  assertEquals(indicator2.code, "l");
  assertEquals(indicator2.type, "Local record");
  assertEquals(typeof indicator2.description, "string");
});

// Run the tests if this file is executed directly
if (import.meta.main) {
  console.log("Running indicator interpretation tests...");
}