# Spectral Codex

This file is a glossary of terms commonly used in this project.

## Language

### Content

**Entry**: A single piece of authored content in a collection, sourced from one Markdown or MDX file. _Avoid_: document, record, node, item (reserve "item" for catalog rows).

**Collection**: A named set of Entries sharing one schema (e.g. Locations, Posts, Notes, Pages, etc.). _Avoid_: content type, model.

**Location**: A specific real-world place with coordinates, a category, and a condition. The central noun of the project; almost everything else exists to describe, group, or connect Locations. _Avoid_: place, site, POI, marker, pin.

**Post**: A long-form article about one or more Locations, a journey, or a subject. _Avoid_: article, blog post, story.

**Note**: A short Post. The distinction is length and ambition, not kind: an observation that does not justify a full article. _Avoid_: snippet, micropost, aside.

**Page**: A standalone Entry that is not part of the editorial stream (about, colophon, FAQs). Unlike other collections, its URL mirrors its position on the file system. _Avoid_: static page.

**Region**: An editorial geographic container, arranged in a hierarchy/tree, that a Location belongs to. Regions are the project's own geography, not necessarily an officially-sanctioned administrative one. _Avoid_: place, area, locale, geography.

**Primary Region**: The single Region used to file an Entry when it references several; the nearest common ancestor of them all. _Avoid_: main region, default region.

**Theme**: A subject-matter grouping (an era, an industry, a building typology) that cuts across Regions. Themes can nest inside other Themes. _Avoid_: tag, topic, category (Category means something else here).

**Series**: An ordered, hand-curated sequence of Entries, mixing collections. Unlike a Theme it is a deliberate reading order, not a classification. _Avoid_: collection, playlist, set.

**Chronology**: The temporal view of the project's own fieldwork and publishing, browsed by year and month. Where Location organizes the work spatially, the Chronology organizes it temporally. A given month may carry authored commentary alongside its computed activity. _Avoid_: archive, archives, timeline, history, feed.

**Catalog**: The unified, cross-collection view of every user-facing Entry reduced to a common shape, used for listing, counting, sorting, and discovery. _Avoid_: index, registry, manifest.

**Backlink**: An inbound reference to an Entry, discovered from links embedded in another Entry's body. _Avoid_: reverse link, mention.

### Attribution and reference

**Resource**: A citable external work (a webpage, book, chapter, article, or report) that exists as its own Entry and can be drawn on by many other Entries. _Avoid_: reference, citation, bibliography entry.

**Source**: A citation attached to an Entry, naming a Resource by identifier or written out inline for a one-off with no Resource of its own. _Avoid_: reference, footnote.

**Link**: A plain outbound URL attached to an Entry. A Link whose address matches a Resource's URL pattern binds to that Resource automatically, so linking to a known site is also a way of citing it. _Avoid_: external link, url.

### Assessment

Every scale below runs 1 to 5. They measure different things and are not interchangeable.

**Entry Quality**: How complete and well-developed the writing on an Entry is. Editorial self-assessment of the text, not of the subject. _Avoid_: quality, score, rating.

**Rating**: How interesting or worthwhile the Location itself is. A judgement about the place, not about the writing. _Avoid_: score, stars, quality.

**Precision**: Confidence in a Location's coordinates. Low values mean the placement is imprecise or an outright guess, and the map says so. _Avoid_: accuracy, confidence.

**Safety**: How hazardous visiting a Location is. _Avoid_: risk, danger level.

**Objective**: How much the author wants to visit a Location that they have not yet visited. A private planning signal, not reader-facing content. _Avoid_: priority, wishlist, todo, target.

### Geography

**Geometry**: The GeoJSON shape describing where a Location is: a point, a set of points, a line, or an area. _Avoid_: coordinates, geodata, position.

**Division**: An Overture Maps administrative polygon that a Region borrows, both to draw its visible edges and to check that Locations filed under it actually fall inside it. A Region is editorial and holds content; a Division is external, administrative, and holds only a shape. _Avoid_: boundary, border, admin region, region.

**Bounding Box**: The rectangle enclosing a set of features, used to frame a map on load. _Avoid_: viewport, extent, bbox in prose.

**Nearby**: The set of Locations closest to a given Location by real-world distance. _Avoid_: related, adjacent, proximate.

**Outlier**: A Location explicitly excluded from Bounding Box calculation so one distant point cannot zoom a map out to uselessness. _Avoid_: anomaly, stray.

**Category**: What kind of place a Location is (temple, factory, lighthouse, waterfall). _Avoid_: type, kind, class, tag.

**Status**: The present condition or accessibility of a Location (active, converted, abandoned, remnants, vanished). Answers "what has become of it". _Avoid_: state, condition, availability.

**Mood**: How a Location feels, on a scale from light to dark. A subjective register distinct from Status; it mostly concerns whether a Location is upbeat and family-friendly or more of a "dark tourism" destination. _Avoid_: layer, atmosphere, tone, vibe.

**Heritage**: A Location's formal heritage designation under a government preservation regime. Currently only Taiwan's Cultural Heritage Preservation Act classes are modelled. _Avoid_: protection, listing, landmark status.

### Maps

**Feature**: One Location as it appears on a map, carrying its Geometry and a trimmed set of display properties. _Avoid_: marker, pin, point, item.

**Map Index**: The single global dataset of every mappable Feature, built once and shared by every map on the site. _Avoid_: catalog (Catalog is content-side), dataset, registry.

**Scope**: The rule a given map applies to the Map Index to keep only the Features it should show, expressed as a Region subtree, a Theme, or an explicit list. _Avoid_: filter, query, selection.

**Source Data**: The minimal per-Feature payload needed to draw a map: identity, geometry, and the few properties that drive styling and filtering. _Avoid_: geojson, features, source.

**Popup Data**: The richer per-Feature payload shown only once a reader opens a Feature (title, description, thumbnail, outbound links). _Avoid_: detail, tooltip, card.

**Chunk**: A geographically contiguous bundle of Popup Data, fetched on demand so a map never loads every popup up front. _Avoid_: tile, batch, page, shard.

**Target**: A Feature a map is asked to open or centre on when it loads, typically the Location whose page is being read. _Avoid_: focus, selected, active, objective.

### Imagery

**Image**: A photograph in the media library, described by its own embedded metadata (capture settings, date, and sometimes coordinates) rather than by hand-authored frontmatter. _Avoid_: photo, asset, file, media.

**Featured Image**: The single Image chosen to represent an Entry in listings, social previews, and page headers. _Avoid_: hero, cover, thumbnail, OG image.

### Multilingual

**Multilingual Title**: A title written in a script other than Latin, carried alongside the primary title rather than replacing it, and rendered with equal typographic care. _Avoid_: translation, localized title, alt title.

**Language Code**: The identifier for one of the project's supported written languages: English, Traditional and Simplified Chinese, Japanese, Thai, Korean, Vietnamese. _Avoid_: locale, lang, translation.

### Editorial control

**Former ID**: A previous identifier for an Entry, retained so old URLs keep resolving after a rename. _Avoid_: alias, slug history, redirect.

**Override**: An alternative title, identifier, or Region set published in place of the real ones for a sensitive Location, so it can be written about without being findable. _Avoid_: alias, mask, pseudonym.
