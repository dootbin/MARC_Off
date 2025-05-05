import { assertEquals } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { MarcConverter } from "../src/converter.ts";
import { 
  EXPECTED_JSON_OUTPUT,
  EXPECTED_JSON_FLATTENED,
  getTestRecord
} from "./sample_marc.ts";

Deno.test("MarcConverter - convert to JSON with default options", () => {
  // Arrange
  const marcRecord = getTestRecord();
  
  // Act
  const result = MarcConverter.toJson(marcRecord);
  
  // Assert
  assertEquals(result, EXPECTED_JSON_OUTPUT, "Should convert MARC record to JSON with default options");
});

Deno.test("MarcConverter - convert to JSON with flattened subfields", () => {
  // Arrange
  const marcRecord = getTestRecord();
  const options = { flattenSubfields: true };
  
  // Act
  const result = MarcConverter.toJson(marcRecord, options);
  
  // Assert
  assertEquals(result, EXPECTED_JSON_FLATTENED, "Should convert MARC record to JSON with flattened subfields");
});

Deno.test("MarcConverter - convert to JSON with leader included", () => {
  // Arrange
  const marcRecord = getTestRecord();
  const options = { includeLeader: true };
  
  // Act
  const result = MarcConverter.toJson(marcRecord, options);
  
  // Assert
  assertEquals(result.leader, marcRecord.leader, "Should include leader in JSON output");
  assertEquals(result["001"], EXPECTED_JSON_OUTPUT["001"], "Field 001 should be converted correctly");
});

Deno.test("MarcConverter - batch convert multiple records", () => {
  // Arrange
  const marcRecords = [getTestRecord(), getTestRecord()];
  
  // Act
  const results = MarcConverter.batchToJson(marcRecords);
  
  // Assert
  assertEquals(results.length, 2, "Should return array with 2 converted records");
  assertEquals(results[0], EXPECTED_JSON_OUTPUT, "First record should be converted correctly");
  assertEquals(results[1], EXPECTED_JSON_OUTPUT, "Second record should be converted correctly");
});

Deno.test("MarcConverter - handle record with no fields", () => {
  // Arrange
  const emptyRecord = {
    leader: "00000nam a22000000a 4500",
    fields: []
  };
  
  // Act
  const result = MarcConverter.toJson(emptyRecord);
  
  // Assert
  assertEquals(Object.keys(result).length, 0, "Should return empty object for record with no fields");
});