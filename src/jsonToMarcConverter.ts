/**
 * Converts JSON files back to MARC format
 */

import { walk } from "https://deno.land/std@0.181.0/fs/walk.ts";
import { MarcRecord, MarcField } from "./types.ts";

// Reverse mapping from human-readable field names to MARC tags
const FIELD_NAMES_REVERSE: Record<string, string> = {
  // Control Fields (001-009)
  "controlNumber": "001",
  "controlNumberIdentifier": "003",
  "lastModifiedDate": "005",
  "additionalMaterialCharacteristics": "006",
  "physicalDescriptionFixed": "007",
  "fixedLengthData": "008",
  
  // Standard Number and Code Fields (010-049)
  "libraryOfCongressControlNumber": "010",
  "patentControlInformation": "013",
  "nationalBibliographyNumber": "015",
  "nationalBibliographicAgencyControlNumber": "016",
  "copyrightRegistrationNumber": "017",
  "copyrightArticleFeeCodes": "018",
  "isbn": "020",
  "issn": "022",
  "otherStandardIdentifier": "024",
  "overseasAcquisitionNumber": "025",
  "fingerprintIdentifier": "026",
  "standardTechnicalReportNumber": "027",
  "publisherNumber": "028",
  "coden": "030",
  "musicalIncipitInformation": "031",
  "postalRegistrationNumber": "032",
  "dateTimeAndPlaceOfEvent": "033",
  "cartographicMathematicalDataCoded": "034",
  "systemControlNumber": "035",
  "originalStudyNumber": "036",
  "sourceOfAcquisition": "037",
  "recordContentLicensor": "038",
  "catalogingSource": "040",
  "languageCode": "041",
  "authenticationCode": "042",
  "geographicAreaCode": "043",
  "countryOfPublishingProducingCode": "044",
  "timePeriodsOfContent": "045",
  "specialCodedDates": "046",
  "formOfMusicalCompositionCode": "047",
  "numberOfMusicalInstrumentsOrVoicesCode": "048",
  "localHoldings": "049",
  
  // Classification and Call Number Fields (050-099)
  "libraryOfCongressCallNumber": "050",
  "libraryOfCongressCopyIssueOffprint": "051",
  "geographicClassification": "052",
  "classificationNumbersAssignedInCanada": "055",
  "nationalLibraryOfMedicineCallNumber": "060",
  "nationalLibraryOfMedicineCopyStatement": "061",
  "characterSetsPresent": "066",
  "nationalAgriculturalLibraryCallNumber": "070",
  "nationalAgriculturalLibraryCopyStatement": "071",
  "subjectCategoryCode": "072",
  "universalDecimalClassificationNumber": "080",
  "deweyDecimalClassification": "082",
  "additionalDeweyDecimalClassification": "083",
  "otherClassificationNumber": "084",
  "governmentDocumentClassificationNumber": "086",
  "field_090": "090", // Local call number field
  "field_092": "092", // Local call number field
  
  // Main Entry Fields (100-130)
  "author": "100",
  "corporateAuthor": "110",
  "mainCorporateAuthor": "110",
  "meetingName": "111",
  "mainMeetingName": "111",
  "uniformTitle": "130", // Use 130 for main entry uniform title
  "mainUniformTitle": "130",
  "field_130": "130", // Added for field_130 format
  
  // Title and Title-Related Fields (210-247)
  "abbreviatedTitle": "210",
  "keyTitle": "222",
  "uniformTitle": "130", // Changed from 240 to 130 to match original MARC
  "translationOfTitle": "242",
  "collectiveUniformTitle": "243",
  "title": "245",
  "variantTitle": "246", // Consistently use variantTitle for 246
  "alternativeTitle": "246", // Map both names to the same field
  "formerTitle": "247",
  "field_246": "246", // Added to handle field_246 format
  
  // Edition, Imprint, Etc. Fields (250-297)
  "edition": "250",
  "musicalPresentationStatement": "254",
  "musicalPresentation": "254",
  "cartographicMathematicalData": "255",
  "computerFileCharacteristics": "256",
  "countryOfProducingEntity": "257",
  "philatelicIssueData": "258",
  "publication": "260",
  "projectedPublicationDate": "263", // Projected Publication Date
  "productionPublicationDistribution": "264",
  "productionPublication": "264",
  "addressInformation": "270",
  
  // Physical Description Fields (300-342)
  "physicalDescription": "300",
  "playingTime": "306",
  "hoursInformation": "307",
  "currentPublicationFrequency": "310",
  "formerPublicationFrequency": "321",
  "contentType": "336",
  "mediaType": "337",
  "carrierType": "338",
  "physicalMedium": "340",
  "dimensions": "340",
  "field_362": "362", // Publication dates
  "additionalPhysicalForm": "530", // Maps to additional physical form available
  
  // Series Statement Fields (440-490)
  "seriesTitle": "440", // Consistently use seriesTitle for 440
  "seriesStatement": "440", // Both map to the same field 440
  "series": "490", // Map series to 490
  
  // Note Fields (500-599)
  "generalNote": "500",
  "withNote": "501",
  "dissertationNote": "502",
  "bibliographyNote": "504",
  "contentsNote": "505",
  "accessRestrictionNote": "506",
  "restrictionsOnAccessNote": "506",
  "scaleNoteForGraphicMaterial": "507",
  "creationProductionCreditsNote": "508", 
  "creationCreditsNote": "508",
  "citationReferenceNote": "510",
  "citationReferencesNote": "510",
  "participantOrPerformerNote": "511",
  "participantPerformerNote": "511",
  "typeOfReportAndPeriodCoveredNote": "513",
  "dataQualityNote": "514",
  "numberingPeculiaritiesNote": "515",
  "typeOfComputerFileOrDataNote": "516",
  "dateTimePlaceOfEventNote": "518",
  "summary": "520",
  "targetAudience": "521",
  "geographicCoverageNote": "522",
  "preferredCitationOfDescribedMaterialsNote": "524",
  "supplementNote": "525",
  "supplementaryContentNote": "525",
  "studyProgramInformation": "526",
  "additionalPhysicalFormAvailable": "530",
  "reproductionNote": "533",
  "originalVersionNote": "534",
  "locationOfOriginalsNote": "535",
  "locationOfOtherCopiesNote": "535",
  "fundingInformationNote": "536",
  "systemDetails": "538",
  "systemDetailsNote": "538",
  "termsGoverningUseAndReproductionNote": "540",
  "immediateSourceOfAcquisitionNote": "541",
  
  // Summary, Etc. Fields
  "biographicalOrHistoricalData": "545",
  "languageNote": "546",
  "formerTitleComplexityNote": "547",
  "issuingBodyNote": "550",
  "entityAndAttributeInformationNote": "552",
  "cumulativeIndexFindingAidsNote": "555",
  "informationAboutDocumentationNote": "556",
  "ownershipAndCustodialHistory": "561",
  "copyAndVersionIdentificationNote": "562",
  "bindingInformation": "563",
  "field_580": "580", // Linking entry complexity note
  "linkingEntryComplexityNote": "580",
  "field_586": "586", // Awards note
  
  // Subject Access Fields (600-699)
  "subjectPersonName": "600",
  "subjectCorporateName": "610",
  "subjectMeetingName": "611",
  "subjectUniformTitle": "630",
  "subjectNamedEvent": "647",
  "subjectChronologicalTerm": "648",
  "subjectTopical": "650",
  "subjectGeographic": "651",
  "indexTerm": "653",
  "subjectFacetedTopical": "654",
  "subjectFacetTerm": "654",
  "genreForm": "655",
  "indexTermOccupation": "656",
  "indexTermFunction": "657",
  "field_690": "690", // Local subject access field
  "field_691": "691", // Local subject access field
  
  // Added Entry Fields (700-799)
  "additionalAuthor": "700",
  "additionalCorporateAuthor": "710",
  "additionalMeetingName": "711",
  "addedEntryUncontrolledName": "720",
  "additionalUniformTitle": "730",
  "additionalUncontrolledTitle": "740",
  "addedEntryGeographicName": "751",
  "additionalNameTitle": "744",
  
  // Linking Entry Fields (760-787)
  "mainSeriesEntry": "760",
  "subseriesEntry": "762",
  "originalLanguageEntry": "765",
  "translationEntry": "767",
  "supplementEntry": "770",
  "parentRecord": "772",
  "hostItem": "773",
  "field_775": "775", // Other edition entry
  "otherEditionEntry": "775",
  "field_776": "776", // Additional physical form entry
  "additionalPhysicalFormEntry": "776",
  "field_787": "787", // Other relationship entry
  "otherRelationshipEntry": "787",
  
  // Series Added Entry Fields (800-899)
  "seriesAddedEntryPersonalName": "800",
  "seriesAddedEntryCorporateName": "810",
  "seriesAddedEntryMeetingName": "811",
  "seriesAddedEntryUniformTitle": "830",
  "seriesAddedEntry": "830",
  
  // Holdings, Location, Etc. Fields
  "holdingsInformation": "841",
  "textualPhysicalFormDesignator": "842",
  "holdingInstitution": "850",
  "location": "852",
  "electronicLocation": "856", // Electronic Location and Access
  "electronicLocationAndAccessNote": "856",
  "localSystemInfo": "961",
  "holdingsQuantity": "866",
  "textualHoldingsForBasicBibliographicUnit": "866",
  
  // Local fields (9XX)
  "field_900": "900", // Local added author/title field
  "field_904": "904", // Local processing field
  "field_906": "906", // Local processing field
  "field_940": "940", // Reading level and related information
  "field_941": "941", // Local field
  "field_942": "942", // Local field
  "field_949": "949", // Local holdings information
  "field_950": "950", // Local processing information
  "awardsNote": "586", // Awards note that was getting missed
  
  // Additional item type field (maps to additional physical form)
  "additionalItemType": "776",
  
  // Special fields
  "metadata": "metadata" // This will be handled specially
};

// Indicator name mappings (reverse)
const INDICATOR1_NAMES_REVERSE: Record<string, Record<string, string>> = {
  // Personal and corporate name fields
  "nameType": {
    "100": "1", // Default for personal name (surname)
    "700": "1",
    "600": "1",
    "800": "1",
    "110": "2", // Corporate name
    "710": "2",
    "610": "2", 
    "810": "2",
    "111": "2", // Meeting name
    "711": "2",
    "611": "2",
    "811": "2"
  },
  // Title fields
  "titleAddedEntry": {
    "245": "1" // Default to added entry
  },
  // Variant title display/note fields
  "noteControllerType": {
    "246": "3" // Default to "No note, added entry"
  },
  // Call number and classification fields
  "inLC": {
    "050": "0" // Default to "Item is in LC"
  },
  "deweyEdition": {
    "082": "0" // Default to "Full edition"
  },
  "deweyIndicator1": {
    "082": "0" // Ensure indicator1 is always 0 for Dewey
  },
  // Publication fields
  "publicationSequence": {
    "260": " " // Default to not applicable
  },
  "productionSequence": {
    "264": " " 
  },
  // Series fields
  "seriesTracing": {
    "490": "1" // Default to traced
  },
  // Location fields
  "shelvingScheme": {
    "852": " " // Default to No information provided
  },
  // Electronic location fields
  "accessMethod": {
    "856": "4" // Default to HTTP
  },
  // Form/Genre fields
  "typeOfHeading": {
    "655": "0" // Default to faceted
  },
  // Name form indicators
  "nameForm": {
    "100": "1", // Surname
    "700": "1",
    "600": "1", 
    "800": "1"
  }
};

const INDICATOR2_NAMES_REVERSE: Record<string, Record<string, string>> = {
  // Title filing indicators
  "nonfilingCharacters": {
    "245": "0", // Default to no characters are ignored
    "240": "0",
    "246": "0",
    "730": "0",
    "740": "0",
    "830": "0",
    "440": "0"
  },
  // Subject headings source
  "subjectSystem": {
    "650": "0", // Default to LCSH
    "600": "0",
    "610": "0",
    "611": "0",
    "630": "0",
    "651": "0",
    "655": "0"
  },
  // Variant title display
  "displayType": {
    "246": "0" // Default display constant "No type specified"
  },
  // Call number indicators
  "lcSubjectType": {
    "050": " " // No subject subdivision
  },
  // Dewey indicators
  "deweyAssignedBy": {
    "082": "0" // Default to "Assigned by LC"
  },
  "deweyIndicator2": {
    "082": "0" // Ensure indicator2 is consistent 
  },
  // Name added entry type
  "type": {
    "700": "0", // Default type
    "710": "0",
    "711": "0",
    "730": "0",
    "740": "0"
  },
  "nameAddedEntryType": {
    "700": "0",
    "710": "0",
    "711": "0"
  },
  "uniformTitleType": {
    "730": "0" 
  },
  "uncontrolledTitleType": {
    "740": "0"
  },
  // Electronic location
  "relationship": {
    "856": "0" // Default to "Resource"
  },
  // Physical location
  "shelvingOrder": {
    "852": " " // Default to "No information provided"
  }
};

/**
 * Options for JSON to MARC conversion
 */
export interface JsonToMarcOptions {
  verbose?: boolean;
  sortByControlNumber?: boolean;
  preserveFieldOrder?: boolean;
  ignoreParseErrors?: boolean;
}

/**
 * Converts JSON files back to MARC format
 */
export class JsonToMarcConverter {
  private options: JsonToMarcOptions;
  
  /**
   * Create a new JSON to MARC converter
   * @param options Conversion options
   */
  constructor(options: JsonToMarcOptions = {}) {
    this.options = {
      verbose: false,
      sortByControlNumber: true,
      preserveFieldOrder: true,
      ignoreParseErrors: true,
      ...options
    };
  }
  
  /**
   * Convert a directory of JSON files to MARC format
   * @param directoryPath Path to directory containing JSON files
   * @returns MARC data as Uint8Array
   */
  public async convertDirectory(directoryPath: string): Promise<Uint8Array> {
    const jsonFiles = await this.findJsonFiles(directoryPath);
    
    if (this.options.verbose) {
      console.log(`Found ${jsonFiles.length} JSON files in ${directoryPath}`);
    }
    
    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in directory: ${directoryPath}`);
    }
    
    // Read and parse all JSON files
    const jsonRecords: Record<string, unknown>[] = [];
    let processedCount = 0;
    
    for (const filePath of jsonFiles) {
      try {
        const fileContent = await Deno.readTextFile(filePath);
        const jsonData = JSON.parse(fileContent);
        
        // Check if this is a valid record with metadata and record sections
        if (jsonData && typeof jsonData === "object" && jsonData.record) {
          jsonRecords.push(jsonData);
        } else {
          console.warn(`Warning: Skipping invalid JSON file: ${filePath} (missing record structure)`);
        }
        
        // Log progress
        processedCount++;
        if (this.options.verbose && processedCount % 500 === 0) {
          console.log(`Processed ${processedCount} of ${jsonFiles.length} JSON files...`);
        }
      } catch (error) {
        if (this.options.ignoreParseErrors) {
          console.warn(`Warning: Error reading/parsing JSON file ${filePath}: ${error.message}`);
        } else {
          throw new Error(`Error reading/parsing JSON file ${filePath}: ${error.message}`);
        }
      }
    }
    
    if (this.options.verbose) {
      console.log(`Successfully parsed ${jsonRecords.length} JSON records`);
    }
    
    // Sort records by control number for deterministic output (important for testing)
    if (this.options.sortByControlNumber) {
      jsonRecords.sort((a, b) => {
        const aControlNum = this.getControlNumberFromRecord(a);
        const bControlNum = this.getControlNumberFromRecord(b);
        return aControlNum.localeCompare(bControlNum);
      });
    }
    
    // Convert JSON records to MARC records
    const marcRecords: MarcRecord[] = [];
    
    for (let i = 0; i < jsonRecords.length; i++) {
      try {
        const record = this.convertJsonToMarc(jsonRecords[i]);
        marcRecords.push(record);
        
        // Log progress
        if (this.options.verbose && (i + 1) % 500 === 0) {
          console.log(`Converted ${i + 1} of ${jsonRecords.length} records to MARC format...`);
        }
      } catch (error) {
        console.warn(`Warning: Error converting record ${i + 1}: ${error.message}`);
      }
    }
    
    if (this.options.verbose) {
      console.log(`Successfully converted ${marcRecords.length} records to MARC format`);
    }
    
    // Encode records to MARC binary format
    return this.encodeMarcRecords(marcRecords);
  }
  
  /**
   * Find all JSON files in a directory
   * @param directoryPath Path to directory
   * @returns Array of file paths
   */
  private async findJsonFiles(directoryPath: string): Promise<string[]> {
    const fileEntries = walk(directoryPath, {
      exts: ["json"],
      includeDirs: false,
      followSymlinks: false
    });
    
    const filePaths: string[] = [];
    for await (const entry of fileEntries) {
      filePaths.push(entry.path);
    }
    
    return filePaths;
  }
  
  /**
   * Get control number from a record for sorting
   * @param record JSON record
   * @returns Control number string or empty string if not found
   */
  private getControlNumberFromRecord(record: Record<string, unknown>): string {
    // First check if the control number exists in the record object
    if (record.record && typeof record.record === "object") {
      const recordData = record.record as Record<string, unknown>;
      
      // Check for controlNumber field (001)
      if (recordData.controlNumber) {
        if (Array.isArray(recordData.controlNumber)) {
          return String(recordData.controlNumber[0] || "");
        }
        return String(recordData.controlNumber || "");
      }
      
      // Check raw 001 field if it exists
      if (recordData["001"] && Array.isArray(recordData["001"])) {
        return String(recordData["001"][0] || "");
      }
    }
    
    // Check in metadata section as fallback
    if (record.metadata && typeof record.metadata === "object") {
      const metadata = record.metadata as Record<string, unknown>;
      if (metadata.controlNumber) {
        return String(metadata.controlNumber);
      }
    }
    
    // If no control number, try identifier or ISBN
    if (record.metadata && typeof record.metadata === "object") {
      const metadata = record.metadata as Record<string, unknown>;
      
      if (metadata.identifier) {
        return String(metadata.identifier);
      }
      
      if (metadata.isbn) {
        return String(metadata.isbn);
      }
    }
    
    // Return empty string if nothing found
    return "";
  }
  
  /**
   * Convert a JSON record to MARC format
   * @param jsonData JSON record data
   * @returns MARC record
   */
  private convertJsonToMarc(jsonData: Record<string, unknown>): MarcRecord {
    // Check the structure - we can handle both direct record structure or metadata+record structure
    let recordData: Record<string, unknown>;
    
    if (jsonData.record && typeof jsonData.record === "object") {
      // The record has a metadata/record structure from RecordExporter
      recordData = jsonData.record as Record<string, unknown>;
      
      // If there's metadata, look for additional fields not in the record
      if (jsonData.metadata && typeof jsonData.metadata === "object") {
        const metadata = jsonData.metadata as Record<string, unknown>;
        
        // Process metadata fields that might not be in the record
        // This helps recover fields that might have been moved to metadata during export
        for (const [fieldName, fieldValue] of Object.entries(metadata)) {
          if (fieldValue === undefined || fieldValue === null) {
            continue;
          }
          
          // Add important fields that will be preserved if they exist in metadata only
          const importantFields = [
            "isbn", "controlNumber", "authorTitle", "systemControlNumber", 
            "targetAudience", "electronicLocation", "studyProgramInformation"
          ];
          
          if (importantFields.includes(fieldName) && 
              (!recordData[fieldName] || recordData[fieldName] === undefined)) {
            // Copy field from metadata to recordData
            recordData[fieldName] = fieldValue;
          }
        }
      }
    } else {
      // Direct record structure - use as is
      recordData = jsonData;
    }
    
    // If record is still invalid, throw an error
    if (!recordData || typeof recordData !== "object") {
      throw new Error("Invalid JSON record structure: missing or invalid record data");
    }
    
    let fields: MarcField[] = [];
    
    // Extract leader if present, or create a default one that conforms to MARC21 standards
    // Format: 00000nam a2200000 a 4500
    // Pos 5: 'n' = new record
    // Pos 6: 'a' = language material
    // Pos 7: 'm' = monograph/item
    // Pos 8: ' ' = undefined
    // Pos 9: 'a' = UCS/Unicode
    // Pos 10-11: '22' = indicator count and subfield code count
    // Pos 12-16: filled in during encoding with base address
    // Pos 17-19: set to encoding level and other values
    // Pos 20-23: entry map - always '4500'
    let leader = "00000nam a22000004a 4500"; // Default leader
    if (recordData.leader && typeof recordData.leader === "string") {
      leader = recordData.leader;
      
      // Ensure basic positions in the leader are valid
      if (leader.length === 24) {
        // Leader positions that must have specific values according to MARC21
        if (leader.charAt(10) !== '2') leader = leader.substring(0, 10) + '2' + leader.substring(11);
        if (leader.charAt(11) !== '2') leader = leader.substring(0, 11) + '2' + leader.substring(12);
        
        // Entry map must be '4500'
        if (leader.substring(20) !== '4500') leader = leader.substring(0, 20) + '4500';
        
        // Ensure record type, bibliographic level, etc. are valid
        const validRecordTypes = ['a', 'c', 'd', 'e', 'f', 'g', 'i', 'j', 'k', 'm', 'o', 'p', 'r', 't'];
        if (!validRecordTypes.includes(leader.charAt(6).toLowerCase())) {
          leader = leader.substring(0, 6) + 'a' + leader.substring(7);
        }
        
        const validBibLevels = ['a', 'b', 'c', 'd', 'i', 'm', 's'];
        if (!validBibLevels.includes(leader.charAt(7).toLowerCase())) {
          leader = leader.substring(0, 7) + 'm' + leader.substring(8);
        }
      }
    }
    
    // Store all field data in a map first, for ordering
    const fieldMap = new Map<string, MarcField[]>();
    
    // Process each field in the record
    for (const [fieldName, fieldValue] of Object.entries(recordData)) {
      // Skip undefined or null values
      if (fieldValue === undefined || fieldValue === null) {
        continue;
      }
      
      // Skip the special metadata field if it exists
      if (fieldName === "metadata") {
        continue;
      }
      
      // Find the corresponding MARC tag
      const tag = FIELD_NAMES_REVERSE[fieldName] || this.inferTagFromFieldName(fieldName);
      if (!tag) {
        if (this.options.verbose) {
          console.warn(`Warning: Could not determine MARC tag for field: ${fieldName}`);
        }
        continue;
      }
      
      // Process the field based on its type and store in map
      const tempFields: MarcField[] = [];
      if (tag < "010") {
        // Control fields (001-009) - simple string values
        this.processControlField(tag, fieldValue, tempFields);
      } else {
        // Data fields (010+) - may have indicators and subfields
        this.processDataField(tag, fieldName, fieldValue, tempFields);
      }
      
      // Add to map
      if (tempFields.length > 0) {
        fieldMap.set(tag, (fieldMap.get(tag) || []).concat(tempFields));
      }
    }
    
    // If we're preserving field order, arrange fields by tag number
    if (this.options.preserveFieldOrder) {
      // Define the standard MARC field order
      const fieldOrder = [
        // Control fields
        "001", "003", "005", "006", "007", "008",
        // Bibliographic fields
        "010", "013", "015", "016", "017", "018", "019", "020", "022", "024", "025", "026", "027", "028",
        "030", "031", "032", "033", "034", "035", "036", "037", "038", "040", "041", "042", "043",
        "044", "045", "046", "047", "048", "049",
        // Classification
        "050", "051", "052", "055", "060", "061", "066", "069", "070", "071", "072", "074", "080", "082", "083", "084", "086", "090", "092", "099",
        // Main entry
        "100", "110", "111", "130",
        // Title
        "210", "222", "240", "242", "243", "245", "246", "247",
        // Edition
        "250", "254", "255", "256", "257", "258", "260", "263", "264", "270",
        // Physical description
        "300", "306", "307", "310", "321", "336", "337", "338", "340", "342", "343", "344", "345", "346", "347", "348", "351", "352", "355", "357", "362", "363", "365", "366", "370", "377", "380", "381", "382", "383", "384", "385", "386", "388",
        // Series
        "490",
        // Notes
        "500", "501", "502", "504", "505", "506", "507", "508", "510", "511", "513", "514", "515", "516", "518", "520", "521", "522", "524", "525", "526", "530", "533", "534", "535", "536", "538", "540", "541", "542", "545", "546", "547", "550", "552", "555", "556", "561", "562", "563", "565", "567", "580", "581", "583", "584", "585", "586", "588", "590",
        // Subject access
        "600", "610", "611", "630", "647", "648", "650", "651", "653", "654", "655", "656", "657", "658", "662", "688", "690", "691",
        // Added entry
        "700", "710", "711", "720", "730", "740", "751", "752", "753", "754", "758", "775", "776", "787",
        // Series added entry
        "800", "810", "811", "830", "841", "842", "843", "844", "845", "846", "850", "852", "853", "854", "855", "856", "863", "864", "865", "866", "867", "868", "876", "877", "878", "880", "882", "883", "884", "885", "886", "887",
        // Holdings, Alternate graphics, Local fields
        "900", "901", "902", "903", "904", "905", "906", "907", "909", "910", "926", "936", "940", "941", "942", "945", "946", "947", "949", "950", "951", "952", "961", "980", "981", "984", "990", "994"
      ];
      
      // Create ordered array by following the defined field order
      let orderedFields: MarcField[] = [];
      
      // First add fields in the standard order
      for (const tag of fieldOrder) {
        if (fieldMap.has(tag)) {
          orderedFields = orderedFields.concat(fieldMap.get(tag) || []);
          fieldMap.delete(tag); // Remove to track what we've processed
        }
      }
      
      // Then add any remaining fields (those not in our standard list)
      for (const [tag, tagFields] of fieldMap.entries()) {
        orderedFields = orderedFields.concat(tagFields);
      }
      
      fields = orderedFields;
    } else {
      // If not preserving order, just flatten the map to an array
      fields = Array.from(fieldMap.values()).flat();
    }
    
    return { leader, fields };
  }
  
  /**
   * Process a control field (001-009)
   * @param tag MARC tag
   * @param fieldValue Field value
   * @param fields Array to add the field to
   */
  private processControlField(tag: string, fieldValue: unknown, fields: MarcField[]): void {
    // Control fields should be simple strings or arrays of strings
    if (typeof fieldValue === "string") {
      fields.push({
        tag,
        value: fieldValue
      });
    } else if (Array.isArray(fieldValue)) {
      // Handle array of values (rare but possible)
      for (const item of fieldValue) {
        if (typeof item === "string") {
          fields.push({
            tag,
            value: item
          });
        } else if (typeof item === "object" && item !== null) {
          // If it's an object (like a parsed fixed-length field), try to get the raw value
          const itemObj = item as Record<string, unknown>;
          if (itemObj.raw && typeof itemObj.raw === "string") {
            fields.push({
              tag,
              value: itemObj.raw
            });
          }
        }
      }
    } else if (typeof fieldValue === "object" && fieldValue !== null) {
      // For structured control fields, use raw value if available
      const fieldObject = fieldValue as Record<string, unknown>;
      if (fieldObject.raw && typeof fieldObject.raw === "string") {
        fields.push({
          tag,
          value: fieldObject.raw
        });
      } else if (tag === "008" && fieldObject.dateEntered) {
        // Special handling for 008 field, try to reconstruct the raw format if raw value is missing
        try {
          // Attempt to reconstruct the fixed-length data from parts
          const dateEntered = String(fieldObject.dateEntered || "").replace(/-/g, "");
          const dateType = String(fieldObject.dateType || " ").charAt(0);
          const publicationDate = String(fieldObject.publicationDate || "    ");
          const publicationDate2 = String(fieldObject.publicationDate2 || "    ");
          const publicationPlace = String(fieldObject.publicationPlace || "   ");
          const illustrations = String(fieldObject.illustrations || "    ");
          const targetAudience = String(fieldObject.targetAudience || " ");
          const itemForm = String(fieldObject.itemForm || " ");
          const contentNature = String(fieldObject.contentNature || "    ");
          const govPublication = String(fieldObject.govPublication || " ");
          const conferencePublication = String(fieldObject.conferencePublication || " ");
          const festschrift = String(fieldObject.festschrift || " ");
          const index = String(fieldObject.index || " ");
          const undefinedPos = "        ";
          const literaryForm = String(fieldObject.literaryForm || " ");
          const biography = String(fieldObject.biography || " ");
          const language = String(fieldObject.language || "   ");
          const modifiedRecord = String(fieldObject.modifiedRecord || " ");
          const catalogingSource = String(fieldObject.catalogingSource || " ");
          
          const reconstructed = 
            dateEntered.padEnd(6, " ") +
            dateType +
            publicationDate.padEnd(4, " ") +
            publicationDate2.padEnd(4, " ") +
            publicationPlace.padEnd(3, " ") +
            illustrations.padEnd(4, " ") +
            targetAudience +
            itemForm +
            contentNature.padEnd(4, " ") +
            govPublication +
            conferencePublication +
            festschrift +
            index +
            undefinedPos +
            literaryForm +
            biography +
            language.padEnd(3, " ") +
            modifiedRecord +
            catalogingSource;
          
          fields.push({
            tag,
            value: reconstructed.padEnd(40, " ")
          });
        } catch (e) {
          // If reconstruction fails, log warning and use JSON string
          if (this.options.verbose) {
            console.warn(`Warning: Could not reconstruct 008 field: ${e.message}`);
          }
          fields.push({
            tag,
            value: JSON.stringify(fieldValue)
          });
        }
      } else {
        // Try to convert object back to a string
        fields.push({
          tag,
          value: JSON.stringify(fieldValue)
        });
      }
    }
  }
  
  /**
   * Process a data field (010+)
   * @param tag MARC tag
   * @param fieldName Original field name
   * @param fieldValue Field value
   * @param fields Array to add the field to
   */
  private processDataField(tag: string, fieldName: string, fieldValue: unknown, fields: MarcField[]): void {
    // Special handling for specific fields that often have multiple values
    const multiValueFields = ["020", "035", "650", "651", "655", "521", "526", "856"];
    
    // Data fields can be objects, arrays, or simple values
    if (Array.isArray(fieldValue)) {
      // Handle array of fields
      for (const item of fieldValue) {
        this.processDataFieldItem(tag, fieldName, item, fields);
      }
    } else if (typeof fieldValue === "object" && multiValueFields.includes(tag)) {
      // For fields that commonly have multiple values but might be represented as a single object,
      // try to process as if it's an array element to maintain consistency
      this.processDataFieldItem(tag, fieldName, fieldValue, fields);
      
      // Special case for ISBN - try to extract all ISBNs if multiple are present
      if (tag === "020") {
        const isbnObj = fieldValue as Record<string, unknown>;
        
        // If there are multiple ISBNs in different fields within the object
        const possibleIsbns = ["isbn", "isbn10", "isbn13", "otherIsbn"];
        
        for (const isbnField of possibleIsbns) {
          if (isbnObj[isbnField] && isbnObj[isbnField] !== isbnObj.isbn) {
            // Create a new field for this ISBN
            this.processDataFieldItem(tag, fieldName, { 
              isbn: isbnObj[isbnField],
              additionalInfo: isbnObj.additionalInfo 
            }, fields);
          }
        }
      }
    } else {
      // Single field
      this.processDataFieldItem(tag, fieldName, fieldValue, fields);
    }
  }
  
  /**
   * Process a single data field item
   * @param tag MARC tag
   * @param fieldName Original field name
   * @param fieldValue Field value
   * @param fields Array to add the field to
   */
  private processDataFieldItem(tag: string, fieldName: string, fieldValue: unknown, fields: MarcField[]): void {
    if (typeof fieldValue === "string") {
      // Simple string value - create field with standard subfields
      fields.push({
        tag,
        indicator1: " ",
        indicator2: " ",
        subfields: { "a": fieldValue }
      });
    } else if (typeof fieldValue === "object" && fieldValue !== null) {
      const fieldObject = fieldValue as Record<string, unknown>;
      const marcField: MarcField = { tag };
      
      // Process indicators
      if (fieldObject.indicator1 !== undefined) {
        if (typeof fieldObject.indicator1 === "string") {
          marcField.indicator1 = fieldObject.indicator1;
        } else if (typeof fieldObject.indicator1 === "object" && fieldObject.indicator1 !== null) {
          // Handle structured indicator objects
          const ind1Obj = fieldObject.indicator1 as Record<string, unknown>;
          if (ind1Obj.code && typeof ind1Obj.code === "string") {
            marcField.indicator1 = ind1Obj.code;
          }
        }
      } else {
        // Try to infer indicator1 from field name
        marcField.indicator1 = this.inferIndicator1(fieldName, tag);
      }
      
      if (fieldObject.indicator2 !== undefined) {
        if (typeof fieldObject.indicator2 === "string") {
          marcField.indicator2 = fieldObject.indicator2;
        } else if (typeof fieldObject.indicator2 === "object" && fieldObject.indicator2 !== null) {
          // Handle structured indicator objects
          const ind2Obj = fieldObject.indicator2 as Record<string, unknown>;
          if (ind2Obj.code && typeof ind2Obj.code === "string") {
            marcField.indicator2 = ind2Obj.code;
          }
        }
      } else {
        // Try to infer indicator2
        marcField.indicator2 = this.inferIndicator2(fieldName, tag);
      }
      
      // Ensure indicators have values
      marcField.indicator1 = marcField.indicator1 || " ";
      marcField.indicator2 = marcField.indicator2 || " ";
      
      // Process subfields
      const subfields: Record<string, string> = {};
      
      // Special case for parsedNonpublicNote, which needs to be converted back
      if (fieldName === "location" && fieldObject.parsedNonpublicNote) {
        const parsedNote = fieldObject.parsedNonpublicNote as Record<string, unknown>;
        if (parsedNote.raw && typeof parsedNote.raw === "string") {
          subfields["x"] = parsedNote.raw as string;
        } else {
          // Reconstruct from parsed components
          const code = parsedNote.code || "FSC";
          const location = parsedNote.location || "";
          const rawDate = parsedNote.rawDate || "";
          subfields["x"] = `${code}@a${location}@c${rawDate}`;
        }
      }
      
      // Special case handling for fields that need consistent treatment
      if (tag === "240") {
        // Uniform Title field (non-main entry)
        if (fieldObject.value) {
          subfields["a"] = String(fieldObject.value);
        } else if (fieldObject.title) {
          subfields["a"] = String(fieldObject.title);
        } else if (fieldObject.uniformTitle) {
          subfields["a"] = String(fieldObject.uniformTitle);
        } else if (fieldObject.mainTitle) {
          subfields["a"] = String(fieldObject.mainTitle);
        }
        
        // Handle additional uniform title subfields if present
        if (fieldObject.language) {
          subfields["l"] = String(fieldObject.language);
        }
        if (fieldObject.form) {
          subfields["k"] = String(fieldObject.form);
        }
        if (fieldObject.date) {
          subfields["f"] = String(fieldObject.date);
        }
        if (fieldObject.version) {
          subfields["s"] = String(fieldObject.version);
        }
        if (fieldObject.medium) {
          subfields["h"] = String(fieldObject.medium);
        }
        if (fieldObject.partNumber) {
          subfields["n"] = String(fieldObject.partNumber);
        }
        if (fieldObject.partName) {
          subfields["p"] = String(fieldObject.partName);
        }
      }
      else if (tag === "246") {
        // Variant Title field - handle both string value and structured format
        if (fieldObject.value) {
          subfields["a"] = String(fieldObject.value);
        } else if (fieldObject.variantTitle) {
          subfields["a"] = String(fieldObject.variantTitle);
        } else if (fieldObject.alternativeTitle) {
          subfields["a"] = String(fieldObject.alternativeTitle);
        } else if (fieldObject.title) {
          subfields["a"] = String(fieldObject.title);
        }
        
        // Add portion subfields if present
        if (fieldObject.partNumber) {
          subfields["n"] = String(fieldObject.partNumber);
        }
        if (fieldObject.partName) {
          subfields["p"] = String(fieldObject.partName);
        }
        if (fieldObject.remainderOfTitle || fieldObject.subtitle) {
          subfields["b"] = String(fieldObject.remainderOfTitle || fieldObject.subtitle);
        }
      }
      else if (tag === "263") {
        // Projected Publication Date - ensure proper format (YYMMDD)
        if (fieldObject.value) {
          subfields["a"] = String(fieldObject.value);
        } else if (fieldObject.projectedPublicationDate) {
          subfields["a"] = String(fieldObject.projectedPublicationDate);
        } else if (fieldObject.date) {
          // Try to format date as YYMMDD if it's in a different format
          const dateValue = String(fieldObject.date);
          
          // If it's in YYYY-MM-DD format, convert to YYMMDD
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            const year = dateValue.substring(2, 4);
            const month = dateValue.substring(5, 7);
            const day = dateValue.substring(8, 10);
            subfields["a"] = `${year}${month}${day}`;
          } else if (/^\d{4}$/.test(dateValue)) {
            // If it's just a year, convert to YY00
            const year = dateValue.substring(2, 4);
            subfields["a"] = `${year}00`;
          } else {
            // If it's in another format, use as-is
            subfields["a"] = dateValue;
          }
        }
      }
      else if (tag === "440") {
        // Series Title field - handle both string value and structured format
        if (fieldObject.value) {
          subfields["a"] = String(fieldObject.value);
        } else if (fieldObject.title) {
          subfields["a"] = String(fieldObject.title);
        } else if (fieldObject.seriesTitle) {
          subfields["a"] = String(fieldObject.seriesTitle);
        } else if (fieldObject.seriesStatement) {
          subfields["a"] = String(fieldObject.seriesStatement);
        }
        
        // Add volume if present in any format
        if (fieldObject.volume) {
          subfields["v"] = String(fieldObject.volume);
        } else if (fieldObject.seriesVolume) {
          subfields["v"] = String(fieldObject.seriesVolume);
        } else if (fieldObject.number) {
          subfields["v"] = String(fieldObject.number);
        }
        
        // Add ISSN if present
        if (fieldObject.issn) {
          subfields["x"] = String(fieldObject.issn);
        }
        
        // Add statement of responsibility if present
        if (fieldObject.statementOfResponsibility) {
          subfields["c"] = String(fieldObject.statementOfResponsibility);
        }
      }
      // Special case for Title field with Uniform Title
      else if (tag === "245" && fieldObject.mainTitle) {
        // Add main title as subfield a
        subfields["a"] = String(fieldObject.mainTitle);
        
        // Add subtitle if present
        if (fieldObject.subtitle) {
          subfields["b"] = String(fieldObject.subtitle);
        } else if (fieldObject.version) {
          // Some systems use version for subtitles
          subfields["s"] = String(fieldObject.version);
        }
        
        // Add statement of responsibility if present
        if (fieldObject.statementOfResponsibility) {
          subfields["c"] = String(fieldObject.statementOfResponsibility);
        }
      }
      // Special case for Series Title
      else if (tag === "440" && fieldObject.title) {
        // Add series title as subfield a
        subfields["a"] = String(fieldObject.title);
        
        // Add volume if present
        if (fieldObject.volume) {
          subfields["v"] = String(fieldObject.volume);
        }
      }
      // Special case for Publication
      else if (tag === "260") {
        // Add place, publisher, date
        if (fieldObject.place) {
          subfields["a"] = String(fieldObject.place);
        }
        if (fieldObject.publisher) {
          subfields["b"] = String(fieldObject.publisher);
        }
        if (fieldObject.date) {
          subfields["c"] = String(fieldObject.date);
        }
      }
      // Otherwise process standard subfields
      else {
        // Handle standard subfields
        for (const [key, value] of Object.entries(fieldObject)) {
          // Skip indicators and special fields
          if (key === "indicator1" || key === "indicator2" || 
              key === "ind1" || key === "ind2" || 
              key === "subfields" || key === "parsedNonpublicNote" ||
              key === "nameForm" || key === "titleIncludesAddedEntry" ||
              key === "nonfilingDescription" || key === "subjectThesaurus") {
            continue;
          }
          
          if (typeof value === "string" || typeof value === "number") {
            // Use the first letter of the key as the subfield code, or 'a' if empty
            const subfieldCode = this.getSubfieldCodeForKey(key);
            subfields[subfieldCode] = String(value);
          }
        }
      }
      
      // Handle explicit subfields array if present
      if (fieldObject.subfields) {
        if (Array.isArray(fieldObject.subfields)) {
          // Array of code-value pairs
          for (const subfield of fieldObject.subfields) {
            if (typeof subfield === "object" && subfield !== null) {
              const subfieldObj = subfield as Record<string, unknown>;
              if (subfieldObj.code && subfieldObj.value) {
                const code = String(subfieldObj.code);
                const value = String(subfieldObj.value);
                subfields[code] = value;
              }
            }
          }
        } else if (typeof fieldObject.subfields === "object" && fieldObject.subfields !== null) {
          // Direct object mapping
          const subfieldObj = fieldObject.subfields as Record<string, unknown>;
          for (const [code, value] of Object.entries(subfieldObj)) {
            if (value !== undefined && value !== null) {
              subfields[code] = String(value);
            }
          }
        }
      }
      
      // If no subfields were found but there's a value field, use that
      if (Object.keys(subfields).length === 0 && fieldObject.value) {
        subfields["a"] = String(fieldObject.value);
      }
      
      // Only add the field if it has subfields
      if (Object.keys(subfields).length > 0) {
        marcField.subfields = subfields;
        fields.push(marcField);
      }
    }
  }
  
  /**
   * Infer a MARC tag from a field name
   * @param fieldName Field name
   * @returns MARC tag or empty string if can't be determined
   */
  private inferTagFromFieldName(fieldName: string): string {
    // Handle numeric field names directly
    if (/^\d{3}$/.test(fieldName)) {
      return fieldName;
    }
    
    // Handle field_XXX format fields (common in library systems)
    if (/^field_\d{3}$/.test(fieldName)) {
      const tag = fieldName.substring(6, 9);
      return tag;
    }
    
    // Try to find a close match in the reverse mapping
    for (const [key, tag] of Object.entries(FIELD_NAMES_REVERSE)) {
      if (fieldName.toLowerCase().includes(key.toLowerCase())) {
        return tag;
      }
    }
    
    return "";
  }
  
  /**
   * Infer indicator 1 value from field name and tag
   * @param fieldName Field name
   * @param tag MARC tag
   * @returns Indicator value
   */
  private inferIndicator1(fieldName: string, tag: string): string {
    // Check each indicator type in the reverse mapping
    for (const [indicatorName, tagMappings] of Object.entries(INDICATOR1_NAMES_REVERSE)) {
      if (tagMappings[tag]) {
        return tagMappings[tag];
      }
    }
    
    return " "; // Default to blank
  }
  
  /**
   * Infer indicator 2 value from field name and tag
   * @param fieldName Field name
   * @param tag MARC tag
   * @returns Indicator value
   */
  private inferIndicator2(fieldName: string, tag: string): string {
    // Check each indicator type in the reverse mapping
    for (const [indicatorName, tagMappings] of Object.entries(INDICATOR2_NAMES_REVERSE)) {
      if (tagMappings[tag]) {
        return tagMappings[tag];
      }
    }
    
    return " "; // Default to blank
  }
  
  /**
   * Get a standard subfield code for a key
   * @param key The key name
   * @returns Subfield code (usually the first letter)
   */
  private getSubfieldCodeForKey(key: string): string {
    // Comprehensive subfield mappings for all MARC fields
    const mappings: Record<string, string> = {
      // Primary field content subfields (a-z)
      "term": "a",
      "name": "a",
      "mainTitle": "a",
      "title": "a",
      "value": "a",
      "place": "a",
      "publisher": "b",
      "date": "c",
      "extent": "a",
      "otherPhysicalDetails": "b",
      "dimensions": "c",
      "statementOfResponsibility": "c",
      "additionalValue": "b",
      "note": "a",
      "summary": "a",
      "isbn": "a",
      "additionalInfo": "c",
      "institution": "a",
      "callNumber": "h",
      "sublocation": "b",
      "pieceDesignation": "p",
      
      // Subject field subdivisions (650, 600, etc.)
      "generalSubdivision": "x",
      "chronologicalSubdivision": "y",
      "geographicSubdivision": "z",
      "formSubdivision": "v",
      "sourceThesaurus": "2",
      "topicalSubdivision": "x",
      "subdivision": "x",
      "period": "y",
      "location": "z",
      "form": "v",
      "sourceCode": "2",
      
      // Personal name fields (100, 700, etc.)
      "surname": "a",
      "forename": "a",
      "dates": "d",
      "fullName": "q",
      "titles": "c",
      "role": "e",
      "relationship": "i",
      "affiliationOrAddress": "u",
      "relatorCode": "4",
      "authority": "0",
      "authorityURI": "1",
      "numeration": "b",
      
      // Title fields (245, 246, etc.)
      "subtitle": "b",
      "medium": "h",
      "partNumber": "n",
      "partName": "p",
      "remainderOfTitle": "b",
      "inclusiveDates": "f",
      "bulkDates": "g",
      "version": "s",
      
      // Publication and Series fields (260, 440, etc.)
      "volume": "v",
      "issn": "x",
      "manufacturer": "f",
      "qualifyingInformation": "q",
      "edition": "b",
      "publicationDate": "c",
      "distributor": "b",
      "manufacture": "f",
      "copyrightDate": "c",
      "issueDesignation": "g",
      "seriesTitle": "a",
      "seriesVolume": "v",
      
      // Physical description fields (300, etc.)
      "accompanyingMaterial": "e",
      "materialSpecified": "3",
      "size": "c",
      "format": "q",
      
      // Note fields (500, 505, etc.)
      "bibliographyNote": "a",
      "contentsNote": "a",
      "expansion": "b",
      "statement": "a",
      "standardNumber": "u",
      "citation": "a",
      "coverage": "a",
      
      // Organization and Electronic location fields
      "materials": "3",
      "programName": "a",
      "interestLevel": "b",
      "readingLevel": "c",
      "points": "d",
      "url": "u",
      "linkText": "y",
      "host": "u",
      "accessMethod": "2",
      "availability": "z",
      
      // Holdings information fields
      "shelvingLocation": "c",
      "itemPart": "i",
      "shelfControlNumber": "j",
      "callNumberPrefix": "k",
      "shelvingForm": "l",
      "callNumberSuffix": "m",
      "countryCode": "n",
      "piecePhysicalCondition": "q",
      "copyrightArticleFeeCode": "s",
      "copyNumber": "t",
      "nonpublicNote": "x",
      
      // Local system info fields
      "transactionNumber": "t",
      "action": "a",
      "batchNumber": "b",
      "cataloger": "c",
      "hours": "h",
      "itemType": "i",
      "locationCode": "l",
      "minutes": "m",
      "operator": "o",
      "seconds": "s",
      "workstationID": "w",
      
      // Standard numerical subfields
      "standardNumberIdentifier": "a",
      "qualifyingTerms": "q",
      "cancellationDate": "z",
      "oclcNumber": "a",
      "lccn": "a",
      "identificationNumber": "a",
      
      // Other common subfields
      "miscellaneous": "g",
      "form": "k",
      "language": "l",
      "number": "n",
      "arrangedStatement": "o",
      "part": "p",
      "key": "r",
      "completeness": "6",
      "dataElements": "7",
      "fieldLinkAndSequence": "8",
      "pictorialContent": "7",
      "index": "x",
      "otherIdentifier": "z",
      
      // Control subfields (0-9) 
      "authorityRecordControlNumber": "0",
      "uri": "1",
      "source": "2",
      "materialsSpecified": "3",
      "relationshipCode": "4",
      "linkage": "6",
      "dataProvenance": "7",
      "fieldLinkSequence": "8",
      "localUse": "9",
      
      // Additional mappings for common field types
      "locationNote": "z",
      "classNumber": "a",
      "itemNumber": "b",
      "cutter": "b",
      "edition": "a",
      "issuing": "a",
      "description": "a",
      "restriction": "a",
      "target": "a",
      "system": "a",
      "fundingInformation": "a",
      "reproduction": "a",
      "originalVersion": "a",
      "access": "a",
      "ownership": "a",
      "action": "a",
      "history": "a",
      "policy": "a",
      "terms": "a",
      "copyright": "a",
      "restrictions": "a",
      "electronic": "a"
    };
    
    // If we have a specific mapping, use it
    if (mappings[key]) {
      return mappings[key];
    }
    
    // Otherwise, use the first letter
    if (key.length > 0) {
      return key.charAt(0).toLowerCase();
    }
    
    // Default to 'a' if all else fails
    return "a";
  }
  
  /**
   * Encode MARC records to binary format
   * @param records Array of MARC records
   * @returns Binary MARC data
   */
  private encodeMarcRecords(records: MarcRecord[]): Uint8Array {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    
    for (const record of records) {
      chunks.push(this.encodeMarcRecord(record));
    }
    
    // Join all record chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }
  
  /**
   * Encode a single MARC record to binary format
   * @param record MARC record
   * @returns Binary MARC data for record
   */
  private encodeMarcRecord(record: MarcRecord): Uint8Array {
    const encoder = new TextEncoder();
    
    // Ensure the leader is properly formatted before continuing
    if (!record.leader || record.leader.length < 24) {
      // If leader is missing or too short, create a default one that conforms to MARC21
      record.leader = "00000nam a22000000a 4500";
    } else if (record.leader.length > 24) {
      // If leader is too long, truncate it to the proper length
      record.leader = record.leader.substring(0, 24);
    }
    
    // Placeholder for final record data
    const directory: string[] = [];
    const fieldData: Uint8Array[] = [];
    let dataOffset = 0;
    
    // Process each field
    for (const field of record.fields) {
      const fieldBytes = this.encodeField(field);
      
      // Add entry to directory
      const tag = field.tag;
      const length = fieldBytes.length;
      const startPos = dataOffset;
      
      // Format: tag (3 chars) + length (4 chars) + start position (5 chars)
      const directoryEntry = tag.padEnd(3, " ") + 
                            String(length).padStart(4, "0") + 
                            String(startPos).padStart(5, "0");
      
      directory.push(directoryEntry);
      fieldData.push(fieldBytes);
      dataOffset += length;
    }
    
    // Calculate base address of data
    const baseAddress = 24 + (directory.length * 12) + 1;
    
    // Assemble the parts to calculate the final length
    const leaderBytes = encoder.encode("00000" + record.leader.substring(5)); // Placeholder leader
    const directoryBytes = encoder.encode(directory.join(""));
    const directoryTerminator = new Uint8Array([0x1E]); // Field terminator
    const recordTerminator = new Uint8Array([0x1D]); // Record terminator
    
    // Calculate total record length
    const recordLength = leaderBytes.length + directoryBytes.length + 
                         directoryTerminator.length + dataOffset + recordTerminator.length;
    
    // Update leader with correct length and base address
    // Ensure leader always follows MARC21 format requirements:
    // - Positions 10-11 must be '22' (indicator and subfield code counts)
    // - Position 20-23 must be '4500' (entry map)
    // - Use standardized values for other positions when possible
    
    let updatedLeader = String(recordLength).padStart(5, "0");
    
    // Extract values from existing leader
    const recordStatus = record.leader.length > 5 ? record.leader.charAt(5) : ' ';
    const recordType = record.leader.length > 6 ? record.leader.charAt(6).toLowerCase() : 'a';
    const bibLevel = record.leader.length > 7 ? record.leader.charAt(7).toLowerCase() : 'm';
    const controlType = record.leader.length > 8 ? record.leader.charAt(8) : ' ';
    const charCodingScheme = record.leader.length > 9 ? record.leader.charAt(9) : 'a';
    
    // Position 5: Record status - valid codes: a, c, d, n, p, ' '
    const validStatus = ['a', 'c', 'd', 'n', 'p', ' '];
    updatedLeader += validStatus.includes(recordStatus) ? recordStatus : 'n';
    
    // Position 6: Record type - valid codes: a, c, d, e, f, g, i, j, k, m, o, p, r, t
    const validTypes = ['a', 'c', 'd', 'e', 'f', 'g', 'i', 'j', 'k', 'm', 'o', 'p', 'r', 't'];
    updatedLeader += validTypes.includes(recordType) ? recordType : 'a';
    
    // Position 7: Bibliographic level - valid codes: a, b, c, d, i, m, s
    const validBibLevels = ['a', 'b', 'c', 'd', 'i', 'm', 's'];
    updatedLeader += validBibLevels.includes(bibLevel) ? bibLevel : 'm';
    
    // Position 8: Control type - valid codes: ' ', 'a'
    const validControlTypes = [' ', 'a'];
    updatedLeader += validControlTypes.includes(controlType) ? controlType : ' ';
    
    // Position 9: Character coding scheme - valid codes: 'a', ' '
    const validCodingSchemes = ['a', ' '];
    updatedLeader += validCodingSchemes.includes(charCodingScheme) ? charCodingScheme : 'a';
    
    // Positions 10-11: Indicator count and subfield code count - must be '22'
    updatedLeader += '22';
    
    // Positions 12-16: Base address of data
    updatedLeader += String(baseAddress).padStart(5, "0");
    
    // Positions 17-19: Encoding level, descriptive cataloging form, and multipart resource record level
    // These positions have specific meanings in MARC21
    if (record.leader.length >= 20) {
      // Use values from original leader if available
      updatedLeader += record.leader.substring(17, 20);
    } else {
      // Default values: ' ' for encoding level, 'a' for descriptive cataloging form, ' ' for multipart level
      updatedLeader += ' a ';
    }
    
    // Positions 20-23: Entry map - must be '4500'
    updatedLeader += '4500';
    
    const updatedLeaderBytes = encoder.encode(updatedLeader);
    
    // Create the final result array
    const result = new Uint8Array(recordLength);
    let offset = 0;
    
    // Set leader
    result.set(updatedLeaderBytes, offset);
    offset += updatedLeaderBytes.length;
    
    // Set directory
    result.set(directoryBytes, offset);
    offset += directoryBytes.length;
    
    // Set directory terminator
    result.set(directoryTerminator, offset);
    offset += directoryTerminator.length;
    
    // Set field data
    for (const field of fieldData) {
      result.set(field, offset);
      offset += field.length;
    }
    
    // Add record terminator
    result.set(recordTerminator, offset);
    
    if (this.options.verbose) {
      console.log(`Encoded record: ${updatedLeader} (${recordLength} bytes)`);
    }
    
    return result;
  }
  
  /**
   * Encode a single MARC field to binary format
   * @param field MARC field
   * @returns Binary field data
   */
  private encodeField(field: MarcField): Uint8Array {
    const encoder = new TextEncoder();
    
    if (field.tag < "010") {
      // Control field: just the value and a field terminator
      const value = field.value || "";
      const valueBytes = encoder.encode(value);
      const result = new Uint8Array(valueBytes.length + 1);
      result.set(valueBytes);
      result[valueBytes.length] = 0x1E; // Field terminator
      return result;
    } else {
      // Data field: indicators + subfields + field terminator
      const chunks: Uint8Array[] = [];
      
      // Add indicators
      const indicator1 = field.indicator1 || " ";
      const indicator2 = field.indicator2 || " ";
      chunks.push(encoder.encode(indicator1 + indicator2));
      
      // Add subfields
      if (field.subfields) {
        for (const [code, value] of Object.entries(field.subfields)) {
          const delimiter = new Uint8Array([0x1F]); // Subfield delimiter
          const subfieldCode = encoder.encode(code);
          const subfieldValue = encoder.encode(value);
          
          chunks.push(delimiter);
          chunks.push(subfieldCode);
          chunks.push(subfieldValue);
        }
      }
      
      // Add field terminator
      chunks.push(new Uint8Array([0x1E]));
      
      // Calculate total length
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      
      // Copy all chunks to result
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    }
  }
}