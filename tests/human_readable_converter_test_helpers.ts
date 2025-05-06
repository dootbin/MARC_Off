// Helper functions for testing private methods of HumanReadableConverter
import { HumanReadableConverter } from "../src/humanReadableConverter.ts";

// Create wrapper for private parseFixedLengthData method
export function parseFixedLengthData(data: string): Record<string, unknown> {
  // @ts-ignore: Access private method for testing
  return HumanReadableConverter.parseFixedLengthData(data);
}

// Create wrapper for private parseNonpublicNote method
export function parseNonpublicNote(noteText: string): Record<string, unknown> {
  // @ts-ignore: Access private method for testing
  return HumanReadableConverter.parseNonpublicNote(noteText);
}