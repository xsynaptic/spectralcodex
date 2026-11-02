import proofs.«search-highlights».spec

namespace SearchHighlights

def WrittenRangeCovers : Prop :=
  ∀ (text : List Character) (position length : Nat),
    0 < length → position + length ≤ foldedLength text →
      ∃ first last, first ≤ last ∧ FoldsTo text first position ∧
        FoldsTo text last (position + length - 1) ∧
        getWrittenRange text position length = (writtenStart text first, writtenStart text (last + 1))

def MergeSeparates : Prop :=
  ∀ ranges : List (Nat × Nat), (∀ range ∈ ranges, range.1 ≤ range.2) →
    (mergeRanges ranges).Pairwise (fun earlier later => earlier.2 < later.1) ∧
      (∀ merged ∈ mergeRanges ranges, merged.1 ≤ merged.2) ∧
      (∀ unit, Covers (mergeRanges ranges) unit ↔ Covers ranges unit) ∧
      ∀ merged ∈ mergeRanges ranges,
        (∃ range ∈ ranges, range.1 = merged.1) ∧ ∃ range ∈ ranges, range.2 = merged.2

def RenderKeepsText : Prop :=
  ∀ {α : Type} (text : List α) (ranges : List (Nat × Nat)),
    ranges.Pairwise (fun earlier later => earlier.2 ≤ later.1) →
      (∀ range ∈ ranges, range.1 ≤ range.2) →
        (render text ranges).flatMap Part.units = text

theorem prefix_sum_mono {β : Type} (size : β → Nat) :
    ∀ (list : List β) {first second : Nat}, first ≤ second →
      ((list.take first).map size).sum ≤ ((list.take second).map size).sum
  | [], _, _, _ => by simp
  | head :: tail, first, second, hLe => by
    cases first with
    | zero => simp
    | succ first =>
      cases second with
      | zero => omega
      | succ second =>
        have := prefix_sum_mono size tail (first := first) (second := second) (by omega)
        simp only [List.take_succ_cons, List.map_cons, List.sum_cons]
        omega

theorem bounds_of_unit :
    ∀ (text : List Character) (start unit : Nat), unit < foldedLength text →
      ∃ index, FoldsTo text index unit ∧
        (unitBounds start text)[unit]? =
          some (start + writtenStart text index, start + writtenStart text (index + 1))
  | [], _, _, hUnit => by simp [foldedLength] at hUnit
  | character :: rest, start, unit, hUnit => by
    simp only [foldedLength, List.map_cons, List.sum_cons] at hUnit
    by_cases hHere : unit < character.folded
    · refine ⟨0, ⟨character, by simp, by simp [foldedStart], by simpa [foldedStart] using hHere⟩, ?_⟩
      rw [unitBounds, List.getElem?_append_left (by simpa using hHere)]
      simp [writtenStart, hHere]
    · have ⟨index, ⟨inner, hInner, hFrom, hTo⟩, hBounds⟩ :=
        bounds_of_unit rest (start + character.written) (unit - character.folded)
          (by simp only [foldedLength]; omega)
      refine ⟨index + 1, ⟨inner, by simpa using hInner, ?_, ?_⟩, ?_⟩
      · simp only [foldedStart, List.take_succ_cons, List.map_cons, List.sum_cons] at hFrom ⊢
        omega
      · simp only [foldedStart, List.take_succ_cons, List.map_cons, List.sum_cons] at hTo ⊢
        omega
      · rw [unitBounds, List.getElem?_append_right (by simp; omega)]
        simp only [List.length_replicate, hBounds, writtenStart, List.take_succ_cons,
          List.map_cons, List.sum_cons]
        congr 2 <;> omega

theorem foldsTo_mono :
    ∀ (text : List Character) {first last unit later : Nat},
      FoldsTo text first unit → FoldsTo text last later → unit ≤ later → first ≤ last := by
  intro text first last unit later ⟨character, hCharacter, hFrom, _⟩ ⟨other, hOther, _, hTo⟩ hLe
  refine Nat.le_of_not_lt fun hOrder => ?_
  have hPrefix := prefix_sum_mono (·.folded) text (first := last + 1) (second := first) hOrder
  have hLast : foldedStart text (last + 1) = foldedStart text last + other.folded := by
    simp [foldedStart, List.take_add_one, hOther]
  simp only [foldedStart] at hPrefix hLast hFrom hTo
  omega

theorem foldsTo_unique (text : List Character) {first second unit : Nat}
    (hFirst : FoldsTo text first unit) (hSecond : FoldsTo text second unit) : first = second :=
  Nat.le_antisymm (foldsTo_mono text hFirst hSecond (Nat.le_refl _))
    (foldsTo_mono text hSecond hFirst (Nat.le_refl _))

theorem written_range_covers : WrittenRangeCovers := by
  intro text position length hLength hInside
  have ⟨first, hFirst, hFirstBounds⟩ := bounds_of_unit text 0 position (by omega)
  have ⟨last, hLast, hLastBounds⟩ := bounds_of_unit text 0 (position + length - 1) (by omega)
  refine ⟨first, last, foldsTo_mono text hFirst hLast (by omega), hFirst, hLast, ?_⟩
  simp [getWrittenRange, hFirstBounds, hLastBounds]

theorem covers_cons {head : Nat × Nat} {tail : List (Nat × Nat)} {unit : Nat} :
    Covers (head :: tail) unit ↔ (head.1 ≤ unit ∧ unit < head.2) ∨ Covers tail unit := by
  simp [Covers]

theorem covers_append {first second : List (Nat × Nat)} {unit : Nat} :
    Covers (first ++ second) unit ↔ Covers first unit ∨ Covers second unit := by
  simp only [Covers, List.mem_append]
  grind

theorem covers_nil {unit : Nat} : Covers [] unit ↔ False := by
  simp [Covers]

theorem covers_singleton {range : Nat × Nat} {unit : Nat} :
    Covers [range] unit ↔ range.1 ≤ unit ∧ unit < range.2 := by
  simp [Covers]

def Starts (ranges : List (Nat × Nat)) (value : Nat) : Prop := ∃ range ∈ ranges, range.1 = value

def Ends (ranges : List (Nat × Nat)) (value : Nat) : Prop := ∃ range ∈ ranges, range.2 = value

def Invariant (merged seen : List (Nat × Nat)) : Prop :=
  merged.Pairwise (fun later earlier => earlier.2 < later.1) ∧
    (∀ range ∈ merged, range.1 ≤ range.2) ∧
    (∀ unit, Covers merged unit ↔ Covers seen unit) ∧
    ∀ range ∈ merged, Starts seen range.1 ∧ Ends seen range.2

theorem starts_append {seen : List (Nat × Nat)} {value : Nat} (range : Nat × Nat) :
    Starts seen value → Starts (seen ++ [range]) value := by
  rintro ⟨source, hSource, hValue⟩
  exact ⟨source, List.mem_append_left _ hSource, hValue⟩

theorem ends_append {seen : List (Nat × Nat)} {value : Nat} (range : Nat × Nat) :
    Ends seen value → Ends (seen ++ [range]) value := by
  rintro ⟨source, hSource, hValue⟩
  exact ⟨source, List.mem_append_left _ hSource, hValue⟩

theorem mergeStep_invariant {merged seen : List (Nat × Nat)} {range : Nat × Nat}
    (hInvariant : Invariant merged seen) (hOrdered : range.1 ≤ range.2)
    (hAfter : ∀ earlier ∈ merged, earlier.1 ≤ range.1) :
    Invariant (mergeStep merged range) (seen ++ [range]) ∧
      ∀ earlier ∈ mergeStep merged range, earlier.1 ≤ range.1 := by
  obtain ⟨hPairwise, hEach, hCovers, hEnds⟩ := hInvariant
  have hNew : Starts (seen ++ [range]) range.1 ∧ Ends (seen ++ [range]) range.2 :=
    ⟨⟨range, by simp, rfl⟩, ⟨range, by simp, rfl⟩⟩
  cases merged with
  | nil =>
    refine ⟨⟨by simp [mergeStep], by simp [mergeStep, hOrdered], fun unit => ?_, ?_⟩, ?_⟩
    · have hNone : ¬Covers seen unit := fun hSeen => by
        simpa [Covers] using (hCovers unit).2 hSeen
      simp only [mergeStep, covers_append, covers_singleton, hNone, false_or]
    · simpa [mergeStep] using hNew
    · simp [mergeStep]
  | cons last earlier =>
    have hLast := hAfter last (by simp)
    simp only [List.pairwise_cons, List.mem_cons, forall_eq_or_imp] at hPairwise hEach hEnds hAfter
    by_cases hJoin : range.1 ≤ last.2
    · simp only [mergeStep, hJoin, ite_true]
      refine ⟨⟨?_, ?_, fun unit => ?_, ?_⟩, ?_⟩
      · simpa [List.pairwise_cons] using hPairwise
      · simp only [List.mem_cons, forall_eq_or_imp]
        exact ⟨by omega, hEach.2⟩
      · have hArith : (last.1 ≤ unit ∧ unit < max last.2 range.2) ↔
            (last.1 ≤ unit ∧ unit < last.2) ∨ (range.1 ≤ unit ∧ unit < range.2) := by omega
        rw [covers_append, ← hCovers unit]
        simp only [covers_cons, covers_nil, hArith]
        grind
      · simp only [List.mem_cons, forall_eq_or_imp]
        refine ⟨⟨starts_append range hEnds.1.1, ?_⟩,
          fun other hOther => ⟨starts_append range (hEnds.2 other hOther).1,
            ends_append range (hEnds.2 other hOther).2⟩⟩
        by_cases hLonger : range.2 ≤ last.2
        · simpa [Nat.max_eq_left hLonger] using ends_append range hEnds.1.2
        · simpa [Nat.max_eq_right (by omega : last.2 ≤ range.2)] using hNew.2
      · simp only [List.mem_cons, forall_eq_or_imp]
        exact ⟨hLast, hAfter.2⟩
    · simp only [mergeStep, hJoin, ite_false]
      refine ⟨⟨?_, ?_, fun unit => ?_, ?_⟩, ?_⟩
      · simp only [List.pairwise_cons, List.mem_cons, forall_eq_or_imp]
        refine ⟨⟨by omega, fun other hOther => ?_⟩, hPairwise⟩
        have := hPairwise.1 other hOther
        omega
      · simp only [List.mem_cons, forall_eq_or_imp]
        exact ⟨hOrdered, hEach⟩
      · rw [covers_append, ← hCovers unit]
        simp only [covers_cons, covers_nil]
        grind
      · simp only [List.mem_cons, forall_eq_or_imp]
        exact ⟨hNew, ⟨starts_append range hEnds.1.1, ends_append range hEnds.1.2⟩,
          fun other hOther => ⟨starts_append range (hEnds.2 other hOther).1,
            ends_append range (hEnds.2 other hOther).2⟩⟩
      · simp only [List.mem_cons, forall_eq_or_imp]
        exact ⟨Nat.le_refl _, hLast, hAfter.2⟩

theorem merge_fold :
    ∀ (pending merged seen : List (Nat × Nat)),
      pending.Pairwise (fun first second => first.1 ≤ second.1) →
      (∀ range ∈ pending, range.1 ≤ range.2) →
      Invariant merged seen → (∀ earlier ∈ merged, ∀ range ∈ pending, earlier.1 ≤ range.1) →
        Invariant (pending.foldl mergeStep merged) (seen ++ pending)
  | [], merged, seen, _, _, hInvariant, _ => by simpa using hInvariant
  | range :: rest, merged, seen, hSorted, hOrdered, hInvariant, hAfter => by
    obtain ⟨hRangeFirst, hRestSorted⟩ := List.pairwise_cons.1 hSorted
    have ⟨hStep, hStepAfter⟩ := mergeStep_invariant hInvariant (hOrdered range (by simp))
      (fun earlier hEarlier => hAfter earlier hEarlier range (by simp))
    have := merge_fold rest (mergeStep merged range) (seen ++ [range]) hRestSorted
      (fun other hOther => hOrdered other (by simp [hOther])) hStep
      (fun earlier hEarlier other hOther =>
        Nat.le_trans (hStepAfter earlier hEarlier) (hRangeFirst other hOther))
    simpa using this

theorem merge_separates : MergeSeparates := by
  intro ranges hOrdered
  let sorted := ranges.mergeSort fun first second => first.1 ≤ second.1
  have hSorted : sorted.Pairwise (fun first second => first.1 ≤ second.1) := by
    simpa using List.pairwise_mergeSort
      (le := fun (first second : Nat × Nat) => decide (first.1 ≤ second.1))
      (by intro a b c; simp only [decide_eq_true_eq]; omega)
      (by intro a b; simp only [Bool.or_eq_true, decide_eq_true_eq]; omega) ranges
  have hEmpty : Invariant [] [] := by simp [Invariant, Covers]
  obtain ⟨hPairwise, hEach, hCovers, hEnds⟩ :=
    merge_fold sorted [] [] hSorted (fun range hRange => hOrdered range (List.mem_mergeSort.1 hRange))
      hEmpty (by simp)
  simp only [List.nil_append] at hCovers hEnds
  refine ⟨?_, ?_, fun unit => ?_, fun range hRange => ?_⟩
  · simpa [mergeRanges, List.pairwise_reverse] using hPairwise
  · simpa [mergeRanges] using hEach
  · have := hCovers unit
    simp only [Covers, mergeRanges, List.mem_reverse] at this ⊢
    simpa [sorted, List.mem_mergeSort] using this
  · obtain ⟨⟨source, hSource, hStart⟩, ⟨other, hOther, hEnd⟩⟩ :=
      hEnds range (by simpa [mergeRanges] using hRange)
    exact ⟨⟨source, List.mem_mergeSort.1 hSource, hStart⟩, ⟨other, List.mem_mergeSort.1 hOther, hEnd⟩⟩

theorem slice_append_drop {α : Type} (text : List α) {start finish : Nat} (hOrder : start ≤ finish) :
    slice text start finish ++ text.drop finish = text.drop start := by
  have hDrop : text.drop finish = (text.drop start).drop (finish - start) := by
    rw [List.drop_drop]
    congr 1
    omega
  rw [slice, hDrop, List.take_append_drop]

theorem renderFrom_units {α : Type} (text : List α) :
    ∀ (ranges : List (Nat × Nat)) (cursor : Nat),
      ranges.Pairwise (fun earlier later => earlier.2 ≤ later.1) →
      (∀ range ∈ ranges, cursor ≤ range.1 ∧ range.1 ≤ range.2) →
        (renderFrom text cursor ranges).flatMap Part.units = text.drop cursor
  | [], cursor, _, _ => by simp [renderFrom, Part.units]
  | (start, finish) :: rest, cursor, hPairwise, hRanges => by
    have hHead := hRanges (start, finish) (by simp)
    obtain ⟨hRestAfter, hRestPairwise⟩ := List.pairwise_cons.1 hPairwise
    have ih := renderFrom_units text rest finish hRestPairwise
      (fun range hRange => ⟨hRestAfter range hRange, (hRanges range (by simp [hRange])).2⟩)
    simp only [renderFrom, List.flatMap_cons, Part.units, ih]
    rw [slice_append_drop text hHead.2, slice_append_drop text hHead.1]

theorem render_keeps_text : RenderKeepsText := by
  intro α text ranges hPairwise hOrdered
  simpa [render] using renderFrom_units text ranges 0 hPairwise
    (fun range hRange => ⟨Nat.zero_le _, hOrdered range hRange⟩)

theorem highlights_keep_title : HighlightsKeepTitle := by
  intro α text units termMatches hMatches
  have hWritten : ∀ range ∈ termMatches.map fun termMatch =>
      getWrittenRange text termMatch.1 termMatch.2,
      range.1 ≤ range.2 ∧ (∃ index ≤ text.length, range.1 = writtenStart text index) ∧
        ∃ index ≤ text.length, range.2 = writtenStart text index := by
    intro range hRange
    obtain ⟨termMatch, hMember, rfl⟩ := List.mem_map.1 hRange
    obtain ⟨hPositive, hInside⟩ := hMatches termMatch hMember
    obtain ⟨first, last, hOrder, ⟨_, hFirst, _⟩, ⟨_, hLast, _⟩, hRangeEq⟩ :=
      written_range_covers text termMatch.1 termMatch.2 hPositive hInside
    obtain ⟨hFirstInside, _⟩ := List.getElem?_eq_some_iff.1 hFirst
    obtain ⟨hLastInside, _⟩ := List.getElem?_eq_some_iff.1 hLast
    rw [hRangeEq]
    exact ⟨prefix_sum_mono _ text (by omega), ⟨first, by omega, rfl⟩, ⟨last + 1, by omega, rfl⟩⟩
  obtain ⟨hSeparated, hOrdered, hCovers, hEnds⟩ :=
    merge_separates _ (fun range hRange => (hWritten range hRange).1)
  refine ⟨render_keeps_text units _ (hSeparated.imp Nat.le_of_lt) hOrdered, fun unit => ?_,
    fun range hRange => ?_⟩
  · rw [hCovers unit]
    constructor
    · rintro ⟨range, hRange, hFrom, hTo⟩
      obtain ⟨termMatch, hMember, rfl⟩ := List.mem_map.1 hRange
      obtain ⟨hPositive, hInside⟩ := hMatches termMatch hMember
      obtain ⟨first, last, _, hFirst, hLast, hRangeEq⟩ :=
        written_range_covers text termMatch.1 termMatch.2 hPositive hInside
      simp only [hRangeEq] at hFrom hTo
      exact ⟨termMatch, hMember, first, last, hFirst, hLast, hFrom, hTo⟩
    · rintro ⟨termMatch, hMember, first, last, hFirst, hLast, hFrom, hTo⟩
      obtain ⟨hPositive, hInside⟩ := hMatches termMatch hMember
      obtain ⟨written, writtenLast, _, hWrittenFirst, hWrittenLast, hRangeEq⟩ :=
        written_range_covers text termMatch.1 termMatch.2 hPositive hInside
      obtain rfl := foldsTo_unique text hFirst hWrittenFirst
      obtain rfl := foldsTo_unique text hLast hWrittenLast
      exact ⟨_, List.mem_map.2 ⟨termMatch, hMember, rfl⟩, by simpa [hRangeEq] using hFrom,
        by simpa [hRangeEq] using hTo⟩
  obtain ⟨⟨source, hSource, hStart⟩, ⟨other, hOther, hEnd⟩⟩ := hEnds range hRange
  obtain ⟨startIndex, hStartInside, hStartAt⟩ := (hWritten source hSource).2.1
  obtain ⟨endIndex, hEndInside, hEndAt⟩ := (hWritten other hOther).2.2
  exact ⟨⟨startIndex, hStartInside, hStart ▸ hStartAt⟩, ⟨endIndex, hEndInside, hEnd ▸ hEndAt⟩⟩

end SearchHighlights
