import { RecordExporter } from "../src/recordExporter.ts";
import { MarcParser } from "../src/parser.ts";
import { HumanReadableConverter } from "../src/humanReadableConverter.ts";
import { assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { ensureDir, emptyDir } from "https://deno.land/std@0.181.0/fs/mod.ts";
import { getTestRecord } from "./sample_marc.ts";
import { join } from "https://deno.land/std@0.181.0/path/mod.ts";
import { MarcRecord } from "../src/types.ts";

const TEST_OUTPUT_DIR = join(Deno.cwd(), "test_output", "exporter");

// Setup: ensure test directory exists and is empty
Deno.test({
  name: "Setup test environment",
  fn: async () => {
    await ensureDir(TEST_OUTPUT_DIR);
    await emptyDir(TEST_OUTPUT_DIR);
  }
});

// Test basic record export functionality
Deno.test({
  name: "RecordExporter - export a single record",
  fn: async () => {
    // Get a sample record
    const sampleRecord: MarcRecord = getTestRecord();
    
    // Export the record
    const result = await RecordExporter.exportRecords([sampleRecord], {
      outputDir: TEST_OUTPUT_DIR,
      includeLeader: true,
      simplifyArrays: true,
      parseFixedFields: true
    });
    
    assertEquals(result.total, 1, "Should export 1 record");
    
    // Check if file was created
    const files = Array.from(Deno.readDirSync(TEST_OUTPUT_DIR));
    assertEquals(files.length, 1, "Should create 1 file");
    
    // Read the exported file
    const fileContent = await Deno.readTextFile(join(TEST_OUTPUT_DIR, files[0].name));
    const jsonData = JSON.parse(fileContent);
    
    // Verify structure
    assertExists(jsonData.metadata, "Should have metadata");
    assertExists(jsonData.record, "Should have record data");
    
    // Check identifier type
    assertExists(jsonData.metadata.identifierType, "Should have identifier type");
  }
});

// Test exporting multiple records
Deno.test({
  name: "RecordExporter - export multiple records with different identifiers",
  fn: async () => {
    // Create test records with different identifiers
    const record1: MarcRecord = getTestRecord();
    
    // Create record with ISBN
    const record2: MarcRecord = getTestRecord();
    const isbnField = {
      tag: "020",
      indicator1: " ",
      indicator2: " ",
      subfields: { "a": "9781234567890" }
    };
    record2.fields.push(isbnField);
    
    // Create record with control number
    const record3: MarcRecord = getTestRecord();
    record3.fields = record3.fields.filter(f => f.tag !== "001");
    record3.fields.unshift({
      tag: "001",
      value: "TEST12345"
    });
    
    // Export records
    const result = await RecordExporter.exportRecords([record1, record2, record3], {
      outputDir: TEST_OUTPUT_DIR,
      includeLeader: true,
      simplifyArrays: true,
      parseFixedFields: true
    });
    
    assertEquals(result.total, 3, "Should export 3 records");
    
    // Check if files were created
    const files = Array.from(Deno.readDirSync(TEST_OUTPUT_DIR));
    assertEquals(files.length, 3, "Should create 3 files");
    
    // Verify identifier types
    assertEquals(result.idTypes.isbn13, 1, "Should have 1 ISBN-13 record");
    assertEquals(result.idTypes.control, 1, "Should have 1 control record");
    
    // Read one of the files and check content
    const isbnFile = files.find(f => f.name.includes("9781234567890"));
    if (isbnFile) {
      const fileContent = await Deno.readTextFile(join(TEST_OUTPUT_DIR, isbnFile.name));
      const jsonData = JSON.parse(fileContent);
      assertEquals(jsonData.metadata.identifierType, "isbn13", "Should have ISBN-13 identifier type");
      assertEquals(jsonData.metadata.isbn, "9781234567890", "Should have correct ISBN");
    }
  }
});

// Test handling duplicate filenames
Deno.test({
  name: "RecordExporter - handle duplicate filenames",
  fn: async () => {
    // Create two records with the same control number
    const record1: MarcRecord = getTestRecord();
    record1.fields = record1.fields.filter(f => f.tag !== "001");
    record1.fields.unshift({
      tag: "001",
      value: "DUPLICATE"
    });
    
    const record2: MarcRecord = getTestRecord();
    record2.fields = record2.fields.filter(f => f.tag !== "001");
    record2.fields.unshift({
      tag: "001",
      value: "DUPLICATE"
    });
    
    // Export records
    const result = await RecordExporter.exportRecords([record1, record2], {
      outputDir: TEST_OUTPUT_DIR,
      includeLeader: true,
      simplifyArrays: true,
      parseFixedFields: true
    });
    
    assertEquals(result.total, 2, "Should export 2 records");
    
    // Check if files were created
    const files = Array.from(Deno.readDirSync(TEST_OUTPUT_DIR));
    assertEquals(files.length, 2, "Should create 2 files");
    
    // Verify the second file has a suffix
    const filenames = files.map(f => f.name);
    const hasSuffix = filenames.some(name => name.includes("_1"));
    assertEquals(hasSuffix, true, "One file should have a suffix");
  }
});

// Test metadata extraction
Deno.test({
  name: "RecordExporter - extractMetadata function",
  fn: () => {
    // Create a record with metadata
    const recordData = {
      leader: "00000nam a2200000 a 4500",
      controlNumber: "12345",
      isbn: "9781234567890",
      title: "Test Book",
      author: "Test Author",
      publication: {
        publisher: "Test Publisher",
        date: "2023"
      },
      fixedLengthData: {
        publicationDate: "2023",
        language: "eng"
      }
    };
    
    // Extract metadata
    // @ts-ignore: Access static method for testing
    const metadata = RecordExporter.extractMetadata(recordData);
    
    // Verify metadata
    assertEquals(metadata.title, "Test Book", "Should extract title");
    assertEquals(metadata.author, "Test Author", "Should extract author");
    assertEquals(metadata.isbn, "9781234567890", "Should extract ISBN");
    assertEquals(metadata.publicationYear, "2023", "Should extract publication year");
    assertEquals(metadata.publisher, "Test Publisher", "Should extract publisher");
    assertEquals(metadata.language, "eng", "Should extract language");
  }
});

// Test content hash generation
Deno.test({
  name: "RecordExporter - content hash generation",
  fn: async () => {
    // Create a record without ISBN or control number
    const record: MarcRecord = getTestRecord();
    record.fields = record.fields.filter(f => f.tag !== "001" && f.tag !== "020");
    
    // Add title and author for hash generation
    record.fields.push({
      tag: "245",
      indicator1: " ",
      indicator2: " ",
      subfields: { "a": "Hash Test Title" }
    });
    
    record.fields.push({
      tag: "100",
      indicator1: " ",
      indicator2: " ",
      subfields: { "a": "Hash Test Author" }
    });
    
    // Export the record
    const result = await RecordExporter.exportRecords([record], {
      outputDir: TEST_OUTPUT_DIR,
      includeLeader: true,
      simplifyArrays: true,
      parseFixedFields: true
    });
    
    assertEquals(result.total, 1, "Should export 1 record");
    assertEquals(result.idTypes.hash, 1, "Should use hash identifier type");
    
    // Check if file was created
    const files = Array.from(Deno.readDirSync(TEST_OUTPUT_DIR));
    const hashFile = files.find(f => f.name.includes("hash_"));
    assertExists(hashFile, "Should create a file with hash prefix");
  }
});

// Cleanup test directory after all tests
Deno.test({
  name: "Cleanup test environment",
  fn: async () => {
    await emptyDir(TEST_OUTPUT_DIR);
    await Deno.remove(TEST_OUTPUT_DIR);
  }
});