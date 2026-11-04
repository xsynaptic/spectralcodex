import proofs.«region-intervals».spec
import proofs.«search-highlights».spec

/-! Models `getRegionTests` in `packages/react-map-component/src/search/search-factory.ts`: the
named Regions' intervals go through `mergeIntervals` (`SearchHighlights.mergeIntervals`), and
each merged interval through the `region` case of `createRuleTest` (`RegionIntervals.regionTest`). -/

namespace RegionTerms

open RegionIntervals SearchHighlights

/-- `matchEntry` takes a Location in when `some` region test passes -/
def MergeKeepsLocations : Prop :=
  ∀ intervals : List (Nat × Nat), ∀ regionOrdinals : List Nat,
    (∃ interval ∈ mergeIntervals intervals, regionTest interval regionOrdinals = true) ↔
      ∃ interval ∈ intervals, regionTest interval regionOrdinals = true

-- Held against the real code by `merging the named Regions never changes which Locations a term takes in`
-- in `packages/react-map-component/src/search/search-factory.test.ts`
#guard mergeIntervals [(8, 9), (3, 10), (1, 2), (5, 6), (4, 7)] == [(1, 2), (3, 10)]

#guard mergeIntervals [(3, 6), (9, 4), (1, 4)] == [(1, 6), (9, 4)]

end RegionTerms
