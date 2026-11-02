import proofs.«region-intervals».spec

/-! Models `selectRegionRows` in `packages/map-codec/src/map-rules.ts`. -/

namespace RegionSelection

open RegionIntervals (regionTest)

/-- `getRegionIndex` -/
def regionIndex (rows : List (List Nat)) : List (Nat × Nat) :=
  let pairs := rows.zipIdx.flatMap fun (ordinals, position) =>
    ordinals.map fun ordinal => (ordinal, position)
  pairs.mergeSort fun first second => first.1 ≤ second.1

/-- `R.sortedIndex` on a sorted list -/
def sortedIndex (ordinals : List Nat) (value : Nat) : Nat :=
  (ordinals.takeWhile (· < value)).length

/-- The `previous` check in `selectRegionRows` -/
def skipRepeats (previous : Option Nat) : List Nat → List Nat
  | [] => []
  | position :: rest =>
    if previous = some position then skipRepeats previous rest
    else position :: skipRepeats (some position) rest

def selectRegionRows (rows : List (List Nat)) (interval : Nat × Nat) : List (List Nat) :=
  let index := regionIndex rows
  let window := (index.drop (sortedIndex (index.map (·.1)) interval.1)).takeWhile
    (·.1 ≤ interval.2)
  let matched := (window.map (·.2)).mergeSort (· ≤ ·)
  (skipRepeats none matched).filterMap (rows[·]?)

def SelectMatchesFilter : Prop :=
  ∀ (rows : List (List Nat)) (interval : Nat × Nat),
    selectRegionRows rows interval = rows.filter (regionTest interval)

-- Cases from `packages/map-codec/src/map-rules.test.ts`
#guard selectRegionRows [[3], [4], [10], [11]] (4, 10) == [[4], [10]]
#guard selectRegionRows [[3, 4, 4], [99, 5]] (1, 10) == [[3, 4, 4], [99, 5]]
#guard selectRegionRows [[]] (1, 10) == []

end RegionSelection
