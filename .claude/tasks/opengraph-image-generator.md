# OpenGraph Image Generator MVP

## Tasks

### 1. Improve Image Design
- [ ] Enhance `packages/image-open-graph/src/element.tsx` with better visual hierarchy
- [ ] Add collection-specific styling (different colors/layouts per content type)  
- [ ] Improve typography (better spacing, font sizes, text wrapping)
- [ ] Add fallback design for entries without featured images

### 2. Create Unified Route
- [ ] Create `src/pages/meta/[collection]/[...id].png.ts` that handles all collections
- [ ] Copy conversion logic from existing locations route
- [ ] Delete `src/pages/meta/locations/[...id].png.ts`
- [ ] Delete `src/pages/[opengraph]/[collection]/[...id].[ext].ts`  
- [ ] Delete `src/pages/[opengraph]/[...id].[ext].ts`

### 3. Enable Feature
- [ ] Set `FEATURE_OPEN_GRAPH_IMAGES = true` in `src/constants.ts`