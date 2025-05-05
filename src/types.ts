/**
 * Types for MARC record processing
 */

export interface MarcField {
  tag: string;
  indicator1?: string;
  indicator2?: string;
  subfields?: Record<string, string>;
  value?: string;
}

export interface MarcRecord {
  leader: string;
  fields: MarcField[];
}

export interface ConversionOptions {
  includeLeader?: boolean;
  flattenSubfields?: boolean;
}