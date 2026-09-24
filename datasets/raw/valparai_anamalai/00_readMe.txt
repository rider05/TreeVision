================================================================================
README
Rainforest restoration monitoring dataset — Valparai plateau, Anamalai Hills,
Western Ghats, India
================================================================================

OVERVIEW
--------
This dataset compiles vegetation-monitoring records from a set of tropical
rainforest restoration studies carried out in degraded forest fragments across
the Valparai plateau (Anamalai Hills, Western Ghats, southern India). Sites span
actively restored plots, unrestored/degraded plots, and intact
benchmark forest. At each site, woody vegetation was surveyed in nested plots:
a larger 20x20 m plot recording established trees (girth and height), and a
smaller 5x5 m plot recording seedlings and saplings, larger trees overtopping the 
5x5m plot, and other (incidental) species recorded around the 5x5 plot.
Ground and canopy cover were scored in the 20x20 m plots.
Surveys were conducted in two rounds ("seasons") in many multiple seasons/rounds (S1, S2, S3).

The records are drawn from several overlapping studies, flagged per site in the
metadata file (a single site may belong to more than one study):

  studyChronos  - Chronosequence study: restored plots planted across a range of
                  years (~2002-2010) compared against unrestored and benchmark
                  forest, to track recovery of vegetation over time since
                  planting.
  studyCandura  - Candura fragment study: intensive survey within the 
                  Candura fragment, contrasting planted vs. not-planted areas and
                  control plots.
  studyDecadal  - Decadal resurvey: repeat monitoring of a subset of sites after
                  roughly a decade to assess longer-term change.
  studySeeWeed  - Seeding/weeding experiment: small experimental trial comparing
                  weeding, seeding, and combined weeding+seeding treatments.
  studyEucalyp  - Eucalyptus study: survey of Eucalyptus plantation plots (5x5 only)

FILE LIST
---------
  00_readMe.txt            - This file.
  01_metadata.csv          - One row per survey site; site attributes, location,
                             study membership, dates, treatment.
  02_data20x20.csv         - Individual tree records from the 20x20 m plots.
  03_cover20x20.csv        - Ground- and canopy-cover scores per 20x20 m plot.
  04_data5x5.csv           - Seedling/sapling counts by species per 5x5 m plot.
  05_treesAbove5x5.csv     - Larger trees overtopping the 5x5 m plot, by species.
  06_otherSpecies5x5.csv   - Other/non-target (e.g. weedy, herbaceous) species
                             recorded in the 5x5 m plot.
  07_specieslist.csv       - Taxonomic lookup table for the species recorded,
                             with GBIF-reconciled classification.
  08_extra20x20injiparai_INJ03U.csv
                           - Supplementary standalone 20x20 m tree survey of one
                             additional (excluded) Injiparai site,in wide format.
  09_extra5x5tataAGoffice_AGO_01-02-03R.csv
                           - Supplementary 5x5 m seedling/sapling records for the
                             TATA AG Office sites (AGO_01R/02R/03R).

Files are linked by siteID (all files) and by survey date/season
(date20x20, date5x5, season). The species column links the survey files to
07_specieslist.csv. Files 08 and 09 are self-contained supplements that carry
their own site/location fields.

Notes on shared conventions:
  - empty cells indicate no entry / not available / not recorded
  - Cover/abundance classes are ordinal: Absent < Low < Med < High.
  - verbatimSpecies preserves the name as originally recorded; species gives the
    reconciled/accepted name used for analysis.

================================================================================
COLUMN DESCRIPTIONS
================================================================================

================================================================================
--- 01_metadata.csv ---
  siteID           - Unique site/plot identifier used to link across all files.
  lat              - Site latitude, decimal degrees (WGS84).
  lon              - Site longitude, decimal degrees (WGS84).
  oldSiteID        - Previous/original site name used in earlier surveys.
  studyChronos     - Site included in the chronosequence study (Yes/No).
  studyCandura     - Site included in the Candura fragment study (Yes/No).
  studyDecadal     - Site included in the decadal resurvey (Yes/No).
  studySeeWeed     - Site included in the seeding/weeding experiment (Yes/No).
  studyEucalyp     - Site included in the Eucalyptus study (Yes/No).
  coverageData     - Which datasets exist for this site (pipe-separated tags,
                     e.g. 20x20|Cover|5x5|TreesAbove5x5|OtherSp5x5).
  fragment         - Name of the forest fragment / locality the site belongs to.
  treatment        - Restoration/management status of the site (e.g. Restored,
                     Unrestored, Planted, NotPlanted, Benchmark, Control,
                     Degraded, Forest, Eucalyptus, seeding/weeding classes).
  dataCollectors   - Initials/names of the field observers.
  soilCores        - Whether soil cores were collected at the site
		     (3 cores, when collected).
  notes            - Free-text notes about the plot.
  treatmentCandura - Treatment label specific to the Candura study.
  plantingYear     - Year the site was planted/restored (empty if not planted).
  areaCandura      - Candura-study sites - either original designated area ("original") or later addition of an erstwhile pepper plantation ("pepper") 
  spatialLocation  - Position of the site within the fragment/landscape (e.g. Edge, Interior, Dam, Tea Edge, Reserve, Middle).
  season           - Survey round/season code (S1 - first, S2 - second); S1 also indicates plots surveyed only once, and one plot (J06) was surveyed thrice (S3)
  date20x20        - Date the 20x20 m plot was surveyed (YYYY-MM-DD).
  date5x5          - Date the 5x5 m plot was surveyed (YYYY-MM-DD).
  canopyCoverPerc  - Canopy cover (closure) at the site, percent (0-100).

--- 02_data20x20.csv (individual trees in the 20x20 m plot) ---
  slNo             - Sequential record number within this file.
  slNoOrig         - Original record number from the source datasheet - discontinuities in slNoOrig indicate locations where extra AGO_01-02-03R were moved as we plots with rows in multiple rows
  date20x20        - Date the 20x20 m plot was surveyed (YYYY-MM-DD).
  siteID           - Site identifier (links to metadata and other files).
  season           - Survey round/season code (S1 - first, S2 - second); S1 also indicates plots surveyed only once, and one plot (J06) was surveyed thrice (S3)
  verbatimSpecies  - Species name as originally recorded in the field.
  species          - Reconciled/accepted species name.
  girthEff         - Effective girth of multiple stems (if present) combined as the square root of the sum of square girths of each stem, in cm; girth measured at breast height (GBH)
  girth1	   - girth of the 1st stem	
  .			.
  .			.
  .			.
  .			.
  girth23	   - girth of the 23rd stem (If present)
  height           - Tree height in m.
  remarks          - Free-text notes on the individual tree

--- 03_cover20x20.csv (ground/canopy cover in the 20x20 m plot) ---
  siteID           - Site identifier (links to other files).
  date20x20        - Date the 20x20 m plot was surveyed (YYYY-MM-DD).
  season           - Survey round/season code (S1 - first, S2 - second); S1 also indicates plots surveyed only once, and one plot (J06) was surveyed thrice (S3).
  canopyCover      - Canopy cover, percent (0-100).
  rock             - Rock ground cover class (Absent/Low/Med/High).
  soil             - Bare-soil ground cover class (Absent/Low/Med/High).
  litter           - Leaf-litter ground cover class (Absent/Low/Med/High).
  grass            - Grass cover class (Absent/Low/Med/High).
  wedelia          - Wedelia (Sphagneticola trilobata) cover class (Absent/Low/Med/High).
  herbs            - Herb cover class (Absent/Low/Med/High).
  coffee           - Coffee (Coffea canephora) cover class (Absent/Low/Med/High).
  remarks          - Free-text notes on the plot.

================================================================================
--- 04_data5x5.csv (seedling/sapling counts in the 5x5 m plot) ---
  siteID              - Site identifier (links to other files).
  date5x5             - Date the 5x5 m plot was surveyed (YYYY-MM-DD).
  season              - Survey round/season code (S1 - first, S2 - second); S1 also indicates plots surveyed only once, and one plot (J06) was surveyed thrice (S3)
  verbatimSpecies     - Species name as originally recorded in the field.
  species             - Reconciled/accepted species name.
  nSeedlingS1         - Count of seedlings recorded in season S1 | height >= 10cm AND height <= 50cm
  nSaplingS1          - Count of saplings recorded in season S1 | height > 50cm AND girth < 10cm
  nSeedlingCoppS1     - Count of coppicing seedlings, season S1 | height >= 10cm AND height <= 50cm
  nSaplingCoppS1      - Count of coppicing saplings, season S1 | height > 50cm AND girth < 10cm
  nSeedlingSmallS2    - Count of small seedlings, season S2 | height >= 10cm AND height <= 50cm
  nSeedlingSmallCoppS2- Count of small coppicing seedlings, season S2 | height >= 10cm AND height <= 50cm
  nSeedlingS2         - Count of seedlings, season S2 | height > 50cm AND girth <= 3.1cm
  nSeedlingCoppS2     - Count of coppicing seedlings, season S2 | height > 50cm AND girth <= 3.1cm
  nSaplingSmallS2     - Count of small saplings, season S2 | girth > 3.1cm AND girth <= 10cm
  nSaplingS2          - Count of saplings, season S2 | girth > 10cm AND girth < 30cm
  remarks             - Free-text notes on the record.
  nPlanted            - Number of planted individuals ("Yes" if # of individuals unspecified) - these are part of the seedlings/saplings recorded - not separate

--- 05_treesAbove5x5.csv (trees overtopping the 5x5 m plot) ---
  siteID           - Site identifier (links to other files).
  date5x5          - Date the 5x5 m plot was surveyed (YYYY-MM-DD).
  season           - Survey round/season code (S1 - first, S2 - second); S1 also indicates plots surveyed only once,  and one plot (J06) was surveyed thrice (S3)
verbatimSpecies  - Species name as originally recorded in the field.
  species          - Reconciled/accepted species name.

--- 06_otherSpecies5x5.csv (other/non-target species in the 5x5 m plot) ---
  siteID           - Site identifier (links to other files).
  date5x5          - Date the 5x5 m plot was surveyed (YYYY-MM-DD).
  season           - Survey round/season code (S1 - first, S2 - second); S1 also indicates plots surveyed only once, and one plot (J06) was surveyed thrice (S3)
  species          - Species/taxon name of non-target species as recorded.
  remarks          - Free-text notes on the record.

--- 07_specieslist.csv (taxonomic lookup for recorded species) ---
  species          - Species name as used in the survey files (join key).
  kingdom          - Kingdom of the taxon (GBIF classification).
  phylum           - Phylum of the taxon (GBIF classification).
  class            - Class of the taxon (GBIF classification).
  order            - Order of the taxon (GBIF classification).
  family           - Family of the taxon (GBIF classification).
  genus            - Genus of the taxon (GBIF classification).
  species_gbif     - GBIF-matched accepted species name (may differ from the
                     recorded species name where taxonomy was updated).

================================================================================
--- 08_extra20x20injipara_INJ03U.csv (supplementary 20x20 m tree survey, one
    additional/excluded Injipara site; one row per tree, wide format) ---
  studyChrono      - Chronosequence-study status of the site (here "Excluded").
  fragment         - Forest fragment / locality name (Injiparai).
  oldCode          - Original site code from the field datasheet (e.g. INJ 03 U).
  treatment        - Treatment/management label for the site (e.g. EXCLUDE).
  siteID           - Site identifier for this supplementary plot.
  lat              - Site latitude, decimal degrees (WGS84).
  lon              - Site longitude, decimal degrees (WGS84).
  dataCollectors   - Names/initials of the field observers.
  plantingYear     - Year the site was planted/restored.
  treatment2       - Secondary treatment descriptor (e.g. Unrestored).
  species          - Species name of the tree.
  gbh1             - Girth at breast height of stem 1, cm.
  gbh2             - Girth at breast height of stem 2, cm (0 if absent).
  gbh3             - Girth at breast height of stem 3, cm (0 if absent).
  gbh4             - Girth at breast height of stem 4, cm (0 if absent).
  gbh5             - Girth at breast height of stem 5, cm (0 if absent).
  gbh6             - Girth at breast height of stem 6, cm (0 if absent).
  gbh7             - Girth at breast height of stem 7, cm (0 if absent).
  gbh8             - Girth at breast height of stem 8, cm (0 if absent).
  gbh9             - Girth at breast height of stem 9, cm (0 if absent).
  gbh10            - Girth at breast height of stem 10, cm (0 if absent).
  gbh11            - Girth at breast height of stem 11, cm (0 if absent).
  height           - Tree height, m.
  remarks          - Free-text notes on the individual tree.
  canopyCover      - Canopy cover at the plot, percent (0-100).
  rock             - Rock ground cover class (Absent/Low/Med/High).
  soil             - Bare-soil ground cover class (Absent/Low/Med/High).
  litter           - Leaf-litter ground cover class (Absent/Low/Med/High).
  grass            - Grass cover class (Absent/Low/Med/High).
  wedelia          - Wedelia (invasive creeper) cover class (Absent/Low/Med/High).
  herbs            - Herb cover class (Absent/Low/Med/High).
  coffee           - Coffee cover class (Absent/Low/Med/High).
  date20x20        - Date the 20x20 m plot was surveyed (YYYY-MM-DD).
  soilCores        - Whether/how many soil samples were collected.

================================================================================
--- 09_extra5x5tataAGoffice_AGO_01-02-03R.csv (supplementary 5x5 m seedling/
    sapling records for the TATA AG Office sites) ---
  date5x5             - Date the 5x5 m plot was surveyed (ISO 8601 timestamp).
  fragment            - Forest fragment / locality name (TATA AG Office).
  siteID              - Site identifier (AGO_01R / AGO_02R / AGO_03R).
  treatment           - Treatment/management label for the site (e.g. Restored).
  verbatimSpecies     - Species name as originally recorded (NA where not given).
  species             - Reconciled/accepted species name.
  nSeedlingS1         - Count of seedlings recorded in season S1.
  nSaplingS1          - Count of saplings recorded in season S1.
  nSeedlingCoppS1     - Count of coppicing (resprouting) seedlings, season S1.
  nSaplingCoppS1      - Count of coppicing saplings, season S1.
  nSeedlingSmallS2    - Count of small seedlings, season S2.
  nSeedlingSmallCoppS2- Count of small coppicing seedlings, season S2.
  nSeedlingS2         - Count of seedlings, season S2.
  nSeedlingCoppS2     - Count of coppicing seedlings, season S2.
  nSaplingSmallS2     - Count of small saplings, season S2.
  nSaplingS2          - Count of saplings, season S2.
  remarks             - Free-text notes on the record.

================================================================================
