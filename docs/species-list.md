# Phase 0 — MVP Species List (15)

Finalized from `plan.md` §7. Criteria: common in Coimbatore/TN, visually distinguishable for baseline, legally photographable, dataset availability.

| # | Common | Scientific | Tamil | Type | Key visual cue | Difficulty note |
|---|--------|------------|-------|------|----------------|-----------------|
| 1 | Neem | *Azadirachta indica* | வேம்பு | leaf/whole | pinnate serrated leaflets | vs Pungam — keep both to test confusion |
| 2 | Pungam | *Pongamia pinnata* | புங்கம் | leaf/bark | glossy oval leaflets | similar pinnate to Neem |
| 3 | Mango | *Mangifera indica* | மா | leaf/fruit | long lanceolate leaves | easy baseline |
| 4 | Tamarind | *Tamarindus indica* | புளி | leaf/pod | tiny feathery leaflets | distinctive |
| 5 | Banyan | *Ficus benghalensis* | ஆல் | whole/bark | aerial roots, broad leaves | vs Peepal — Ficus pair |
| 6 | Peepal | *Ficus religiosa* | அரசு | leaf | heart-shape with tail tip | vs Banyan |
| 7 | Jamun | *Syzygium cumini* | நாவல் | leaf/fruit | glossy opposite leaves | — |
| 8 | Guava | *Psidium guajava* | கொய்யா | leaf/fruit | veiny oval leaves | — |
| 9 | Jackfruit | *Artocarpus heterophyllus* | பலா | leaf/fruit | large dark leaves, huge fruit | easy |
| 10 | Rain tree | *Samanea saman* | தூங்குமூஞ்சி | whole | wide umbrella canopy | distinctive whole-tree |
| 11 | Gulmohar | *Delonix regia* | குல்மோகர் | flower/leaf | feathery leaves, red flowers | seasonal cue |
| 12 | Teak | *Tectona grandis* | தேக்கு | leaf/bark | very large rough leaves | distinctive |
| 13 | Eucalyptus | *Eucalyptus spp.* | தைலம் | bark/leaf | peeling bark, narrow leaves | — |
| 14 | Drumstick | *Moringa oleifera* | முருங்கை | leaf/pod | tripinnate tiny leaflets, long pods | distinctive |
| 15 | Golden shower | *Cassia fistula* | சரக்கொன்றை | flower | yellow hanging racemes | seasonal |

Expansion pool (to 30 after baseline): Indian almond, Casuarina, Palmyra, Amla, Arjun, Kadamba, Ashoka, Copperpod, Siris, Vaagai, Vengai, Poovarasu, Silk cotton, Sandalwood, Rosewood.

Rules:
- MVP = these 15 only. Do not add species until baseline top-1/top-3 measured.
- Collect leaf + bark + whole-tree per species where possible; tag image type in filename: `<species>_<type>_<treeID>_<nn>.jpg` e.g. `neem_leaf_T03_014.jpg`.
- `treeID` is mandatory for leakage control — same tree never spans train/test.
