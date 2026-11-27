# Experiences development photo mapping

The approved Discover mockup establishes the photographic direction. The development fixture intentionally identifies its listed experiences and prices as samples. A licensed subject photo would illustrate a sample and would not verify that listing or its operator.

## Initial sourcing review

The existing repository asset `public/images/sigiriya.jpg` remains mapped to Sigiriya Rock Walk. Its licensing is not documented in the repository. No new photo files were added during the initial review. Wikimedia Commons attribution and license pages were reachable, but the workstation timed out on both `upload.wikimedia.org` and the official `thumb.wikimedia.org` image URL.

| Fixture ID | Missing local file under `public/images/experiences/` | Subject and sourcing status |
|---|---|---|
| `safari` | `yala-elephants.webp` | Sri Lankan elephants in Yala. [Photo by C.J. Hatton, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Sri_Lankan_Elephants_in_Yala_National_Park.jpg). |
| `tea` | `nuwara-eliya-tea.webp` | Green tea estate near Nuwara Eliya. [Photo by Muunaa-Selva, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Damro_Tea_Estate_-_Nuwaraeliya%2C_Sri_Lanka.jpg). |
| `village` | `kandyan-performance.webp` | Traditional Sri Lankan dance performance. [Subject candidate](https://commons.wikimedia.org/wiki/Category:Kandyan_dance). Confirm photo license, appropriate reuse of recognizable performers, and the location in the alt text. |
| `snorkel` | `trincomalee-underwater.webp` | Tropical underwater scene, preferably at Pigeon Island or near Trincomalee. Needs an approved source. |
| `rafting` | `kitulgala-rafting.webp` | Whitewater rafting in a forested river setting, preferably Kitulgala. Needs an approved source. |
| `hike` | `ella-little-adams-peak.webp` | Ella mountain scenery from the Little Adam’s Peak area. [Photo by Bcd4e6, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Little_Adam%27s_Peak%2C_Ella%2C_Sri_Lanka.jpg). |
| `cooking` | `sri-lankan-cooking.webp` | Traditional Sri Lankan cooking or food preparation. Needs an approved source. |
| `mangrove` | `bentota-mangroves.webp` | Sri Lankan mangrove-lined waterway, preferably Bentota or a regionally accurate alternative. Needs an approved source. |
| `birdwalk` | `colombo-wetland.webp` | Colombo-area wetland bird habitat. [Diyasaru Park photo by Randikachat, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Diyasaru.jpg). |

For each approved image, retain the creator, source, license URL and modification notes. Use an optimized landscape WebP or JPEG, with descriptive alt text and a 1.6:1 displayed frame. Add only verified local paths to the development fixture. The public Eco listing response has no thumbnail field. API-mode cards continue to use the existing category placeholder until the backend supplies a thumbnail contract.

## Integrated development assets

The initial sourcing review above records earlier download timeouts and candidate photographs. This implementation uses the authorized image-generation fallback for all nine requested files. The illustrations show fictional tourism scenes. They do not document the named listings, operators, or exact sites.

| Filename | Fixture mapping | Dimensions | File size | Source and type |
|---|---|---:|---:|---|
| `yala-elephants.webp` | `safari` | 1200 × 750 | 264,350 bytes | OpenAI image generation · AI-generated illustration |
| `nuwara-eliya-tea.webp` | `tea` | 1200 × 750 | 284,640 bytes | OpenAI image generation · AI-generated illustration |
| `kandyan-performance.webp` | `village` | 1200 × 750 | 290,062 bytes | OpenAI image generation · AI-generated illustration |
| `trincomalee-underwater.webp` | `snorkel` | 1200 × 750 | 258,758 bytes | OpenAI image generation · AI-generated illustration |
| `kitulgala-rafting.webp` | `rafting` | 1200 × 750 | 280,028 bytes | OpenAI image generation · AI-generated illustration |
| `ella-little-adams-peak.webp` | `hike` | 1200 × 750 | 280,010 bytes | OpenAI image generation · AI-generated illustration |
| `sri-lankan-cooking.webp` | `cooking` | 1200 × 750 | 211,216 bytes | OpenAI image generation · AI-generated illustration |
| `bentota-mangroves.webp` | `mangrove` | 1200 × 750 | 287,952 bytes | OpenAI image generation · AI-generated illustration |
| `colombo-wetland.webp` | `birdwalk` | 1200 × 750 | 240,118 bytes | OpenAI image generation · AI-generated illustration |
| `sigiriya.jpg` | `sigiriya` | 800 × 400 | 156,210 bytes | Existing repository photograph. Creator, license, and attribution requirements are undocumented. |

Each WebP was generated with OpenAI image generation for this task, center-cropped to 1.6:1 and encoded locally. No third-party source photograph or external photo license is attached to the generated files. The development disclosure identifies the imagery as illustrative.

Angular serves the nine WebPs from `src/development-assets/experiences/` as `/images/experiences/` in the development configuration only. The production build excludes the WebPs and their fixture mappings. API-mode catalog cards keep the category fallback where the backend provides no thumbnail. The existing public Sigiriya asset remains available independently of these new files.

