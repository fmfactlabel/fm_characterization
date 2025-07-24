# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2025-07-24 

### Added

- Deploy WASM web-based version of FM Fact Label.
- Support for feature models specified in JSON.
- Support for feature models specified in AFM (old FAMA tool).

### Fixed

- 

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