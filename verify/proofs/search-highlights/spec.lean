/-! Models `getWrittenRange` in `packages/react-map-component/src/search/search-normalize.ts`,
`mergeIntervals` as `getRanges` calls it in `packages/react-map-component/src/search/search-factory.ts`, and
`MapSearchHighlight` in `packages/react-map-component/src/search/search-box.tsx`. -/

namespace SearchHighlights

/-- `character.length`, and the length of `normalizeCharacter(character)` -/
structure Character where
  written : Nat
  folded : Nat

/-- The `starts` and `ends` arrays in `getWrittenRange` -/
def unitBounds (start : Nat) : List Character → List (Nat × Nat)
  | [] => []
  | character :: rest =>
    List.replicate character.folded (start, start + character.written) ++
      unitBounds (start + character.written) rest

def getWrittenRange (text : List Character) (position length : Nat) : Nat × Nat :=
  let bounds := unitBounds 0 text
  let rangeStart := (bounds[position]?.map (·.1)).getD 0
  (rangeStart, (bounds[position + length - 1]?.map (·.2)).getD rangeStart)

/-- The loop body in `mergeIntervals`, with `merged` kept newest first -/
def mergeStep : List (Nat × Nat) → Nat × Nat → List (Nat × Nat)
  | last :: earlier, range =>
    if range.1 ≤ last.2 then (last.1, max last.2 range.2) :: earlier
    else range :: last :: earlier
  | [], range => [range]

def mergeIntervals (ranges : List (Nat × Nat)) : List (Nat × Nat) :=
  ((ranges.mergeSort fun first second => first.1 ≤ second.1).foldl mergeStep []).reverse

inductive Part (α : Type) where
  | plain (units : List α)
  | mark (units : List α)

def Part.units {α : Type} : Part α → List α
  | .plain units => units
  | .mark units => units

/-- `String.prototype.slice` -/
def slice {α : Type} (text : List α) (start finish : Nat) : List α :=
  (text.drop start).take (finish - start)

/-- The loop in `MapSearchHighlight` -/
def renderFrom {α : Type} (text : List α) (cursor : Nat) : List (Nat × Nat) → List (Part α)
  | [] => [.plain (text.drop cursor)]
  | (start, finish) :: rest =>
    .plain (slice text cursor start) :: .mark (slice text start finish) ::
      renderFrom text finish rest

def render {α : Type} (text : List α) (ranges : List (Nat × Nat)) : List (Part α) :=
  renderFrom text 0 ranges

def writtenStart (text : List Character) (index : Nat) : Nat :=
  ((text.take index).map (·.written)).sum

def foldedLength (text : List Character) : Nat :=
  (text.map (·.folded)).sum

def foldedStart (text : List Character) (index : Nat) : Nat :=
  ((text.take index).map (·.folded)).sum

def FoldsTo (text : List Character) (index unit : Nat) : Prop :=
  ∃ character, text[index]? = some character ∧
    foldedStart text index ≤ unit ∧ unit < foldedStart text index + character.folded

def Covers (ranges : List (Nat × Nat)) (unit : Nat) : Prop :=
  ∃ range ∈ ranges, range.1 ≤ unit ∧ unit < range.2

def HighlightsKeepTitle : Prop :=
  ∀ {α : Type} (text : List Character) (units : List α) (termMatches : List (Nat × Nat)),
    (∀ termMatch ∈ termMatches, 0 < termMatch.2 ∧ termMatch.1 + termMatch.2 ≤ foldedLength text) →
      let ranges := mergeIntervals (termMatches.map fun termMatch => getWrittenRange text termMatch.1 termMatch.2)
      (render units ranges).flatMap Part.units = units ∧
        (∀ unit, Covers ranges unit ↔ ∃ termMatch ∈ termMatches, ∃ first last,
          FoldsTo text first termMatch.1 ∧ FoldsTo text last (termMatch.1 + termMatch.2 - 1) ∧
          writtenStart text first ≤ unit ∧ unit < writtenStart text (last + 1)) ∧
        ∀ range ∈ ranges,
          (∃ index ≤ text.length, range.1 = writtenStart text index) ∧
            ∃ index ≤ text.length, range.2 = writtenStart text index

-- Pinned by `highlights take in a dropped apostrophe and a surrogate pair, whatever the word order`
-- in `packages/react-map-component/src/search/search-factory.test.ts`
def haleiwaTitle : List Character :=
  [⟨1, 1⟩, ⟨1, 1⟩, ⟨1, 1⟩, ⟨1, 1⟩, ⟨1, 0⟩, ⟨1, 1⟩, ⟨1, 1⟩, ⟨1, 1⟩, ⟨1, 1⟩, ⟨2, 2⟩]

#guard mergeIntervals [getWrittenRange haleiwaTitle 8 2, getWrittenRange haleiwaTitle 0 7] == [(0, 8), (9, 11)]

end SearchHighlights
