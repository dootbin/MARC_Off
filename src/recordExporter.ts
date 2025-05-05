import { MarcRecord } from "./types.ts";
import { HumanReadableConverter } from "./humanReadableConverter.ts";
import { ensureDir } from "https://deno.land/std@0.181.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.181.0/path/mod.ts";

/**
 * Options for record export
 */
export interface RecordExportOptions {
  /**
   * Directory to output individual record files
   */
  outputDir: string;
  
  /**
   * Whether to parse fixed-length fields
   */
  parseFixedFields?: boolean;
  
  /**
   * Whether to simplify arrays
   */
  simplifyArrays?: boolean;
  
  /**
   * Whether to include the MARC leader
   */
  includeLeader?: boolean;
}

/**
 * Handles exporting MARC records as individual JSON files
 */
export class RecordExporter {
  /**
   * Extract summary metadata from a record to create a top-level summary
   * @param record The processed record data
   * @returns An object with key metadata
   */
  public static extractMetadata(record: Record<string, unknown>): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    
    // Extract title
    if (record.title) {
      if (typeof record.title === "object" && record.title !== null) {
        const title = record.title as Record<string, unknown>;
        if (title.mainTitle) {
          // Clean up title (remove trailing punctuation)
          let mainTitle = String(title.mainTitle).trim();
          if (mainTitle.endsWith("/")) {
            mainTitle = mainTitle.slice(0, -1).trim();
          }
          metadata.title = mainTitle;
        }
      }
    }
    
    // Extract ISBN(s)
    if (record.isbn) {
      if (typeof record.isbn === "object" && record.isbn !== null) {
        const isbn = record.isbn as Record<string, unknown>;
        if (isbn.isbn) {
          // Clean up ISBN (remove trailing punctuation and qualifiers)
          let isbnValue = String(isbn.isbn).trim();
          if (isbnValue.includes(":")) {
            isbnValue = isbnValue.split(":")[0].trim();
          }
          if (isbnValue.includes("(")) {
            isbnValue = isbnValue.split("(")[0].trim();
          }
          metadata.isbn = isbnValue;
        }
      }
    }
    
    // Extract subjects/categories and deduplicate
    if (record.subjectTopical && Array.isArray(record.subjectTopical)) {
      const subjects = record.subjectTopical as Array<Record<string, unknown>>;
      // Use a Set to automatically deduplicate categories
      const uniqueCategories = new Set<string>();
      
      subjects.forEach(subject => {
        // Clean up subject term (remove trailing punctuation)
        let term = String(subject.term || "").trim();
        if (term.endsWith(".")) {
          term = term.slice(0, -1).trim();
        }
        if (term) {
          uniqueCategories.add(term);
        }
      });
      
      if (uniqueCategories.size > 0) {
        metadata.categories = Array.from(uniqueCategories);
      }
    }
    
    // Extract genres
    if (record.genreForm) {
      const genres: string[] = [];
      
      if (Array.isArray(record.genreForm)) {
        for (const genre of record.genreForm) {
          if (typeof genre === "object" && genre !== null) {
            const genreData = genre as Record<string, unknown>;
            let genreValue = String(genreData.value || "").trim();
            if (genreValue.endsWith(".")) {
              genreValue = genreValue.slice(0, -1).trim();
            }
            if (genreValue) {
              genres.push(genreValue);
            }
          }
        }
      } else if (typeof record.genreForm === "object" && record.genreForm !== null) {
        const genreData = record.genreForm as Record<string, unknown>;
        let genreValue = String(genreData.value || "").trim();
        if (genreValue.endsWith(".")) {
          genreValue = genreValue.slice(0, -1).trim();
        }
        if (genreValue) {
          genres.push(genreValue);
        }
      }
      
      if (genres.length > 0) {
        metadata.genres = genres;
      }
    }
    
    // Extract authors
    if (record.author) {
      if (typeof record.author === "object" && record.author !== null) {
        const author = record.author as Record<string, unknown>;
        if (author.name) {
          // Clean up author name (remove trailing punctuation)
          let authorName = String(author.name).trim();
          if (authorName.endsWith(",")) {
            authorName = authorName.slice(0, -1).trim();
          }
          metadata.author = authorName;
          
          // Include role if available
          if (author.relationship) {
            metadata.authorRole = author.relationship;
          }
        }
      }
    }
    
    // Extract additional authors and contributors
    if (record.additionalAuthor) {
      const contributors: Array<Record<string, unknown>> = [];
      
      if (Array.isArray(record.additionalAuthor)) {
        for (const contributor of record.additionalAuthor) {
          if (typeof contributor === "object" && contributor !== null) {
            const personData = contributor as Record<string, unknown>;
            if (personData.name) {
              // Create contributor object
              const contributorInfo: Record<string, unknown> = {};
              
              // Clean up name
              let name = String(personData.name).trim();
              if (name.endsWith(",")) {
                name = name.slice(0, -1).trim();
              }
              contributorInfo.name = name;
              
              // Add role if available
              if (personData.relationship) {
                contributorInfo.role = personData.relationship;
              } else if (personData.role) {
                contributorInfo.role = personData.role;
              }
              
              // Add title or work if this is an adaptation
              if (personData.relationship && String(personData.relationship).includes("Adaptation of")) {
                contributorInfo.isAdaptationSource = true;
                
                if (personData.title) {
                  contributorInfo.originalWork = personData.title;
                }
              }
              
              contributors.push(contributorInfo);
            }
          }
        }
      } else if (typeof record.additionalAuthor === "object" && record.additionalAuthor !== null) {
        const personData = record.additionalAuthor as Record<string, unknown>;
        if (personData.name) {
          // Create contributor object
          const contributorInfo: Record<string, unknown> = {};
          
          // Clean up name
          let name = String(personData.name).trim();
          if (name.endsWith(",")) {
            name = name.slice(0, -1).trim();
          }
          contributorInfo.name = name;
          
          // Add role if available
          if (personData.relationship) {
            contributorInfo.role = personData.relationship;
          } else if (personData.role) {
            contributorInfo.role = personData.role;
          }
          
          contributors.push(contributorInfo);
        }
      }
      
      if (contributors.length > 0) {
        metadata.contributors = contributors;
        
        // Check for adaptations
        const adaptationSources = contributors.filter(c => c.isAdaptationSource);
        if (adaptationSources.length > 0) {
          metadata.adaptation = {
            isAdaptation: true,
            originalAuthor: adaptationSources[0].name,
            originalWork: adaptationSources[0].originalWork
          };
        }
      }
    }
    
    // Extract publication year
    if (record.fixedLengthData) {
      if (typeof record.fixedLengthData === "object" && record.fixedLengthData !== null) {
        const fixedData = record.fixedLengthData as Record<string, unknown>;
        if (fixedData.publicationDate) {
          metadata.publicationYear = fixedData.publicationDate;
        }
        
        // Include language if available
        if (fixedData.language) {
          metadata.language = fixedData.language;
        }
      }
    } else if (record.publication) {
      if (typeof record.publication === "object" && record.publication !== null) {
        const publication = record.publication as Record<string, unknown>;
        if (publication.date) {
          // Try to extract year from publication date
          const dateStr = String(publication.date);
          const yearMatch = dateStr.match(/\d{4}/);
          if (yearMatch) {
            metadata.publicationYear = yearMatch[0];
          }
        }
      }
    }
    
    // Extract publisher info
    if (record.publication) {
      if (typeof record.publication === "object" && record.publication !== null) {
        const publication = record.publication as Record<string, unknown>;
        if (publication.publisher) {
          let publisher = String(publication.publisher).trim();
          if (publisher.endsWith(",")) {
            publisher = publisher.slice(0, -1).trim();
          }
          metadata.publisher = publisher;
        }
        
        if (publication.place) {
          let place = String(publication.place).trim();
          if (place.endsWith(":")) {
            place = place.slice(0, -1).trim();
          }
          metadata.publicationPlace = place;
        }
      }
    }
    
    // Extract physical description
    if (record.physicalDescription) {
      if (typeof record.physicalDescription === "object" && record.physicalDescription !== null) {
        const physical = record.physicalDescription as Record<string, unknown>;
        if (physical.extent) {
          metadata.physicalDescription = physical.extent;
        }
      }
    }
    
    // Extract summary/description
    if (record.summary) {
      if (typeof record.summary === "object" && record.summary !== null) {
        const summary = record.summary as Record<string, unknown>;
        if (summary.summary) {
          metadata.description = summary.summary;
        }
      }
    }
    
    // Extract library location and call number
    if (record.location) {
      if (typeof record.location === "object" && record.location !== null) {
        const location = record.location as Record<string, unknown>;
        
        const libraryInfo: Record<string, unknown> = {};
        
        if (location.institution) {
          libraryInfo.institution = location.institution;
        }
        
        if (location.sublocation) {
          libraryInfo.sublocation = location.sublocation;
        }
        
        if (location.callNumber) {
          libraryInfo.callNumber = location.callNumber;
        }
        
        if (location.pieceDesignation) {
          libraryInfo.itemNumber = location.pieceDesignation;
        }
        
        // Add information from nonpublicNote if it's been parsed
        if (Array.isArray(record.location)) {
          // Handle array of locations
          for (const loc of record.location) {
            if (typeof loc === "object" && loc !== null && loc.parsedNonpublicNote) {
              const parsedNote = loc.parsedNonpublicNote as Record<string, unknown>;
              
              if (parsedNote.location) {
                libraryInfo.collectionLocation = parsedNote.location;
              }
              
              if (parsedNote.date) {
                libraryInfo.catalogDate = parsedNote.date;
              }
            }
          }
        } else if (location.parsedNonpublicNote) {
          // Handle single location object
          const parsedNote = location.parsedNonpublicNote as Record<string, unknown>;
          
          if (parsedNote.location) {
            libraryInfo.collectionLocation = parsedNote.location;
          }
          
          if (parsedNote.date) {
            libraryInfo.catalogDate = parsedNote.date;
          }
        }
        
        if (Object.keys(libraryInfo).length > 0) {
          metadata.libraryInfo = libraryInfo;
        }
      }
    }
    
    // Extract Dewey Decimal classification
    if (record.deweyDecimalClassification) {
      if (typeof record.deweyDecimalClassification === "object" && record.deweyDecimalClassification !== null) {
        const ddc = record.deweyDecimalClassification as Record<string, unknown>;
        if (ddc.value) {
          metadata.deweyDecimal = ddc.value;
        }
      }
    }
    
    // Extract Library of Congress classification
    if (record.libraryOfCongressCallNumber) {
      if (typeof record.libraryOfCongressCallNumber === "object" && record.libraryOfCongressCallNumber !== null) {
        const lcc = record.libraryOfCongressCallNumber as Record<string, unknown>;
        if (lcc.value && lcc.additionalValue) {
          metadata.libraryOfCongressNumber = `${lcc.value} ${lcc.additionalValue}`;
        } else if (lcc.value) {
          metadata.libraryOfCongressNumber = lcc.value;
        }
      }
    }
    
    // Extract reading level information
    const readingInfo: Record<string, unknown> = {};
    
    // Check for targetAudience information
    if (record.targetAudience) {
      if (Array.isArray(record.targetAudience)) {
        for (const audience of record.targetAudience) {
          if (typeof audience === "object" && audience !== null) {
            const audienceData = audience as Record<string, unknown>;
            
            // Process based on audience type
            if (audienceData.audienceType === "Reading grade level" && audienceData.value) {
              readingInfo.readingGradeLevel = audienceData.value;
            } else if (audienceData.audienceType === "Age level" && audienceData.value) {
              readingInfo.ageLevel = audienceData.value;
            } else if (audienceData.audienceType === "Interest grade level" && audienceData.value) {
              readingInfo.interestGradeLevel = audienceData.value;
            } else if (audienceData.audienceType === "No display constant generated") {
              // Check for Lexile score
              if (String(audienceData.value).includes("Lexile")) {
                readingInfo.lexile = audienceData.value;
              } else {
                readingInfo.otherLevel = audienceData.value;
              }
            }
          }
        }
      } else if (typeof record.targetAudience === "object" && record.targetAudience !== null) {
        const audienceData = record.targetAudience as Record<string, unknown>;
        
        // Process single audience entry
        if (audienceData.audienceType === "Reading grade level" && audienceData.value) {
          readingInfo.readingGradeLevel = audienceData.value;
        } else if (audienceData.audienceType === "Age level" && audienceData.value) {
          readingInfo.ageLevel = audienceData.value;
        } else if (audienceData.audienceType === "No display constant generated") {
          if (String(audienceData.value).includes("Lexile")) {
            readingInfo.lexile = audienceData.value;
          }
        }
      }
    }
    
    // Check for study program information (e.g., Accelerated Reader)
    if (record.studyProgramInformation) {
      if (typeof record.studyProgramInformation === "object" && record.studyProgramInformation !== null) {
        const programData = record.studyProgramInformation as Record<string, unknown>;
        
        if (programData.programName && String(programData.programName).includes("Accelerated Reader")) {
          readingInfo.acceleratedReader = {
            interestLevel: programData.interestLevel,
            readingLevel: programData.readingLevel,
            points: programData.points,
            quizNumber: programData.publicNote ? String(programData.publicNote).replace(/quiz:\s*/, '') : undefined
          };
        }
      }
    }
    
    // Add reading info to metadata if we found any
    if (Object.keys(readingInfo).length > 0) {
      metadata.readingInfo = readingInfo;
    }
    
    return metadata;
  }
  
  /**
   * Create a hash of a string for use in filenames
   * @param str String to hash
   * @returns A short hash suitable for filenames
   */
  private static createHash(str: string): string {
    // Simple hashing function for strings
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to a positive hex string and take the first 8 characters
    return Math.abs(hash).toString(16).slice(0, 8);
  }
  
  /**
   * Get ISBN-13 from record if available
   * @param record The processed record data
   * @returns ISBN-13 string if found, null otherwise
   */
  private static getISBN13(record: Record<string, unknown>): string | null {
    // First try metadata
    if (record.metadata && typeof record.metadata === "object") {
      const metadata = record.metadata as Record<string, unknown>;
      if (metadata.isbn) {
        const isbn = String(metadata.isbn);
        if (isbn.length === 13 || (isbn.replace(/[^0-9Xx]/g, "").length === 13)) {
          return isbn.replace(/[^0-9Xx]/g, "");
        }
      }
    }
    
    // Then try record.isbn
    if (record.record && typeof record.record === "object") {
      const recordData = record.record as Record<string, unknown>;
      if (recordData.isbn) {
        // Handle array of ISBNs
        if (Array.isArray(recordData.isbn)) {
          for (const isbnObj of recordData.isbn) {
            if (typeof isbnObj === "object" && isbnObj !== null) {
              const isbnData = isbnObj as Record<string, unknown>;
              if (isbnData.isbn) {
                const isbn = String(isbnData.isbn);
                if (isbn.length === 13 || (isbn.replace(/[^0-9Xx]/g, "").length === 13)) {
                  return isbn.replace(/[^0-9Xx]/g, "");
                }
              }
            }
          }
        } 
        // Handle single ISBN object
        else if (typeof recordData.isbn === "object" && recordData.isbn !== null) {
          const isbnData = recordData.isbn as Record<string, unknown>;
          if (isbnData.isbn) {
            const isbn = String(isbnData.isbn);
            if (isbn.length === 13 || (isbn.replace(/[^0-9Xx]/g, "").length === 13)) {
              return isbn.replace(/[^0-9Xx]/g, "");
            }
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get ISBN-10 from record if available
   * @param record The processed record data
   * @returns ISBN-10 string if found, null otherwise
   */
  private static getISBN10(record: Record<string, unknown>): string | null {
    // First try metadata
    if (record.metadata && typeof record.metadata === "object") {
      const metadata = record.metadata as Record<string, unknown>;
      if (metadata.isbn) {
        const isbn = String(metadata.isbn);
        if (isbn.length === 10 || (isbn.replace(/[^0-9Xx]/g, "").length === 10)) {
          return isbn.replace(/[^0-9Xx]/g, "");
        }
      }
    }
    
    // Then try record.isbn
    if (record.record && typeof record.record === "object") {
      const recordData = record.record as Record<string, unknown>;
      if (recordData.isbn) {
        // Handle array of ISBNs
        if (Array.isArray(recordData.isbn)) {
          for (const isbnObj of recordData.isbn) {
            if (typeof isbnObj === "object" && isbnObj !== null) {
              const isbnData = isbnObj as Record<string, unknown>;
              if (isbnData.isbn) {
                const isbn = String(isbnData.isbn);
                if (isbn.length === 10 || (isbn.replace(/[^0-9Xx]/g, "").length === 10)) {
                  return isbn.replace(/[^0-9Xx]/g, "");
                }
              }
            }
          }
        } 
        // Handle single ISBN object
        else if (typeof recordData.isbn === "object" && recordData.isbn !== null) {
          const isbnData = recordData.isbn as Record<string, unknown>;
          if (isbnData.isbn) {
            const isbn = String(isbnData.isbn);
            if (isbn.length === 10 || (isbn.replace(/[^0-9Xx]/g, "").length === 10)) {
              return isbn.replace(/[^0-9Xx]/g, "");
            }
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get control number and identifier for institutional ID
   * @param record The processed record data
   * @returns Formatted control number string if found, null otherwise
   */
  private static getControlID(record: Record<string, unknown>): string | null {
    let controlNumber = null;
    let institutionCode = "lhs"; // Default institution code
    
    if (record.record && typeof record.record === "object") {
      const recordData = record.record as Record<string, unknown>;
      
      // Get control number
      if (recordData.controlNumber) {
        controlNumber = String(recordData.controlNumber).trim();
      }
      
      // Get institution code if available
      if (recordData.controlNumberIdentifier) {
        const idCode = String(recordData.controlNumberIdentifier).trim();
        if (idCode) {
          institutionCode = idCode.toLowerCase();
        }
      }
      
      if (controlNumber) {
        return `${institutionCode}_${controlNumber}`;
      }
    }
    
    // Try to get from metadata
    if (record.metadata && typeof record.metadata === "object") {
      const metadata = record.metadata as Record<string, unknown>;
      if (metadata.libraryInfo && typeof metadata.libraryInfo === "object") {
        const libraryInfo = metadata.libraryInfo as Record<string, unknown>;
        if (libraryInfo.itemNumber) {
          return `item_${String(libraryInfo.itemNumber).replace(/[^0-9]/g, "")}`;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Create a content-based hash from metadata
   * @param record The processed record data
   * @returns Hash string based on title, author, and year
   */
  private static getContentHash(record: Record<string, unknown>): string | null {
    if (record.metadata && typeof record.metadata === "object") {
      const metadata = record.metadata as Record<string, unknown>;
      
      let hashSource = "";
      
      if (metadata.title) {
        hashSource += String(metadata.title);
      }
      
      if (metadata.author) {
        hashSource += String(metadata.author);
      }
      
      if (metadata.publicationYear) {
        hashSource += String(metadata.publicationYear);
      }
      
      if (hashSource) {
        return this.createHash(hashSource);
      }
    }
    
    return null;
  }
  
  /**
   * Generate a filename for a record using a hierarchical approach
   * @param record The processed record
   * @param index Record index for fallback
   * @returns An object with the filename and the source used to generate it
   */
  private static generateFilename(record: Record<string, unknown>, index: number): { filename: string; source: string } {
    // Keep track of which method generated the filename
    let source = "";
    let filename = "";
    
    // Try ISBN-13 first (preferred)
    const isbn13 = this.getISBN13(record);
    if (isbn13) {
      source = "isbn13";
      filename = `${isbn13}.json`;
      return { filename, source };
    }
    
    // Then try ISBN-10
    const isbn10 = this.getISBN10(record);
    if (isbn10) {
      source = "isbn10";
      filename = `${isbn10}.json`;
      return { filename, source };
    }
    
    // Fall back to institutional control number
    const controlID = this.getControlID(record);
    if (controlID) {
      source = "control";
      filename = `${controlID}.json`;
      return { filename, source };
    }
    
    // Use content hash as a last resort for stable IDs
    const contentHash = this.getContentHash(record);
    if (contentHash) {
      source = "hash";
      filename = `hash_${contentHash}.json`;
      return { filename, source };
    }
    
    // Absolute last resort: record index
    source = "index";
    filename = `record_${(index + 1).toString().padStart(5, "0")}.json`;
    return { filename, source };
  }
  
  /**
   * Export MARC records as individual JSON files
   * @param records Array of MARC records
   * @param options Export options
   * @returns Number of records exported and counts of identifier types used
   */
  public static async exportRecords(
    records: MarcRecord[],
    options: RecordExportOptions
  ): Promise<{ total: number; idTypes: Record<string, number> }> {
    // Ensure output directory exists
    await ensureDir(options.outputDir);
    
    // Create human-readable converter options
    const converterOptions = {
      includeLeader: options.includeLeader,
      simplifyArrays: options.simplifyArrays,
      parseFixedFields: options.parseFixedFields
    };
    
    // Process and export each record
    let exportedCount = 0;
    const idTypeCounts: Record<string, number> = {
      isbn13: 0,
      isbn10: 0,
      control: 0,
      hash: 0,
      index: 0
    };
    
    // Track filenames to handle duplicates
    const usedFilenames = new Set<string>();
    
    for (let i = 0; i < records.length; i++) {
      try {
        // Convert record to human-readable JSON
        const recordData = HumanReadableConverter.toJson(records[i], converterOptions);
        
        // Extract metadata for top-level properties
        const metadata = this.extractMetadata(recordData);
        
        // Create final record with metadata at the top level
        const finalRecord = {
          metadata,
          record: recordData
        };
        
        // Generate filename based on hierarchical strategy
        const { filename, source } = this.generateFilename(finalRecord, i);
        
        // Handle potential duplicate filenames
        let finalFilename = filename;
        if (usedFilenames.has(filename)) {
          // If duplicate, add a suffix with the record index
          const extension = filename.endsWith('.json') ? '.json' : '';
          const baseName = filename.replace(/\.json$/, '');
          finalFilename = `${baseName}_${i}${extension}`;
        }
        usedFilenames.add(finalFilename);
        
        // Add identifier information to metadata
        (finalRecord.metadata as Record<string, unknown>).identifierType = source;
        
        // For records that don't use ISBN, add a stable URI
        if (source !== 'isbn13' && source !== 'isbn10') {
          const uri = `urn:library:lhs:${source}:${finalFilename.replace(/\.json$/, '')}`;
          (finalRecord.metadata as Record<string, unknown>).uri = uri;
        }
        
        const filePath = join(options.outputDir, finalFilename);
        
        // Write record to file
        await Deno.writeTextFile(filePath, JSON.stringify(finalRecord, null, 2));
        exportedCount++;
        
        // Track ID type counts
        idTypeCounts[source] = (idTypeCounts[source] || 0) + 1;
        
        // Log progress periodically
        if ((i + 1) % 500 === 0 || i === records.length - 1) {
          console.log(`Exported ${i + 1} of ${records.length} records...`);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        // Get identifier info for better error reporting
        let recordId = "unknown";
        try {
          if (records[i].fields.find(f => f.tag === "020")) {
            const isbnField = records[i].fields.find(f => f.tag === "020");
            if (isbnField?.subfields?.a) {
              recordId = `ISBN:${isbnField.subfields.a}`;
            }
          } else if (records[i].fields.find(f => f.tag === "001")) {
            const controlField = records[i].fields.find(f => f.tag === "001");
            if (controlField?.value) {
              recordId = `Control:${controlField.value}`;
            }
          }
        } catch (_) {
          // If we can't get ID info, continue with unknown
        }
        console.warn(`Warning: Error exporting record #${i + 1} (${recordId}): ${error.message}`);
        // Continue with next record
      }
    }
    
    return { total: exportedCount, idTypes: idTypeCounts };
  }
}