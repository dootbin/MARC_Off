import { MarcRecord, ConversionOptions } from "./types.ts";

/**
 * Extended conversion options for human-readable output
 */
export interface HumanReadableOptions extends ConversionOptions {
  /**
   * If true, simplify single-element arrays to direct values
   */
  simplifyArrays?: boolean;
  
  /**
   * If true, parse fixed-length fields into meaningful objects
   */
  parseFixedFields?: boolean;
}

/**
 * Fields that should always remain as arrays even if they have only one value
 */
const ALWAYS_ARRAY_FIELDS = new Set([
  "subjectTopical",
  "subjectGeographic",
  "genreForm",
  "additionalAuthor",
  "additionalCorporateAuthor", 
  "notes"
]);

/**
 * Fields that should be directly presented as strings, not objects with properties
 */
const SIMPLE_STRING_FIELDS = new Set([
  "controlNumber",
  "lastModifiedDate",
  "isbn",
  "issn",
  "libraryOfCongressControlNumber",
  "deweyDecimalClassification",
  "catalogingSource"
]);

/**
 * Maps MARC field tags to human-readable field names
 */
const FIELD_NAMES: Record<string, string> = {
  // Control Fields (001-009)
  "001": "controlNumber",
  "003": "controlNumberIdentifier",
  "005": "lastModifiedDate",
  "006": "additionalMaterialCharacteristics",
  "007": "physicalDescriptionFixed",
  "008": "fixedLengthData",
  
  // Standard Number and Code Fields (010-049)
  "010": "libraryOfCongressControlNumber",
  "013": "patentControlInformation",
  "015": "nationalBibliographyNumber",
  "016": "nationalBibliographicAgencyControlNumber",
  "017": "copyrightRegistrationNumber",
  "018": "copyrightArticleFeeCodes",
  "020": "isbn",
  "022": "issn",
  "024": "otherStandardIdentifier",
  "025": "overseasAcquisitionNumber",
  "026": "fingerprintIdentifier",
  "027": "standardTechnicalReportNumber",
  "028": "publisherNumber",
  "030": "coden",
  "031": "musicalIncipitInformation",
  "032": "postalRegistrationNumber",
  "033": "dateTimeAndPlaceOfEvent",
  "034": "cartographicMathematicalDataCoded",
  "035": "systemControlNumber",
  "036": "originalStudyNumber",
  "037": "sourceOfAcquisition",
  "038": "recordContentLicensor",
  "040": "catalogingSource",
  "041": "languageCode",
  "042": "authenticationCode",
  "043": "geographicAreaCode",
  "044": "countryOfPublishingProducingCode",
  "045": "timePeriodsOfContent",
  "046": "specialCodedDates",
  "047": "formOfMusicalCompositionCode",
  "048": "numberOfMusicalInstrumentsOrVoicesCode",
  "049": "localHoldings",
  
  // Classification and Call Number Fields (050-099)
  "050": "libraryOfCongressCallNumber",
  "051": "libraryOfCongressCopyIssueOffprint",
  "052": "geographicClassification",
  "055": "classificationNumbersAssignedInCanada",
  "060": "nationalLibraryOfMedicineCallNumber",
  "061": "nationalLibraryOfMedicineCopyStatement",
  "066": "characterSetsPresent",
  "070": "nationalAgriculturalLibraryCallNumber",
  "071": "nationalAgriculturalLibraryCopyStatement",
  "072": "subjectCategoryCode",
  "080": "universalDecimalClassificationNumber",
  "082": "deweyDecimalClassification",
  "083": "additionalDeweyDecimalClassification",
  "084": "otherClassificationNumber",
  "085": "synthesizedClassificationNumber",
  "086": "governmentDocumentClassificationNumber",
  "088": "reportNumber",
  
  // Main Entry Fields (100-130)
  "100": "author",
  "110": "corporateAuthor",
  "111": "meetingName",
  "130": "uniformTitle", // Main entry uniform title
  
  // Title and Title-Related Fields (210-247)
  "210": "abbreviatedTitle",
  "222": "keyTitle",
  "240": "uniformTitle", // Non-main entry uniform title (same semantic meaning as 130)
  "242": "translationOfTitle",
  "243": "collectiveUniformTitle",
  "245": "title",
  "246": "variantTitle", // Consistently use variantTitle for field 246
  "247": "formerTitle",
  
  // Edition, Imprint, etc. Fields (250-270)
  "250": "edition",
  "254": "musicalPresentationStatement",
  "255": "cartographicMathematicalData",
  "256": "computerFileCharacteristics",
  "257": "countryOfProducingEntity",
  "258": "philatelicIssueData",
  "260": "publication",
  "263": "projectedPublicationDate", // Explicit mapping for projected publication date
  "264": "productionPublicationDistribution",
  "270": "addressInformation",
  
  // Physical Description Fields (300-362)
  "300": "physicalDescription",
  "306": "playingTime",
  "307": "hoursInformation",
  "310": "currentPublicationFrequency",
  "321": "formerPublicationFrequency",
  "336": "contentType",
  "337": "mediaType",
  "338": "carrierType",
  "340": "physicalMedium",
  "342": "geospatialReferencedData",
  "343": "planarCoordinateData",
  "344": "soundCharacteristics",
  "345": "projectionCharacteristicsOfMovingImage",
  "346": "videoCharacteristics",
  "347": "digitalFileCharacteristics",
  "348": "notatedMusicCharacteristics",
  "351": "organizationAndArrangementOfMaterials",
  "352": "digitalGraphicRepresentation",
  "355": "securityClassificationControl",
  "357": "originatorDisseminationControl",
  "362": "datesOfPublication",
  
  // Series Statement Fields (440-490)
  "440": "seriesTitle", // Consistently use seriesTitle for field 440
  "490": "series",
  
  // Note Fields (500-599)
  "500": "generalNote",
  "501": "withNote",
  "502": "dissertationNote",
  "504": "bibliographyNote",
  "505": "contentsNote",
  "506": "accessRestrictionNote",
  "507": "scaleNoteForGraphicMaterial",
  "508": "creationProductionCreditsNote",
  "510": "citationReferenceNote",
  "511": "participantOrPerformerNote",
  "513": "typeOfReportAndPeriodCoveredNote",
  "514": "dataQualityNote",
  "515": "numberingPeculiaritiesNote",
  "516": "typeOfComputerFileOrDataNote",
  "518": "dateTimePlaceOfEventNote",
  "520": "summary",
  "521": "targetAudience",
  "522": "geographicCoverageNote",
  "524": "preferredCitationOfDescribedMaterialsNote",
  "525": "supplementNote",
  "526": "studyProgramInformation",
  "530": "additionalPhysicalFormAvailable",
  "533": "reproductionNote",
  "534": "originalVersionNote",
  "535": "locationOfOriginalsNote",
  "536": "fundingInformationNote",
  "538": "systemDetails",
  "540": "termsGoverningUseAndReproductionNote",
  "541": "immediateSourceOfAcquisitionNote",
  "542": "informationRelatingToCopyrightStatus",
  "544": "locationOfOtherArchivalMaterialsNote",
  "545": "biographicalOrHistoricalData",
  "546": "languageNote",
  "547": "formerTitleComplexityNote",
  "550": "issuingBodyNote",
  "552": "entityAndAttributeInformationNote",
  "555": "cumulativeIndexFindingAidsNote",
  "556": "informationAboutDocumentationNote",
  "561": "ownershipAndCustodialHistory",
  "562": "copyAndVersionIdentificationNote",
  "563": "bindingInformation",
  "565": "caseFileCharacteristicsNote",
  "567": "methodologyNote",
  "580": "linkingEntryComplexityNote",
  "581": "publicationsAboutDescribedMaterialsNote",
  "583": "actionNote",
  "584": "accumulationAndFrequencyOfUseNote",
  "585": "exhibitionsNote",
  "586": "awardsNote",
  "588": "sourceOfDescription",
  
  // Subject Access Fields (600-658)
  "600": "subjectPersonName",
  "610": "subjectCorporateName",
  "611": "subjectMeetingName",
  "630": "subjectUniformTitle",
  "647": "subjectNamedEvent",
  "648": "subjectChronologicalTerm",
  "650": "subjectTopical",
  "651": "subjectGeographic",
  "653": "indexTerm",
  "654": "subjectFacetedTopical",
  "655": "genreForm",
  "656": "indexTermOccupation",
  "657": "indexTermFunction",
  "658": "indexTermCurriculumObjective",
  
  // Added Entry Fields (700-75X)
  "700": "additionalAuthor",
  "710": "additionalCorporateAuthor",
  "711": "additionalMeetingName",
  "720": "addedEntryUncontrolledName",
  "730": "additionalUniformTitle",
  "740": "additionalUncontrolledTitle",
  "751": "addedEntryGeographicName",
  "752": "addedEntryHierarchicalPlaceName",
  "753": "systemDetailsAccessToComputerFiles",
  "754": "addedEntryTaxonomicIdentification",
  
  // Linking Entry Fields (760-787)
  "760": "mainSeriesEntry",
  "762": "subseriesEntry",
  "765": "originalLanguageEntry",
  "767": "translationEntry",
  "770": "supplementEntry",
  "772": "parentRecord",
  "773": "hostItem",
  "774": "constituentUnitEntry",
  "775": "otherEditionEntry",
  "776": "additionalPhysicalForm",
  "777": "issuedWithEntry",
  "780": "precedingEntry",
  "785": "succeedingEntry",
  "786": "dataSourceEntry",
  "787": "otherRelationshipEntry",
  
  // Series Added Entry Fields (800-830)
  "800": "seriesAddedEntryPersonalName",
  "810": "seriesAddedEntryCorporateName",
  "811": "seriesAddedEntryMeetingName",
  "830": "seriesAddedEntry",
  
  // Holdings, Alternate Graphic, etc. Fields (841-88X)
  "841": "holdingsInformation",
  "842": "textualPhysicalFormDesignator",
  "843": "reproductionNote",
  "844": "nameOfUnit",
  "845": "termsGoverningUseAndReproduction",
  "850": "holdingInstitution",
  "852": "location",
  "853": "captionAndPatternForBasicBibliographicUnit",
  "854": "captionAndPatternForSupplementaryMaterial",
  "855": "captionAndPatternForIndexes",
  "856": "electronicLocation",
  "863": "enumerationAndChronologyForBasicBibliographicUnit",
  "864": "enumerationAndChronologyForSupplementaryMaterial",
  "865": "enumerationAndChronologyForIndexes",
  "866": "textualHoldingsForBasicBibliographicUnit",
  "867": "textualHoldingsForSupplementaryMaterial",
  "868": "textualHoldingsForIndexes",
  "876": "itemInformationForBasicBibliographicUnit",
  "877": "itemInformationForSupplementaryMaterial",
  "878": "itemInformationForIndexes",
  "880": "alternateGraphicRepresentation",
  "882": "replacementRecord",
  "883": "machineGeneratedMetadataProvenance",
  "884": "descriptionConversionProcess",
  "885": "matchingInformation",
  "886": "foreignMARC",
  "887": "nonMARC",
  
  // Local Fields (900-999)
  "942": "additionalItemType",
  "961": "localSystemInfo"
};

/**
 * Maps MARC subfield codes to human-readable names by field
 */
const SUBFIELD_NAMES: Record<string, Record<string, string>> = {
  // Title
  "245": {
    "a": "mainTitle",
    "b": "subtitle",
    "c": "statementOfResponsibility",
    "h": "medium",
    "p": "partName",
    "n": "partNumber"
  },
  // Uniform Title (240)
  "240": {
    "a": "title",
    "d": "date",
    "f": "date",
    "g": "miscellaneous",
    "h": "medium",
    "k": "form",
    "l": "language",
    "m": "medium",
    "n": "partNumber",
    "o": "arrangedStatement",
    "p": "partName",
    "r": "key",
    "s": "version"
  },
  // Variant Title (246)
  "246": {
    "a": "title",
    "b": "remainderOfTitle",
    "f": "date",
    "g": "miscellaneous",
    "h": "medium",
    "i": "displayText",
    "n": "partNumber",
    "p": "partName"
  },
  // Projected Publication Date (263)
  "263": {
    "a": "date"
  },
  // Series Title (440)
  "440": {
    "a": "title",
    "n": "partNumber",
    "p": "partName",
    "v": "volume",
    "x": "issn"
  },
  // Author
  "100": {
    "a": "name",
    "b": "numeration",
    "c": "titles",
    "d": "dates",
    "q": "fullName",
    "e": "role",
    "i": "relationship",
    "t": "title"
  },
  // Additional Author/Creator
  "700": {
    "a": "name",
    "b": "numeration",
    "c": "titles",
    "d": "dates",
    "q": "fullName",
    "e": "role",
    "i": "relationship",
    "t": "title"
  },
  // Publication info
  "260": {
    "a": "place",
    "b": "publisher",
    "c": "date"
  },
  "264": {
    "a": "place",
    "b": "publisher",
    "c": "date"
  },
  // Physical description
  "300": {
    "a": "extent",
    "b": "otherPhysicalDetails",
    "c": "dimensions",
    "e": "accompanyingMaterial"
  },
  // ISBN
  "020": {
    "a": "isbn",
    "q": "qualifyingInformation"
  },
  // ISSN
  "022": {
    "a": "issn"
  },
  // Series
  "490": {
    "a": "title",
    "v": "volume"
  },
  // Subject
  "650": {
    "a": "term",
    "x": "generalSubdivision",
    "y": "chronologicalSubdivision",
    "z": "geographicSubdivision",
    "v": "formSubdivision",
    "2": "sourceThesaurus"
  },
  // Genre/Form
  "655": {
    "a": "value",
    "v": "formSubdivision",
    "x": "generalSubdivision",
    "y": "chronologicalSubdivision",
    "z": "geographicSubdivision",
    "2": "sourceThesaurus"
  },
  // Notes
  "500": {
    "a": "note"
  },
  "504": {
    "a": "note"
  },
  "505": {
    "a": "note"
  },
  "520": {
    "a": "summary",
    "b": "expansion"
  },
  // Target audience
  "521": {
    "a": "value",
    "b": "additionalValue",
    "3": "materials"
  },
  // Study program information
  "526": {
    "a": "programName",
    "b": "interestLevel",
    "c": "readingLevel",
    "d": "points",
    "i": "title",
    "z": "publicNote",
    "5": "institution"
  },
  // Electronic location
  "856": {
    "u": "url",
    "z": "publicNote",
    "y": "linkText",
    "3": "materials"
  },
  // Location information
  "852": {
    "a": "institution",
    "b": "sublocation",
    "c": "shelvingLocation",
    "h": "callNumber",
    "i": "itemPart",
    "j": "shelfControlNumber",
    "k": "callNumberPrefix",
    "l": "shelvingForm",
    "m": "callNumberSuffix",
    "n": "countryCode",
    "p": "pieceDesignation",
    "q": "piecePhysicalCondition",
    "s": "copyrightArticleFeeCode",
    "t": "copyNumber",
    "x": "nonpublicNote",
    "z": "publicNote"
  },
  // Local system info
  "961": {
    "t": "transactionNumber",
    "a": "action",
    "b": "batchNumber",
    "c": "cataloger",
    "d": "date",
    "h": "hours",
    "i": "itemType",
    "l": "locationCode",
    "m": "minutes",
    "o": "operator",
    "s": "seconds",
    "w": "workstationID"
  }
};

// Default mappings for common subfields across multiple field types
const DEFAULT_SUBFIELD_NAMES: Record<string, string> = {
  // Common data element subfields
  "a": "value",
  "b": "additionalValue",
  "c": "additionalInfo",
  "d": "date",
  "e": "role",
  "f": "nationality",
  "g": "miscellaneous",
  "h": "medium",
  "i": "relationship",
  "j": "attribution",
  "k": "formSubheading",
  "l": "language",
  "m": "medium",
  "n": "number",
  "o": "arrangedStatement",
  "p": "part",
  "q": "qualifier",
  "r": "key",
  "s": "version",
  "t": "title",
  "u": "uri",
  "v": "volume",
  "w": "bibliographicRecordControlNumber",
  "x": "note",
  "y": "linkText",
  "z": "publicNote",
  
  // Control subfields (begin with numbers)
  "0": "authorityRecordControlNumber",
  "1": "uri",
  "2": "sourceThesaurus",
  "3": "materials",
  "4": "relationshipCode",
  "5": "institution",
  "6": "linkage",
  "7": "dataProvenance",
  "8": "fieldLinkSequence",
  "9": "localUse"
};

/**
 * Converts MARC records to human-readable JSON format
 */
export class HumanReadableConverter {
  /**
   * Get a human-readable name for the first indicator of a field
   * @param tag MARC field tag
   * @returns Human-readable name for indicator1
   */
  private static getIndicator1Name(tag: string): string {
    // Common indicator1 meanings by field tag
    const indicator1Names: Record<string, string> = {
      "100": "nameType", // 0=Forename, 1=Surname, 3=Family name
      "245": "titleAddedEntry", // 0=No added entry, 1=Added entry
      "246": "noteControllerType", // 0-8=Note/added entry controller
      "250": "editionType",
      "260": "publicationSequence",
      "264": "productionSequence",
      "300": "physicalDescriptionType",
      "490": "seriesTracing", // 0=Not traced, 1=Traced
      "600": "nameType", // 0=Forename, 1=Surname, 3=Family name
      "610": "nameType", // 0-2=Type of corporate name
      "611": "nameType", // 0-2=Type of meeting name
      "630": "nonfilingCharacters", // 0-9=Number of nonfiling characters
      "650": "levelOfSubject", // 0-2=Level of subject
      "651": "reserved", // #=Undefined
      "655": "typeOfHeading", // 0=Faceted, 1=Not specified
      "700": "nameType", // 0=Forename, 1=Surname, 3=Family name
      "710": "nameType", // 0-2=Type of corporate name
      "711": "nameType", // 0-2=Type of meeting name
      "730": "nonfilingCharacters", // 0-9=Number of nonfiling characters
      "740": "nonfilingCharacters", // 0-9=Number of nonfiling characters
      "800": "nameType", // 0=Forename, 1=Surname, 3=Family name
      "810": "nameType", // 0-2=Type of corporate name
      "811": "nameType", // 0-2=Type of meeting name
      "830": "nonfilingCharacters", // 0-9=Number of nonfiling characters
      "852": "shelvingScheme", // 0-8=Shelving scheme
      "856": "accessMethod" // 0-4=Access method
    };
    
    return indicator1Names[tag] || "indicator1";
  }
  
  /**
   * Get a human-readable name for the second indicator of a field
   * @param tag MARC field tag
   * @returns Human-readable name for indicator2
   */
  private static getIndicator2Name(tag: string): string {
    // Common indicator2 meanings by field tag
    const indicator2Names: Record<string, string> = {
      "245": "nonfilingCharacters", // 0-9=Number of nonfiling characters
      "246": "displayType", // 0-8=Type of display
      "264": "functionType", // 0=Production, 1=Publication, 2=Distribution, 3=Manufacture
      "440": "nonfilingCharacters", // 0-9=Number of nonfiling characters
      "490": "reserved", // #=Undefined
      "600": "subjectSystem", // 0-7=Subject heading system
      "610": "subjectSystem", // 0-7=Subject heading system
      "611": "subjectSystem", // 0-7=Subject heading system
      "630": "subjectSystem", // 0-7=Subject heading system
      "650": "subjectSystem", // 0-7=Subject heading system
      "651": "subjectSystem", // 0-7=Subject heading system
      "655": "thesaurusSource", // 0-7=Thesaurus source
      "700": "type", // #=No information, 2=Analytical entry
      "710": "type", // #=No information, 2=Analytical entry
      "711": "type", // #=No information, 2=Analytical entry
      "730": "type", // #=No information, 2=Analytical entry
      "740": "type", // #=No information, 2=Analytical entry
      "800": "reserved", // #=Undefined
      "810": "reserved", // #=Undefined
      "811": "reserved", // #=Undefined
      "830": "reserved", // #=Undefined
      "852": "shelvingOrder", // 0-9=Shelving order
      "856": "relationship" // 0-8=Relationship
    };
    
    return indicator2Names[tag] || "indicator2";
  }
  /**
   * Parse fixed-length data from 008 field into meaningful properties
   * @param data The fixed-length data string from field 008
   * @returns Object with meaningful properties
   */
  private static parseFixedLengthData(data: string): Record<string, unknown> {
    // Default empty result
    const result: Record<string, unknown> = {
      // Always preserve the raw value for round-trip conversion
      raw: data
    };
    
    try {
      // Only process if we have data of expected length
      if (data && data.length >= 40) {
        // Date entered on file (positions 00-05)
        const dateEntered = data.substring(0, 6);
        if (dateEntered && !/^\s*$/.test(dateEntered) && dateEntered !== "||||||") {
          result.dateEntered = `${dateEntered.substring(0, 2)}-${dateEntered.substring(2, 4)}-${dateEntered.substring(4, 6)}`;
        }
        
        // Type of date (position 06)
        const dateType = data.charAt(6);
        if (dateType && dateType !== " " && dateType !== "|") {
          switch (dateType) {
            case "s": result.dateType = "single"; break;
            case "m": result.dateType = "multiple"; break;
            case "c": result.dateType = "continuing"; break;
            case "d": result.dateType = "detailed"; break;
            case "e": result.dateType = "end"; break;
            case "i": result.dateType = "inclusive"; break;
            case "k": result.dateType = "bulk"; break;
            case "n": result.dateType = "unknown"; break;
            case "p": result.dateType = "distribution"; break;
            case "q": result.dateType = "questionable"; break;
            case "r": result.dateType = "reprint"; break;
            case "t": result.dateType = "publication/copyright"; break;
            case "u": result.dateType = "status unknown"; break;
            default: result.dateType = dateType;
          }
        }
        
        // Date 1 (positions 07-10)
        const date1 = data.substring(7, 11);
        if (date1 && !/^\s*$/.test(date1) && date1 !== "||||") {
          result.publicationDate = date1;
        }
        
        // Date 2 (positions 11-14)
        const date2 = data.substring(11, 15);
        if (date2 && !/^\s*$/.test(date2) && date2 !== "||||") {
          result.publicationDate2 = date2;
        }
        
        // Place of publication (positions 15-17)
        const place = data.substring(15, 18).trim();
        if (place && place !== "|||") {
          result.publicationPlace = place;
        }
        
        // Language (positions 35-37)
        const language = data.substring(35, 38).trim();
        if (language && language !== "|||") {
          result.language = language;
        }
        
        // Modified record (position 38)
        const modified = data.charAt(38);
        if (modified && modified !== " " && modified !== "|") {
          result.modifiedRecord = modified === "d" ? "omitted diacritics" : 
                                  modified === "o" ? "romanized" :
                                  modified === "r" ? "completely romanized" :
                                  modified === "s" ? "shortened" :
                                  modified === "x" ? "missing characters" : modified;
        }
        
        // Cataloging source (position 39)
        const source = data.charAt(39);
        if (source && source !== " " && source !== "|") {
          result.catalogingSource = source === "c" ? "cooperative" :
                                    source === "d" ? "other" :
                                    source === "u" ? "unknown" : source;
        }
      }
    } catch (e) {
      // In case of error, return the raw data
      const error = e instanceof Error ? e : new Error(String(e));
      console.warn(`Warning: Error parsing fixed-length data field: ${error.message}`);
      // Continue processing, keep the raw value
      result.raw = data;
    }
    
    // If we didn't parse any properties, return the raw data
    if (Object.keys(result).length === 0 && data) {
      result.raw = data;
    }
    
    return result;
  }
  
  /**
   * Interpret MARC geographic area codes into human-readable names
   * @param code The geographic area code
   * @returns Human-readable geographic area name
   */
  private static interpretGeographicAreaCode(code: string): string | undefined {
    // Common geographic area codes used in MARC records
    const geoCodes: Record<string, string> = {
      // Continents and regions
      "e": "Europe",
      "a": "Asia",
      "f": "Africa",
      "n": "North America",
      "s": "South America",
      "o": "Oceania",
      "p": "Pacific Ocean",
      "l": "Atlantic Ocean",
      "i": "Indian Ocean",
      "r": "Arctic Ocean",
      "q": "Antarctica",
      
      // Countries
      "n-us": "United States",
      "n-cn": "Canada",
      "n-cn---": "Canada",
      "n-us---": "United States",
      "e-uk": "United Kingdom",
      "e-uk---": "United Kingdom",
      "e-fr": "France",
      "e-fr---": "France",
      "e-gx": "Germany",
      "e-gx---": "Germany",
      "e-it": "Italy",
      "e-sp": "Spain",
      "a-ja": "Japan",
      "a-ja---": "Japan",
      "a-ch": "China",
      "a-ch---": "China",
      "u-at": "Australia",
      "u-at---": "Australia",
      "u-nz": "New Zealand",
      "f-sa": "South Africa",
      "f-sa---": "South Africa",
      "s-bl": "Brazil",
      "s-mx": "Mexico"
    };
    
    return geoCodes[code.toLowerCase()] || undefined;
  }
  
  /**
   * Parse the nonpublicNote field which follows a delimited format like "FSC@aHS Non-Fiction@c20000809"
   * @param noteText The nonpublicNote field text
   * @returns Object with parsed components
   */
  private static parseNonpublicNote(noteText: string): Record<string, unknown> {
    const result: Record<string, unknown> = {
      raw: noteText // Always include the raw value
    };
    
    try {
      // Check if it matches the expected format
      if (noteText && noteText.startsWith("FSC@a")) {
        // Split on @ delimiter but keep the initial "FSC" prefix
        const parts = noteText.split("@");
        
        if (parts.length >= 1) {
          // The first part is the namespace/code (typically "FSC")
          result.code = parts[0];
        }
        
        // Process remaining parts which start with a single letter code
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          if (part && part.length > 1) {
            const code = part.charAt(0);
            const value = part.substring(1).trim();
            
            switch (code) {
              case 'a':
                // Location information (e.g., "HS Non-Fiction", "EL Nonfiction")
                result.location = value;
                break;
              case 'c':
                // Date in YYYYMMDD format
                if (value.length === 8 && /^\d+$/.test(value)) {
                  // Format as YYYY-MM-DD for readability
                  const year = value.substring(0, 4);
                  const month = value.substring(4, 6);
                  const day = value.substring(6, 8);
                  result.date = `${year}-${month}-${day}`;
                  
                  // Also include raw date
                  result.rawDate = value;
                } else {
                  // If not in expected format, store as is
                  result.dateValue = value;
                }
                break;
              default:
                // Handle any other codes that might be present
                result[`value_${code}`] = value;
            }
          }
        }
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.warn(`Warning: Error parsing nonpublic note "${noteText.substring(0, 20)}...": ${error.message}`);
      // Continue processing, return what we have
    }
    
    return result;
  }

  /**
   * Convert a MARC record to a JSON object with human-readable field names
   * @param record The MARC record to convert
   * @param options Conversion options
   * @returns JSON representation of the MARC record with human-readable names
   */
  public static toJson(
    record: MarcRecord, 
    options: HumanReadableOptions = {}
  ): Record<string, unknown> {
    const tempResult: Record<string, unknown> = {};
    
    // Include leader if specified in options
    if (options.includeLeader) {
      tempResult.leader = record.leader;
    }
    
    // Process each field
    record.fields.forEach(field => {
      const { tag } = field;
      
      // Get human-readable field name, or use tag if not in mapping
      const fieldName = FIELD_NAMES[tag] || `field_${tag}`;
      
      // Initialize array for this field if it doesn't exist
      if (!tempResult[fieldName]) {
        tempResult[fieldName] = [];
      }
      
      const fieldArray = tempResult[fieldName] as Array<unknown>;
      
      if (field.value !== undefined) {
        // Special handling for fixed-length data field (008)
        if (tag === "008" && options.parseFixedFields) {
          fieldArray.push(this.parseFixedLengthData(field.value));
        } else {
          // Regular control field with simple value
          fieldArray.push(field.value);
        }
      } else {
        // Data field with indicators and subfields
        const fieldObject: Record<string, unknown> = {};
        
        // Add indicators if they exist and are not blank, with human-readable names
        if (field.indicator1 && field.indicator1 !== " ") {
          // Get field-specific indicator names where available
          const ind1Name = this.getIndicator1Name(tag);
          
          // Add human-readable interpretation for indicators
          
          // LC Call Number indicator1
          if (tag === "050") {
            switch(field.indicator1) {
              case "0":
                fieldObject.inLC = true;
                fieldObject.lcNoteDisplay = "Item is in LC";
                break;
              case "1":
                fieldObject.inLC = false;
                fieldObject.lcNoteDisplay = "Item is not in LC";
                break;
            }
          }
          
          // Dewey Decimal indicator1
          else if (tag === "082") {
            switch(field.indicator1) {
              case "0":
                fieldObject.deweyEdition = "Standard edition";
                break;
              case "1":
                fieldObject.deweyEdition = "Abridged edition";
                break;
            }
          }
          
          // Add human-readable interpretation for nameType
          else if (ind1Name === "nameType" && (tag === "100" || tag === "600" || tag === "700" || tag === "800")) {
            switch(field.indicator1) {
              case "0":
                fieldObject.nameForm = "Forename";
                break;
              case "1":
                fieldObject.nameForm = "Surname";
                break;
              case "3":
                fieldObject.nameForm = "Family name";
                break;
            }
            // Don't include the cryptic code
            delete fieldObject[ind1Name];
          }
          
          // Add interpretation for titleAddedEntry
          else if (ind1Name === "titleAddedEntry" && tag === "245") {
            fieldObject.titleIncludesAddedEntry = field.indicator1 === "1" ? true : false;
            // Don't include the cryptic code
            delete fieldObject[ind1Name];
          }
          
          // Add interpretation for seriesTracing
          else if (ind1Name === "seriesTracing" && tag === "490") {
            fieldObject.seriesTraced = field.indicator1 === "1" ? true : false;
            // Don't include the cryptic code
            delete fieldObject[ind1Name];
          }
          // For other cases, keep the numeric code
          else {
            fieldObject[ind1Name] = field.indicator1;
          }
          
          // Add interpretation for seriesStatement indicators (440 field)
          if (tag === "440") {
            if (ind1Name === "indicator1" && field.indicator1 === " ") {
              fieldObject.noteDisplay = "Series statement displayed";
            }
          }
        }
        
        if (field.indicator2 && field.indicator2 !== " ") {
          // Get field-specific indicator names where available
          const ind2Name = this.getIndicator2Name(tag);
          
          // LC Call Number indicator2
          if (tag === "050") {
            switch(field.indicator2) {
              case "0":
                fieldObject.lcSubjectType = "No subject subdivision";
                break;
              case "4":
                fieldObject.lcSubjectType = "Assigned by agency other than LC";
                break;
            }
          }
          
          // Dewey Decimal indicator2
          else if (tag === "082") {
            switch(field.indicator2) {
              case "0":
                fieldObject.deweyAssignedBy = "Library of Congress";
                break;
              case "4":
                fieldObject.deweyAssignedBy = "Other agency";
                break;
            }
          }
          
          // Add human-readable interpretation for subjectSystem
          else if (ind2Name === "subjectSystem" && 
              (tag === "600" || tag === "610" || tag === "611" || tag === "630" || tag === "650" || tag === "651")) {
            switch(field.indicator2) {
              case "0":
                fieldObject.subjectThesaurus = "Library of Congress Subject Headings";
                break;
              case "1":
                fieldObject.subjectThesaurus = "LC Subject Headings for Children's Literature";
                break;
              case "2":
                fieldObject.subjectThesaurus = "Medical Subject Headings";
                break;
              case "3":
                fieldObject.subjectThesaurus = "National Agricultural Library Subject Authority File";
                break;
              case "4":
                fieldObject.subjectThesaurus = "Source not specified";
                break;
              case "5":
                fieldObject.subjectThesaurus = "Canadian Subject Headings";
                break;
              case "6":
                fieldObject.subjectThesaurus = "Répertoire de vedettes-matière";
                break;
              case "7":
                fieldObject.subjectThesaurus = "Source specified in subfield $2";
                break;
            }
            // Don't include the cryptic code
            delete fieldObject[ind2Name];
          }
          
          // Add interpretation for nonfilingCharacters in titles
          else if (ind2Name === "nonfilingCharacters" && tag === "245") {
            const nonfilingChars = parseInt(field.indicator2);
            if (!isNaN(nonfilingChars)) {
              if (nonfilingChars > 0) {
                fieldObject.nonfilingCharacterCount = nonfilingChars;
                fieldObject.nonfilingDescription = `${nonfilingChars} characters are not used for sorting`;
              } else {
                fieldObject.nonfilingDescription = "No characters are ignored in sorting";
              }
            }
            // Don't include the cryptic code
            delete fieldObject[ind2Name];
          }
          // For other cases, keep the numeric code
          else {
            fieldObject[ind2Name] = field.indicator2;
          }
          
          // Add interpretation for seriesStatement indicator2 (440 field)
          if (tag === "440" && ind2Name === "indicator2") {
            const nonfilingChars = parseInt(field.indicator2);
            if (!isNaN(nonfilingChars)) {
              fieldObject.nonfilingCharacters = nonfilingChars;
              fieldObject.nonfilingDescription = nonfilingChars === 0 ? 
                "No nonfiling characters" : 
                `${nonfilingChars} nonfiling characters`;
            }
          }
        }
        
        // Process subfields with human-readable names
        if (field.subfields) {
          const readableSubfields: Record<string, string> = {};
          
          for (const [code, value] of Object.entries(field.subfields)) {
            // Try to get field-specific subfield name
            let subfieldName = SUBFIELD_NAMES[tag]?.[code];
            
            // Fall back to default mapping
            if (!subfieldName) {
              subfieldName = DEFAULT_SUBFIELD_NAMES[code] || `subfield_${code}`;
            }
            
            // If this subfield name already exists, append a number to make it unique
            if (readableSubfields[subfieldName]) {
              let counter = 1;
              while (readableSubfields[`${subfieldName}${counter}`]) {
                counter++;
              }
              subfieldName = `${subfieldName}${counter}`;
            }
            
            readableSubfields[subfieldName] = value;
          }
          
          // Special handling for indicator meanings in specific fields
          
          // Target audience field (521)
          if (tag === "521" && field.indicator1) {
            // Add audience type based on first indicator
            switch(field.indicator1) {
              case "0":
                fieldObject.audienceType = "Reading grade level";
                break;
              case "1":
                fieldObject.audienceType = "Age level";
                break;
              case "2":
                fieldObject.audienceType = "Interest grade level";
                break;
              case "3":
                fieldObject.audienceType = "Special audience";
                break;
              case "4":
                fieldObject.audienceType = "Motivation/interest level";
                break;
              case "8":
                fieldObject.audienceType = "No display constant generated";
                break;
            }
          }
          
          // Parse and interpret geographic area codes
          if (tag === "043" && readableSubfields.value) {
            // Remove duplication - include interpretation directly
            const geoCode = String(readableSubfields.value);
            const geoDescription = this.interpretGeographicAreaCode(geoCode);
            fieldObject.geographicRegion = geoDescription || geoCode;
          }
          
          // Genre/Form (655) field
          if (tag === "655" && field.indicator2) {
            // Add thesaurus source based on second indicator
            switch(field.indicator2) {
              case "0":
                fieldObject.source = "Library of Congress Subject Headings";
                break;
              case "1":
                fieldObject.source = "LC Subject Headings for Children's Literature";
                break;
              case "2":
                fieldObject.source = "Medical Subject Headings";
                break;
              case "3":
                fieldObject.source = "National Agricultural Library Subject Authority File";
                break;
              case "4":
                fieldObject.source = "Source not specified";
                break;
              case "5":
                fieldObject.source = "Canadian Subject Headings";
                break;
              case "6":
                fieldObject.source = "Répertoire de vedettes-matière";
                break;
              case "7":
                // Source specified in subfield $2
                if (readableSubfields.sourceThesaurus) {
                  fieldObject.source = `Source specified in code: ${readableSubfields.sourceThesaurus}`;
                  
                  // Map common thesaurus codes
                  const thesaurusCodes: Record<string, string> = {
                    "lcgft": "Library of Congress Genre/Form Terms",
                    "gsafd": "Guidelines on Subject Access to Individual Works of Fiction, Drama, etc.",
                    "fast": "Faceted Application of Subject Terminology",
                    "sears": "Sears List of Subject Headings",
                    "local": "Locally defined terms"
                  };
                  
                  if (thesaurusCodes[String(readableSubfields.sourceThesaurus)]) {
                    fieldObject.sourceName = thesaurusCodes[String(readableSubfields.sourceThesaurus)];
                  }
                } else {
                  fieldObject.source = "Source specified in $2";
                }
                break;
            }
          }
          
          // Author relationship handling
          if ((tag === "100" || tag === "700") && readableSubfields.role) {
            // Convert MARC role codes to human-readable relationship terms
            const roleCodes: Record<string, string> = {
              "act": "Actor",
              "adp": "Adapter",
              "arr": "Arranger",
              "art": "Artist",
              "aut": "Author",
              "cmp": "Composer",
              "ctb": "Contributor",
              "clb": "Collaborator",
              "com": "Compiler",
              "cre": "Creator",
              "drt": "Director",
              "dsr": "Designer",
              "dst": "Distributor",
              "edt": "Editor",
              "ill": "Illustrator",
              "itr": "Instrumentalist",
              "ive": "Interviewee",
              "ivr": "Interviewer",
              "lbt": "Librettist",
              "lyr": "Lyricist",
              "mus": "Musician",
              "nrt": "Narrator",
              "pbl": "Publisher",
              "pht": "Photographer",
              "prf": "Performer",
              "pro": "Producer",
              "prg": "Programmer",
              "res": "Researcher",
              "rev": "Reviewer",
              "spn": "Sponsor",
              "trl": "Translator",
              "voc": "Vocalist"
            };
            
            // Check if the role abbreviation is in our mapping
            const roleAbbr = String(readableSubfields.role).trim().toLowerCase();
            if (roleCodes[roleAbbr]) {
              fieldObject.relationship = roleCodes[roleAbbr];
            } else {
              // If not a standard code, just use as is but rename field
              fieldObject.relationship = readableSubfields.role;
            }
          }
          
          // Special parsing for nonpublicNote fields with the expected format
          if (tag === "852" && readableSubfields.nonpublicNote && 
              typeof readableSubfields.nonpublicNote === "string" && 
              readableSubfields.nonpublicNote.startsWith("FSC@a")) {
            // Parse the nonpublicNote field
            fieldObject.parsedNonpublicNote = this.parseNonpublicNote(readableSubfields.nonpublicNote as string);
            
            // Remove the original nonpublicNote since it's now duplicated in parsedNonpublicNote.raw
            delete readableSubfields.nonpublicNote;
          }
          
          // Special handling for localSystemInfo (961 field)
          if (tag === "961") {
            // Add comprehensive mapping for system indicators
            if (field.indicator1 && field.indicator1 !== " ") {
              const indicator1Meaning = {
                code: field.indicator1,
                type: "",
                description: ""
              };
              
              switch(field.indicator1) {
                case "w":
                  indicator1Meaning.type = "Workstation ID";
                  indicator1Meaning.description = "Record created/modified at specific workstation";
                  break;
                case "t":
                  indicator1Meaning.type = "Transaction";
                  indicator1Meaning.description = "Transaction-specific information";
                  break;
                case "c":
                  indicator1Meaning.type = "Cataloging";
                  indicator1Meaning.description = "Cataloging process information";
                  break;
                case "a":
                  indicator1Meaning.type = "Acquisition";
                  indicator1Meaning.description = "Acquisition process information";
                  break;
                case "p":
                  indicator1Meaning.type = "Processing";
                  indicator1Meaning.description = "Material processing information";
                  break;
                default:
                  indicator1Meaning.type = `Unknown`;
                  indicator1Meaning.description = `Undefined code ${field.indicator1}`;
              }
              
              // Replace the cryptic code with the full meaning
              fieldObject.indicator1 = indicator1Meaning;
            }
            
            if (field.indicator2 && field.indicator2 !== " ") {
              const indicator2Meaning = {
                code: field.indicator2,
                type: "",
                description: ""
              };
              
              switch(field.indicator2) {
                case "l":
                  indicator2Meaning.type = "Local record";
                  indicator2Meaning.description = "Record for local use only";
                  break;
                case "s":
                  indicator2Meaning.type = "Shared record";
                  indicator2Meaning.description = "Record shared with other institutions";
                  break;
                case "i":
                  indicator2Meaning.type = "ILS record";
                  indicator2Meaning.description = "Integrated Library System record";
                  break;
                case "c":
                  indicator2Meaning.type = "Consortium record";
                  indicator2Meaning.description = "Record shared within a consortium";
                  break;
                case "n":
                  indicator2Meaning.type = "National record";
                  indicator2Meaning.description = "Record from a national database";
                  break;
                default:
                  indicator2Meaning.type = "Unknown";
                  indicator2Meaning.description = `Undefined code ${field.indicator2}`;
              }
              
              // Replace the cryptic code with the full meaning
              fieldObject.indicator2 = indicator2Meaning;
            }
          }
          
          // For fields that should be simple strings, extract just the primary value
          if (SIMPLE_STRING_FIELDS.has(fieldName) && readableSubfields.value) {
            fieldArray.push(readableSubfields.value);
          } else {
            // Add readable subfields to the field object
            Object.assign(fieldObject, readableSubfields);
            fieldArray.push(fieldObject);
          }
        } else {
          fieldArray.push(fieldObject);
        }
      }
    });
    
    // Simplify arrays if requested
    const result: Record<string, unknown> = {};
    if (options.simplifyArrays) {
      for (const [key, value] of Object.entries(tempResult)) {
        if (Array.isArray(value)) {
          if (value.length === 1 && !ALWAYS_ARRAY_FIELDS.has(key)) {
            // Convert single-element arrays to direct values
            result[key] = value[0];
          } else {
            // Keep arrays as-is
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }
    } else {
      // No simplification, just copy as-is
      Object.assign(result, tempResult);
    }
    
    return result;
  }

  /**
   * Convert multiple MARC records to human-readable JSON
   * @param records Array of MARC records
   * @param options Conversion options
   * @returns Array of JSON objects with human-readable field names
   */
  public static batchToJson(
    records: MarcRecord[], 
    options: HumanReadableOptions = {}
  ): Record<string, unknown>[] {
    return records.map(record => this.toJson(record, options));
  }
}