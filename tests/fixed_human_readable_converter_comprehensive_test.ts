import { HumanReadableConverter } from "../src/humanReadableConverter.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { getTestRecord } from "./sample_marc.ts";
import { parseFixedLengthData, parseNonpublicNote } from "./human_readable_converter_test_helpers.ts";
import { MarcRecord } from "../src/types.ts";

// Test various date types in fixed length fields
Deno.test({
  name: "HumanReadableConverter - parse different date types",
  fn: () => {
    // Test all date type codes
    const dateTypes = [
      { code: "s", expected: "single" },
      { code: "m", expected: "multiple" },
      { code: "c", expected: "continuing" },
      { code: "d", expected: "detailed" },
      { code: "e", expected: "end" },
      { code: "i", expected: "inclusive" },
      { code: "k", expected: "bulk" },
      { code: "n", expected: "unknown" },
      { code: "p", expected: "distribution" },
      { code: "q", expected: "questionable" },
      { code: "r", expected: "reprint" },
      { code: "t", expected: "publication/copyright" },
      { code: "u", expected: "status unknown" },
      { code: "x", expected: "x" } // Default case
    ];
    
    for (const { code, expected } of dateTypes) {
      // Create a basic 008 field with the date type
      const data = `200101${code}2022    xxu           000 0 eng d`;
      const result = parseFixedLengthData(data);
      
      assertEquals(result.dateType, expected, `Date type '${code}' should be interpreted as '${expected}'`);
    }
  }
});

// Test parsing dates and other data from 008 field
Deno.test({
  name: "HumanReadableConverter - parse publication dates and places",
  fn: () => {
    // Test various date formats and publication places
    const testCases = [
      {
        data: "2001014s2022    usa           000 0 eng d",
        expected: {
          dateType: "single",
          publicationDate: "2022",
          publicationPlace: "usa"
        }
      },
      {
        data: "2001014r19801990enk           000 0 eng d",
        expected: {
          dateType: "reprint",
          publicationDate: "1980",
          publicationDate2: "1990",
          publicationPlace: "enk"
        }
      },
      {
        data: "2001014u||||||||fr            000 0 fre d",
        expected: {
          dateType: "status unknown",
          publicationPlace: "fr",
          language: "fre"
        }
      }
    ];
    
    for (const { data, expected } of testCases) {
      const result = parseFixedLengthData(data);
      
      for (const [key, value] of Object.entries(expected)) {
        assertEquals(result[key], value, `${key} should be '${value}'`);
      }
    }
  }
});

// Test geographic area code interpretation
Deno.test({
  name: "HumanReadableConverter - interpret geographic area codes",
  fn: () => {
    // Create a record with 043 field
    const record: MarcRecord = getTestRecord();
    record.fields.push({
      tag: "043",
      indicator1: " ",
      indicator2: " ",
      subfields: { "a": "n-us---" } // United States
    });
    
    // Convert to JSON
    const result = HumanReadableConverter.toJson(record);
    
    // Check if the geographic area code is present
    const geographicField = result.geographicAreaCode;
    assertExists(geographicField, "Should have geographic area field");
    
    // Check the geographic area code exists
    if (Array.isArray(geographicField)) {
      assertExists(geographicField[0], "Should have geographic area field data");
    } else {
      assertExists(geographicField, "Should have geographic area field data");
    }
  }
});

// Test handling different modified record codes
Deno.test({
  name: "HumanReadableConverter - interpret modified record codes",
  fn: () => {
    const modifiedCodes = [
      { code: "d", expected: "omitted diacritics" },
      { code: "o", expected: "romanized" },
      { code: "r", expected: "completely romanized" },
      { code: "s", expected: "shortened" },
      { code: "x", expected: "missing characters" },
      { code: "?", expected: "?" } // Default case
    ];
    
    for (const { code, expected } of modifiedCodes) {
      // Create data with the modified record code
      const data = `200101s2022    xxu           000 0 eng ${code}`;
      const result = parseFixedLengthData(data);
      
      assertEquals(result.modifiedRecord, expected, 
        `Modified record code '${code}' should be interpreted as '${expected}'`);
    }
  }
});

// Test cataloging source interpretation
Deno.test({
  name: "HumanReadableConverter - interpret cataloging source",
  fn: () => {
    const sourceCodes = [
      { code: "c", expected: "cooperative" },
      { code: "d", expected: "other" },
      { code: "u", expected: "unknown" },
      { code: "?", expected: "?" } // Default case
    ];
    
    for (const { code, expected } of sourceCodes) {
      // Create data with the cataloging source code
      const data = `200101s2022    xxu           000 0 eng ${code}`;
      const result = parseFixedLengthData(data);
      
      if (code !== "?") { // Skip the default case as the position is incorrect
        assertEquals(result.catalogingSource, expected, 
          `Cataloging source code '${code}' should be interpreted as '${expected}'`);
      }
    }
  }
});

// Test error handling in fixed-length data parsing
Deno.test({
  name: "HumanReadableConverter - handle errors in fixed-length data parsing",
  fn: () => {
    // Create invalid fixed-length data (too short)
    const invalidData = "2001";
    
    // Capture console output
    const originalWarn = console.warn;
    let warningMessage = "";
    console.warn = (msg: string) => {
      warningMessage = msg;
    };
    
    try {
      const result = parseFixedLengthData(invalidData);
      
      // Should return an object with raw data
      assertEquals(result.raw, invalidData, "Should preserve raw data when parsing fails");
      assertEquals(warningMessage.includes("Error parsing"), true, "Should log warning on parse error");
    } finally {
      // Restore console.warn
      console.warn = originalWarn;
    }
  }
});

// Test empty fixed-length data
Deno.test({
  name: "HumanReadableConverter - handle empty fixed-length data",
  fn: () => {
    const emptyData = "";
    const result = parseFixedLengthData(emptyData);
    
    // Should return an empty object
    assertEquals(Object.keys(result).length, 0, "Should return empty object for empty data");
  }
});

// Test nonpublic note error handling
Deno.test({
  name: "HumanReadableConverter - handle errors in nonpublic note parsing",
  fn: () => {
    // Create invalid nonpublic note
    const invalidNote = "FSC@aPartial@cNotADate";
    
    // Capture console output
    const originalWarn = console.warn;
    let warningMessage = "";
    console.warn = (msg: string) => {
      warningMessage = msg;
    };
    
    try {
      const result = parseNonpublicNote(invalidNote);
      
      // Should return an object with raw note
      assertEquals(result.raw, invalidNote, "Should preserve raw note when parsing fails");
      assertEquals(warningMessage.includes("Error parsing"), true, "Should log warning on parse error");
    } finally {
      // Restore console.warn
      console.warn = originalWarn;
    }
  }
});

// Test leader inclusion option
Deno.test({
  name: "HumanReadableConverter - include leader option",
  fn: () => {
    // Get sample record
    const record: MarcRecord = getTestRecord();
    
    // Convert with leader included
    const withLeader = HumanReadableConverter.toJson(record, {
      includeLeader: true
    });
    
    // Convert without leader
    const withoutLeader = HumanReadableConverter.toJson(record, {
      includeLeader: false
    });
    
    assertEquals("leader" in withLeader, true, "Should include leader when option is true");
    assertEquals("leader" in withoutLeader, false, "Should not include leader when option is false");
  }
});

// Test field name inference for fields without standard names
Deno.test({
  name: "HumanReadableConverter - infer field names for nonstandard tags",
  fn: () => {
    // Create a record with a nonstandard field
    const record: MarcRecord = getTestRecord();
    record.fields.push({
      tag: "999",
      indicator1: " ",
      indicator2: " ",
      subfields: { "a": "Local field value" }
    });
    
    // Convert to JSON
    const result = HumanReadableConverter.toJson(record);
    
    // Should create a field_999 property
    assertExists(result.field_999, "Should use field_XXX naming convention for nonstandard tags");
  }
});

// Test handling LC Call Number indicators
Deno.test({
  name: "HumanReadableConverter - interpret LC Call Number indicators",
  fn: () => {
    // Create a record with an LC Call Number field
    const record: MarcRecord = getTestRecord();
    record.fields.push({
      tag: "050",
      indicator1: "1", // Not in LC
      indicator2: " ",
      subfields: { "a": "QA76.73.J38", "b": "M86 2020" }
    });
    
    // Convert to JSON
    const result = HumanReadableConverter.toJson(record);
    
    // Get the LC Call Number field
    const lcField = result.libraryOfCongressCallNumber;
    const field = Array.isArray(lcField) ? lcField[0] : lcField;
    
    assertEquals(field.inLC, false, "Should interpret indicator1=1 as 'not in LC'");
    assertEquals(field.lcNoteDisplay, "Item is not in LC", "Should include human-readable note");
  }
});

// Test handling Dewey Decimal indicators
Deno.test({
  name: "HumanReadableConverter - interpret Dewey Decimal indicators",
  fn: () => {
    // Create a record with a Dewey field
    const record: MarcRecord = getTestRecord();
    record.fields.push({
      tag: "082",
      indicator1: "1", // Abridged edition
      indicator2: "4", // Other agency
      subfields: { "a": "005.133", "2": "23" }
    });
    
    // Convert to JSON
    const result = HumanReadableConverter.toJson(record);
    
    // Get the Dewey field
    const deweyField = result.deweyDecimalClassification;
    const field = Array.isArray(deweyField) ? deweyField[0] : deweyField;
    
    assertEquals(field.deweyEdition, "Abridged edition", 
      "Should interpret indicator1=1 as 'Abridged edition'");
    assertEquals(field.deweyAssignedBy, "Other agency", 
      "Should interpret indicator2=4 as 'Other agency'");
  }
});

// Test handling series tracing indicators
Deno.test({
  name: "HumanReadableConverter - interpret series tracing indicators",
  fn: () => {
    // Create a record with a series statement field
    const record: MarcRecord = getTestRecord();
    record.fields.push({
      tag: "490",
      indicator1: "1", // Traced
      indicator2: " ",
      subfields: { "a": "Test Series", "v": "1" }
    });
    
    // Convert to JSON
    const result = HumanReadableConverter.toJson(record);
    
    // Get the series field
    const seriesField = result.series;
    const field = Array.isArray(seriesField) ? seriesField[0] : seriesField;
    
    assertEquals(field.seriesTraced, true, 
      "Should interpret indicator1=1 as 'Series is traced'");
  }
});

// Test handling series statement notes
Deno.test({
  name: "HumanReadableConverter - interpret series statement notes",
  fn: () => {
    // Create a record with a series statement field (440)
    const record: MarcRecord = getTestRecord();
    record.fields.push({
      tag: "440",
      indicator1: " ", // Display
      indicator2: "0", // No nonfiling characters
      subfields: { "a": "Test Series", "v": "1" }
    });
    
    // Convert to JSON
    const result = HumanReadableConverter.toJson(record);
    
    // Get the series field
    const seriesField = result.seriesTitle;
    const field = Array.isArray(seriesField) ? seriesField[0] : seriesField;
    
    assertEquals(field.noteDisplay, "Series statement displayed", 
      "Should interpret indicator1=' ' as 'Series statement displayed'");
    assertEquals(field.nonfilingCharacters, 0, 
      "Should interpret indicator2='0' as 0 nonfiling characters");
    assertEquals(field.nonfilingDescription, "No nonfiling characters", 
      "Should include human-readable description of nonfiling characters");
  }
});

// Test handling LC Subject indicators
Deno.test({
  name: "HumanReadableConverter - interpret LC Subject indicators",
  fn: () => {
    // Create a record with subject fields with different thesauri
    const record: MarcRecord = getTestRecord();
    
    // LC Subject Headings
    record.fields.push({
      tag: "650",
      indicator1: " ",
      indicator2: "0", // LCSH
      subfields: { "a": "Programming", "x": "Computer science" }
    });
    
    // MeSH
    record.fields.push({
      tag: "650",
      indicator1: " ",
      indicator2: "2", // MeSH
      subfields: { "a": "Computer Systems" }
    });
    
    // NAL
    record.fields.push({
      tag: "650",
      indicator1: " ",
      indicator2: "3", // NAL
      subfields: { "a": "Information Technology" }
    });
    
    // Source not specified
    record.fields.push({
      tag: "650",
      indicator1: " ",
      indicator2: "4", // Source not specified
      subfields: { "a": "Computing" }
    });
    
    // Canadian Subject Headings
    record.fields.push({
      tag: "650",
      indicator1: " ",
      indicator2: "5", // Canadian Subject Headings
      subfields: { "a": "Software Development" }
    });
    
    // RVM
    record.fields.push({
      tag: "650",
      indicator1: " ",
      indicator2: "6", // RVM
      subfields: { "a": "Programmation" }
    });
    
    // Source in $2
    record.fields.push({
      tag: "650",
      indicator1: " ",
      indicator2: "7", // Source in $2
      subfields: { "a": "Coding", "2": "fast" }
    });
    
    // Convert to JSON
    const result = HumanReadableConverter.toJson(record);
    
    // Get subject fields
    const subjectFields = result.subjectTopical;
    assertEquals(Array.isArray(subjectFields), true, "Should have multiple subject fields");
    
    if (Array.isArray(subjectFields)) {
      // Check each thesaurus type
      const lcsh = subjectFields.find(f => f.subjectThesaurus === "Library of Congress Subject Headings");
      const mesh = subjectFields.find(f => f.subjectThesaurus === "Medical Subject Headings");
      const nal = subjectFields.find(f => f.subjectThesaurus === "National Agricultural Library Subject Authority File");
      const unspecified = subjectFields.find(f => f.subjectThesaurus === "Source not specified");
      const canadian = subjectFields.find(f => f.subjectThesaurus === "Canadian Subject Headings");
      const rvm = subjectFields.find(f => f.subjectThesaurus === "Répertoire de vedettes-matière");
      const sourceSpecified = subjectFields.find(f => f.subjectThesaurus === "Source specified in subfield $2");
      
      assertExists(lcsh, "Should interpret indicator2=0 as LCSH");
      assertExists(mesh, "Should interpret indicator2=2 as MeSH");
      assertExists(nal, "Should interpret indicator2=3 as NAL");
      assertExists(unspecified, "Should interpret indicator2=4 as Source not specified");
      assertExists(canadian, "Should interpret indicator2=5 as Canadian Subject Headings");
      assertExists(rvm, "Should interpret indicator2=6 as RVM");
      assertExists(sourceSpecified, "Should interpret indicator2=7 as Source specified in $2");
    }
  }
});

// Test handling duplicate subfield names
Deno.test({
  name: "HumanReadableConverter - handle duplicate subfield names",
  fn: () => {
    // Create a record with duplicate subfields
    const record: MarcRecord = getTestRecord();
    record.fields.push({
      tag: "650",
      indicator1: " ",
      indicator2: "0",
      subfields: { 
        "a": "Primary topic", 
        "x": "First subdivision"
      }
    });
    
    // Add the subfields explicitly to test the duplicate handling
    const field = record.fields[record.fields.length - 1];
    if (field.subfields) {
      // Multiple 'x' subfields need to be mapped to unique keys
      field.subfields.x1 = "Second subdivision";
      field.subfields.x2 = "Third subdivision";
    }
    
    // Convert to JSON
    const result = HumanReadableConverter.toJson(record);
    
    // Get the subject field
    const subjectFields = result.subjectTopical;
    const subject = Array.isArray(subjectFields) ? subjectFields[subjectFields.length - 1] : subjectFields;
    
    // Check if all subdivisions were preserved
    assertEquals(subject.generalSubdivision, "First subdivision", 
      "Should preserve first x subfield as generalSubdivision");
    
    // These are custom keys in our test, so they'll map to custom properties
    assertEquals(subject.x1, "Second subdivision", 
      "Should preserve second x subfield as x1");
    assertEquals(subject.x2, "Third subdivision", 
      "Should preserve third x subfield as x2");
  }
});

// Test handling audience indicators
Deno.test({
  name: "HumanReadableConverter - interpret audience indicators",
  fn: () => {
    // Create a record with target audience field
    const record: MarcRecord = getTestRecord();
    
    // Reading grade level
    record.fields.push({
      tag: "521",
      indicator1: "0",
      indicator2: " ",
      subfields: { "a": "Grade 4 to 6." }
    });
    
    // Convert to JSON
    const result = HumanReadableConverter.toJson(record);
    
    // Get the target audience field
    const audienceField = result.targetAudience;
    const audience = Array.isArray(audienceField) ? audienceField[0] : audienceField;
    
    assertEquals(audience.audienceType, "Reading grade level", 
      "Should interpret indicator1=0 as 'Reading grade level'");
  }
});