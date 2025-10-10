# react-map-component

MapLibre GL JS component for rendering geographic location data with dynamic filtering, clustering, and administrative boundary overlays.

## Features

Built on [react-map-gl](https://visgl.github.io/react-map-gl/) with [Protomaps](https://protomaps.com/) basemap tiles and PMTiles protocol. The component consumes compressed JSON for point/line geometries and streams FlatGeobuf files for administrative divisions, enabling low-bandwidth map initialization with thousands of features.

**Data compression**: Location properties use numeric enums and single-letter keys to reduce payload size. Zod schemas transform compressed data to developer-friendly structures at runtime, achieving ~60% size reduction compared to verbose GeoJSON while maintaining type safety.

**Streaming boundaries**: Administrative divisions are fetched as FlatGeobuf files and geometrically inverted using Turf.js to create "mask" layers that highlight regions by dimming everything outside their boundaries. FlatGeobuf's column-oriented format enables progressive decoding without loading entire datasets into memory.

**State management**: [Zustand](https://zustand-demo.pmnd.rs/) store with [React Query](https://tanstack.com/query/latest) for async data fetching and IndexedDB persistence. Map filters (status, quality, rating, objective) trigger memoized GeoJSON reconstruction rather than mutating layer sources, preserving React's unidirectional data flow.

**Dynamic styling**: MapLibre layer specifications are generated via hooks that interpolate style properties based on zoom level, selection state, and dark mode. Expressions use feature properties to drive data-driven styling for status colors, cluster sizing, and hover effects.

**Clustering**: SuperCluster integration with dynamic radius scaling and multi-tier visual hierarchy. Cluster styling uses interpolated expressions to scale radius and color by point count, with enlarged tap targets for mobile interaction.
