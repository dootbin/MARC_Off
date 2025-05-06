# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2023-04-06

### Added
- Initial release
- MARC to JSON conversion with human-readable field names
- JSON to MARC conversion
- Support for local library fields (090, 092, 690, 691, 900, 940, 950)
- Processing for fixed-length data fields
- Support for control fields, data fields, indicators, and subfields
- Test scripts for round-trip conversion
- Detailed record comparison tools
- Documentation of intentional field transformations (240↔130, 776↔530)