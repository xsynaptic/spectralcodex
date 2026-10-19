# Spectral Codex

This file is a glossary of terms commonly used in this project.

## Language

### Content

**Entry**: A single piece of authored content in a collection. Images are the exception: they are Entries of the Images collection, but described by their own embedded metadata rather than by authored prose. _Avoid_: document, record, node, item (reserve "item" for catalog rows).

**Collection**: A named set of Entries sharing one schema (e.g. Locations, Posts, Pages, etc.). _Avoid_: content type, model.

**Location**: A specific real-world place with coordinates and a category. The central noun of the project; almost everything else exists to describe, group, or connect Locations. _Avoid_: place, site, POI, marker, pin.

**Post**: An article about one or more Locations, a journey, or a subject. Length and ambition vary freely, from a short observation to a full photo essay; there is no separate short-form collection. _Avoid_: article, blog post, story, note.

**Page**: A standalone Entry that is not part of the editorial stream (about, colophon, FAQs). _Avoid_: static page.

**Region**: An editorial geographic container, arranged in a hierarchy/tree, that a Location belongs to. Membership is cumulative: an Entry filed under a Region also belongs to every Region above it. Regions are the project's own geography, not necessarily an officially-sanctioned administrative one. _Avoid_: place, area, locale, geography.

**Primary Region**: The single Region used to file an Entry when it references several; the nearest common ancestor of them all. _Avoid_: main region, default region.

**Theme**: A subject-matter grouping (an era, an industry, a building typology) that cuts across Regions. Themes can nest inside other Themes, but unlike Regions their membership does not inherit: an Entry belongs only to the Themes it names, never to their parents. _Avoid_: tag, topic, category (Category means something else here).

**Series**: An ordered, hand-curated sequence of Entries, mixing collections. Unlike a Theme it is a deliberate reading order, not a classification. _Avoid_: collection, playlist, set.

**Chronology**: The temporal view of the project's own fieldwork and publishing, browsed by year and month. Where Location organizes the work spatially, the Chronology organizes it temporally. A given month may carry authored commentary alongside its computed activity. _Avoid_: archive, archives, timeline, history, feed.

**Catalog**: The unified, cross-collection view of user-facing Entries reduced to a common shape, used for listing, counting, sorting, and discovery. It covers Locations, Posts, Pages, Regions, Series, and Themes. Chronology and Images have pages of their own but are not catalogued. Neither are Resources, most of which are never published at all: the bulk of them exist only to name an external work so Entries can refer to it, and only a minority are written up as pages. _Avoid_: index, registry, manifest.

**Backlink**: An inbound reference to an Entry from another Entry's body. Only a deliberate internal reference creates one; an ordinary Markdown link does not. _Avoid_: reverse link, mention, connection.

### Attribution and reference

Nearly everything an Entry cites is written as either a Link or a Source, and the choice between them turns on the thing referred to, not on the relationship. A webpage that its address fully identifies becomes a Link; anything needing description (a book, a report, a journal article, a database, a work behind a paywall or since gone offline) becomes a Source. The two are listed separately because a column of addresses and a bibliography read differently.

**Resource**: An external work or site the project draws on, given its own Entry so it can be described once, referred to by many Entries, and gather what has been written from it. Books, reports, articles, databases, websites, and apps all qualify. _Avoid_: reference, citation, bibliography entry.

**Source**: A work an Entry drew on that needs describing rather than merely addressing, listed in the Entry's bibliography. It either names a Resource or is written out inline for a one-off that has no Resource of its own. Both carry the same description; the only difference is whether the work earned an Entry of its own. _Avoid_: reference, footnote.

**Link**: A plain outbound URL attached to an Entry, always external and always outbound; contrast Backlink, which is internal and inbound. Most Links are things consulted while writing, cited by address alone. The rest are pure pointers, sending a reader somewhere (a map pin, a photo gallery, an account) rather than recording something read. A Link whose address falls under a Resource's declared addresses binds to that Resource automatically, so linking to a known site is also a way of citing it. _Avoid_: external link, url.

### Assessment

Every scale below runs 1 to 5. They measure different things and are not interchangeable.

**Entry Quality**: How complete and well-developed the writing on an Entry is. Editorial self-assessment of the text, not of the subject. _Avoid_: quality, score, rating.

**Rating**: How interesting or worthwhile the Location itself is. A judgement about the place, not about the writing. _Avoid_: score, stars, quality.

**Precision**: Confidence in a Location's coordinates. Low values mean the placement is imprecise or an outright guess, and the map says so. _Avoid_: accuracy, confidence.

**Safety**: How hazardous visiting a Location is. _Avoid_: risk, danger level.

**Objective**: How much the author wants to visit a Location that they have not yet visited. A private planning signal, not reader-facing content. _Avoid_: priority, wishlist, todo, target.

### Geography

**Geometry**: The shape describing where a Location is: a point, a set of points, a line, or an area. _Avoid_: coordinates, geodata, position.

**Point**: One entry in a Location's Geometry. A Point carries its own coordinates and may carry its own title, description, Category, Status, Heritage, Precision, and Featured Image, each falling back to the Location's when absent. Most Locations have one; a temple complex or a chain of stations along a rail line has several. _Avoid_: sub-location, sub-geometry, marker, node.

**Division**: An external administrative polygon that a Region borrows, both to draw its visible edges and to check that Locations filed under it actually fall inside it. A Region is editorial and holds content; a Division is external, administrative, and holds only a shape. _Avoid_: boundary, border, admin region, region.

**Bounding Box**: The rectangle enclosing a set of features, used to frame a map on load. _Avoid_: viewport, extent, bbox in prose.

**Nearby**: The set of Locations closest to a given Location by real-world distance. _Avoid_: related, adjacent, proximate.

**Outlier**: A Location explicitly excluded from Bounding Box calculation so one distant point cannot zoom a map out to uselessness. _Avoid_: anomaly, stray.

**Category**: What kind of place a Location is (temple, factory, lighthouse, waterfall). _Avoid_: type, kind, class, tag.

**Status**: The present condition or accessibility of a Location (active, converted, abandoned, remnants, vanished). Answers "what has become of it". It never means the severity of a Notice. _Avoid_: state, condition, availability.

**Mood**: How a Location feels, on a scale from light to dark. A subjective register distinct from Status; it mostly concerns whether a Location is upbeat and family-friendly or more of a "dark tourism" destination. _Avoid_: layer, atmosphere, tone, vibe.

**Heritage**: A Location's formal heritage designation under a government preservation regime. Currently only Taiwan's Cultural Heritage Preservation Act classes are modelled. _Avoid_: protection, listing, landmark status.

### Maps

Map Scope, Map Filter, Map Target and Map View keep the prefix everywhere outside the map package and the atlas plans; inside those, where nothing else could be meant, the bare word (Scope, Target) is the same term.

**Feature**: One mappable unit as it appears on a map, carrying its Geometry and a trimmed set of display properties. A Feature is derived from a Point, not from a Location: a Location with several Points yields one Feature per Point. _Avoid_: marker, pin, item.

**Map Directory**: The dataset a map selects its Features from. _Avoid_: index (index means a numeric position or a listing route), catalog (Catalog is content-side), registry.

**Map Features**: The Features a map holds, selected from the Map Directory. The rule is fixed at build time; the browser applies it to the fetched Map Directory and never changes it.

**Map Scope**: The set of Features the Atlas map is currently limited to, named after the Entry that set it. A Region, Theme, Series or Post sets the Map Scope when it opens in the Pane; a Location inside it keeps it; a Location outside it clears it. The user can switch it off to see every Feature, then back on, without clearing it. A map has at most one, and while it is on, Features outside it are not displayed. In map search, a Scope row is a result that sets a Map Scope rather than opening a Location. _Avoid_: page features, highlight, selection, filter (a Map Filter is set by the user, a Map Scope by a page).

**Map Filter**: A map control the user sets to limit which Features the map displays, by Status, Rating, or Objective. Only the user sets a Map Filter; a page never does. _Avoid_: scope, facet.

**Source Data**: The minimal per-Feature payload needed to draw a map: identity, geometry, the few properties that drive styling, filtering and search ranking, and the address of the Feature's page. _Avoid_: geojson, features, source.

**Popup Data**: The richer per-Feature payload shown only once a reader opens a Feature (title, description, thumbnail, outbound links). _Avoid_: detail, tooltip, card.

**Chunk**: A geographically contiguous bundle of Popup Data, fetched on demand so a map never loads every popup up front. _Avoid_: tile, batch, page, shard.

**Atlas**: The full-screen map of Locations at `/atlas`, and Atlas mode, in which that same map stays beside the page being read, or behind it on a narrow screen. _Avoid_: explorer, map mode, mode on its own (Mode is the colour scheme).

**Split**: The Atlas layout with the map on the left and a page on the right. _Avoid_: two-pane, side-by-side.

**Pane**: The part of the Atlas that holds the page: one side of the Split, or the surface that covers the map in the Sheet. _Avoid_: sidebar, panel, drawer.

**Sheet**: The Atlas layout on a screen too narrow for the Split: the page sits over the map at one of three rests, and the reader moves it between them without losing their place. Raised, the page covers the map; at half, the page's top sits at the half line with the map above it; lowered, only the handle shows and the map has the screen. _Avoid_: drawer, modal, overlay, bottom sheet, detent, snap point (a rest), down (lowered).

**Map Target**: A Feature a map is asked to open or center on when it loads, typically the Location whose page is being read. _Avoid_: focus, selected, active, objective.

**Map View**: What the page being read asks the Atlas map to show: its Map Targets, a Map Scope, or neither. Each page carries one, and the map reads it again on every navigation. _Avoid_: page state, map state, viewport (that is the camera).

### Imagery

**Image**: A photograph in the media library, described by its own embedded metadata (capture settings, date, and sometimes coordinates) rather than by hand-authored frontmatter. _Avoid_: photo, asset, file, media.

**Featured Image**: An Image chosen to represent an Entry in listings, social previews, and page headers. An Entry may carry several; the first is the most representative and is the one used wherever a single image is needed. _Avoid_: cover, thumbnail, OG image.

**Hero**: The Featured Images promoted to the header display at the top of an Entry's page. Regions, Themes, and Series promote all of their Featured Images; Posts and the other editorial collections opt in per image, in authored order. _Avoid_: banner, splash, masthead.

### Multilingual

**Multilingual Title**: A title written in a script other than Latin, carried alongside the primary title rather than replacing it, and rendered with equal typographic care. _Avoid_: translation, localized title, alt title.

**Language Code**: The identifier for one of the project's supported written languages: English, Traditional and Simplified Chinese, Japanese, Thai, Korean, Vietnamese. _Avoid_: locale, lang, translation.

### Editorial control

**Former ID**: A previous identifier for an Entry, retained so old URLs keep resolving after a rename. _Avoid_: alias, slug history, redirect.

**Override**: An alternative title, identifier, description, or Region set published in place of the real ones for a Location whose Geometry is hidden, so it can be written about without being findable. _Avoid_: alias, mask, pseudonym.

**Content Policy**: The rules deciding what published output reveals of a Location. An Unlisted Location stays out of listings; a Location whose Geometry is hidden (`hideGeometry`) stays off maps, loses its coordinates and structured data, and may publish under Overrides. _Avoid_: privacy mode, redaction, censorship, feature flag.

**Unlisted Location**: A Location kept out of listings (`hideFromLists`) while its page, map Feature and search result remain. _Avoid_: hidden Location (hidden means its Geometry), private, draft.

### Interface

**Preview**: A Catalog Entry rendered as a summary for listing. _Avoid_: teaser, snippet, summary card, tile.

**Navigation**: The site's own link structure, in the header and the footer. _Avoid_: menu, menubar, nav bar.

**Notice**: A derived advisory on a Location page, computed from its Safety, Status, and Entry Quality rather than authored (see `noticeKeys` in `locations-section-notices.astro`). Its severity is a separate axis and never a Status. _Avoid_: alert, warning, callout, banner.

**Mode**: The colour scheme the site is read in: light, dark, or auto, which follows the system. The reader's choice is kept across visits. _Avoid_: theme (a Theme groups content), appearance, colour scheme.

### Development

**Inventory**: The dev-only page enumerating what the site is built from: every design token and every common component, rendered from its real source against fixture props. Injected at `/inventory` under `astro dev` only, from `src/dev/inventory/`, and absent from the build. Descriptive, never normative: it records what the code renders rather than prescribing what it should. _Avoid_: design system, style guide, pattern library, kitchen sink, storybook.

**Specimen**: One labeled entry in the Inventory: a single component or token set shown with its name, its source path, and an optional note. _Avoid_: example, demo, sample (a sample is the fixture data a Specimen renders with).
