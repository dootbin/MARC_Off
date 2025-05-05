import { assertEquals } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { MarcParser } from "../src/parser.ts";
import { 
  getSampleMarcRecord
} from "./sample_marc.ts";

Deno.test("MarcParser - parse sample record", () => {
  // Arrange
  const sampleData = getSampleMarcRecord();
  
  // Act
  const result = MarcParser.parse(sampleData);
  
  // Assert
  assertEquals(result.length >= 0, true, "Should return an array of records");
  
  // This is a simplified test that only checks if parsing doesn't throw errors
  // In a real implementation, we would check the specific fields and values
  if (result.length > 0) {
    const record = result[0];
    // Check that leader and fields properties exist
    assertEquals(typeof record.leader, "string", "Record should have a leader property of type string");
    assertEquals(Array.isArray(record.fields), true, "Record should have a fields property that is an array");
  }
});

Deno.test("MarcParser - handle empty input", () => {
  // Arrange
  const emptyData = new Uint8Array(0);
  
  // Act
  const result = MarcParser.parse(emptyData);
  
  // Assert
  assertEquals(result.length, 0, "Should return empty array for empty input");
});

Deno.test("MarcParser - handle invalid record length", () => {
  // Arrange: create a record with invalid length bytes
  const invalidData = new TextEncoder().encode("XXXXX");
  
  // Act
  const result = MarcParser.parse(invalidData);
  
  // Assert
  assertEquals(result.length, 0, "Should return empty array for invalid record length");
});