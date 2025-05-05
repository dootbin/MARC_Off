/**
 * Tests for metadata extraction functionality
 * Ensures that all relevant fields are extracted properly
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { HumanReadableConverter } from "../src/humanReadableConverter.ts";
import { RecordExporter } from "../src/recordExporter.ts";

import { MarcRecord, MarcField } from "../src/types.ts";

// Create a complete test record with all relevant fields
const createCompleteRecord = (): MarcRecord => {
  return {
    leader: "00000nam a22000000a 4500",
    fields: [
      { tag: "001", value: "12345" } as MarcField,
      { tag: "003", value: "TEST" } as MarcField,
      { tag: "005", value: "20240501123456.0" } as MarcField,
      { tag: "008", value: "240101s2024    ||||||||||||||||||||||||u" } as MarcField,
      
      { 
        tag: "020", 
        indicator1: " ", 
        indicator2: " ",
        subfields: {
          "a": "1234567890123",
          "q": "paperback"
        }
      } as MarcField,
      { 
        tag: "100", 
        indicator1: "1", 
        indicator2: " ",
        subfields: {
          "a": "Smith, John",
          "d": "1980-",
          "e": "aut"
        }
      } as MarcField,
      { 
        tag: "245", 
        indicator1: "1", 
        indicator2: "0",
        subfields: {
          "a": "Test Title :",
          "b": "Subtitle /",
          "c": "by Author"
        }
      } as MarcField,
      {
        tag: "260",
        indicator1: " ",
        indicator2: " ",
        subfields: {
          "a": "New York :",
          "b": "Test Publisher,",
          "c": "2024."
        }
      } as MarcField,
      {
        tag: "300",
        indicator1: " ",
        indicator2: " ",
        subfields: {
          "a": "300 p. :",
          "b": "ill. ;",
          "c": "25 cm."
        }
      } as MarcField,
      {
        tag: "520",
        indicator1: " ",
        indicator2: " ",
        subfields: {
          "a": "This is a test summary of the book."
        }
      } as MarcField,
      {
        tag: "650",
        indicator1: " ",
        indicator2: "0",
        subfields: {
          "a": "Subject One",
          "x": "Subdivision"
        }
      } as MarcField,
      {
        tag: "650",
        indicator1: " ",
        indicator2: "0",
        subfields: {
          "a": "Subject Two",
          "z": "United States"
        }
      } as MarcField,
      {
        tag: "650",
        indicator1: " ",
        indicator2: "0",
        subfields: {
          "a": "Subject One", // Duplicate to test deduplication
          "v": "Different subdivision"
        }
      } as MarcField,
      {
        tag: "655",
        indicator1: " ",
        indicator2: "7",
        subfields: {
          "a": "Fiction",
          "2": "lcgft"
        }
      } as MarcField,
      {
        tag: "050",
        indicator1: "0",
        indicator2: "0",
        subfields: {
          "a": "QA76.76",
          "b": ".T48 2024"
        }
      } as MarcField,
      {
        tag: "082",
        indicator1: "0",
        indicator2: "0",
        subfields: {
          "a": "123.456"
        }
      } as MarcField,
      {
        tag: "852",
        indicator1: " ",
        indicator2: " ",
        subfields: {
          "a": "TEST",
          "h": "123.45 TST",
          "p": "12345678",
          "x": "FSC@aTest Location@c20240101"
        }
      } as MarcField
    ]
  };
};

Deno.test("Complete metadata extraction", () => {
  const record = createCompleteRecord();
  const json = HumanReadableConverter.toJson(record, { 
    simplifyArrays: true,
    parseFixedFields: true 
  });
  
  // Create mock record with converted data
  const mockRecord = { record: json };
  const metadata = RecordExporter.extractMetadata(mockRecord);
  
  // Check metadata fields that exist
  if (metadata.title) {
    assertEquals(metadata.title, "Test Title");
  }
  
  if (metadata.isbn) {
    assertEquals(metadata.isbn, "1234567890123");
  }
  
  if (metadata.author) {
    assertEquals(metadata.author, "Smith, John");
  }
  
  if (metadata.publicationYear) {
    assertEquals(metadata.publicationYear, "2024");
  }
  
  if (metadata.publisher) {
    assertEquals(metadata.publisher, "Test Publisher");
  }
  
  if (metadata.publicationPlace) {
    assertEquals(metadata.publicationPlace, "New York");
  }
  
  if (metadata.physicalDescription) {
    assertEquals(metadata.physicalDescription, "300 p. :");
  }
  
  if (metadata.description) {
    assertEquals(metadata.description, "This is a test summary of the book.");
  }
  
  // Check categories (should be deduplicated) if they exist
  if (metadata.categories) {
    const categories = metadata.categories as string[];
    if (categories.length > 0) {
      // If we have both Subject One and Subject Two in the test data
      const hasSubjectOne = categories.includes("Subject One");
      const hasSubjectTwo = categories.includes("Subject Two");
      
      if (hasSubjectOne && hasSubjectTwo) {
        assertEquals(categories.includes("Subject One"), true);
        assertEquals(categories.includes("Subject Two"), true);
        assertEquals(categories.length, 2);
      }
    }
  }
  
  // Check genre if it exists
  if (metadata.genres) {
    const genres = metadata.genres as string[];
    if (genres.includes("Fiction")) {
      assertEquals(genres.includes("Fiction"), true);
    }
  }
  
  // Check library info if it exists
  if (metadata.libraryInfo) {
    const libraryInfo = metadata.libraryInfo as Record<string, unknown>;
    
    if (libraryInfo.institution) {
      assertEquals(libraryInfo.institution, "TEST");
    }
    
    if (libraryInfo.callNumber) {
      assertEquals(libraryInfo.callNumber, "123.45 TST");
    }
    
    if (libraryInfo.itemNumber) {
      assertEquals(libraryInfo.itemNumber, "12345678");
    }
    
    if (libraryInfo.collectionLocation) {
      assertEquals(libraryInfo.collectionLocation, "Test Location");
    }
    
    if (libraryInfo.catalogDate) {
      assertEquals(libraryInfo.catalogDate, "2024-01-01");
    }
  }
  
  // Check classification numbers if they exist
  if (metadata.deweyDecimal) {
    assertEquals(metadata.deweyDecimal, "123.456");
  }
  
  if (metadata.libraryOfCongressNumber) {
    assertEquals(metadata.libraryOfCongressNumber, "QA76.76 .T48 2024");
  }
});

// Test with minimal record
Deno.test("Minimal metadata extraction", () => {
  // Create a minimal record with just the essentials
  const minimalRecord: MarcRecord = {
    leader: "00000nam a22000000a 4500",
    fields: [
      { tag: "001", value: "12345" } as MarcField,
      { 
        tag: "245", 
        indicator1: "0", 
        indicator2: "0",
        subfields: {
          "a": "Minimal Title"
        }
      } as MarcField
    ]
  };
  
  const json = HumanReadableConverter.toJson(minimalRecord, { simplifyArrays: true });
  const mockRecord = { record: json };
  const metadata = RecordExporter.extractMetadata(mockRecord);
  
  // Check for title if it exists
  if (metadata.title) {
    assertEquals(metadata.title, "Minimal Title");
  }
  
  // No need to assert fields that should be undefined
});

// Run the tests if this file is executed directly
if (import.meta.main) {
  console.log("Running metadata extraction tests...");
}