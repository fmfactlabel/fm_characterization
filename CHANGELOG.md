# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.0] - 2026-04-23 

### Changed

- Modern Look & Feel.
- Metric Modal Overhaul:
  - Smart Content Formatting: Lists are now automatically split into vertical bulleted lines (using dot separators) instead of comma-separated strings.
  - Dynamic Header: The modal title now includes real-time badges for count (size) and ratio (percentage).
- JSON Serialization: Updated to_json to support UTF-8 encoding and special characters (ensure_ascii=False).
- Library Updates: Bumped third-party dependencies for D3.js and Bootstrap.

### Added

- SMT analysis integration for advanced analytical metrics.
- Metric update: Improved differentiation between Boolean configuration number and real configurations number.
- New metric: Unbounded features.
- Enhanced UI Feedback:
  - Non-blocking progress bar for Pyodide initialization.
  - Real-time progress bar for Fact Label generation in both Flask and Pyodide environments.
- New Configurable Options (UI):
  - Zebra striping: Toggle for alternating row background colors to improve readability.
  - Toggle percentages: Option to hide/show ratio percentages globally.
  - Ratio bars: Visual micro-visualizations (fill bars) for property ratios.
  - Metric Selector: Dynamic panel to further customize and filter the label's content.
  - 
- Feedback through progress bar for Fact Label generation in both Flask and Pyodide.
- New configurable option: Zebra striping
- New configurable option: Toggle percentages
- New configurable option: Ratio bar (toggle)
- New configurable option: Select metric to further customize the label.

### Removed

- App version from URL: Simplified routing for better SEO and cleaner navigation.

## [1.8.2] - 2026-03-01 

### Changed

- Update Flamapy and UVLParser to version 2.5.0.

## [1.8.1] - 2025-09-29 

### Changed

- Update UVL parser version.

## [1.8.0] - 2025-07-24 

### Added

- Deploy WASM web-based version of FM Fact Label.
- Generate a fact label from a URL of a feature model.
- _Language level_ new metadata for feature models.
- Support for feature models specified in JSON.
- Support for feature models specified in AFM (old FAMA tool).


### Changed

- Update Flamapy to version 2.1.0.dev0.
  
### Removed

- Usage statistics: Location of the generated fact labels.
- Examples of feature models (they are available in UVLHub).
  
## [1.7.0] - 2024-11-28

### Added

- Usage statistics: Location of the generated fact labels.
- Privacy message with terms and conditions of the service.

### Fixed

- _Partial variability_ metric when there are no variant features.

## [1.6.0] - 2024-11-11

### Added

- Light fact label option. A version excluding some analytical metrics (i.e., no BDD analysis).
- Deployed version of the tool in the URL.
- Support for Glencoe feature models.
- About information about the tool.
- This CHANGELOG file.
  

## [1.5.0] - 2024-10-31

### Added

- Support for uploading a previous calculated characterization in JSON.
  
### Fixed

- _Mode_ calculation in _Configuration distribution_.
- Round values for _Mean_ and _Median_ in _Configuration distribution_.


## [1.4.0] - 2024-10-29

### Added

- New metrics for non-logical constraints (e.g., arithmetics and aggregations).

### Fixed

- _Total variability_ metric.
  

## [1.3.0] - 2024-10-14

### Added

- New structural metrics for _Typed features_ and _Feature Cardinalities_.


## [1.2.0] - 2024-10-09

### Added

- 13 new analytical metrics (not structural).
- Save label as PDF.
- Modal show properties' values and copy utility.

### Fixed

- _Solitary features_ metric.
  
### Changed

- Improve organization of properties in the label.
- Renamed _Valid_ analytical metric operation to _Satisfiable_.


## [1.1.0] - 2024-10-04

### Added

- 6 new metrics about attributes.
- 4 new metrics about constraints.

### Changed

- Improve calculation efficiency. All metrics are computed in a single traverse of the feature tree.

### Removed

- An irrelevant metric: _Median depth of tree_.
- A duplicated metric: _Max depth of tree_ that was the same as _Depth of tree_.


## [1.0.0] - 2024-02-15

Original version as published [SPLC'22](https://dl.acm.org/doi/10.1145/3503229.3547025).