import proofs.«region-terms».spec

namespace RegionTerms

open RegionIntervals SearchHighlights

def Holds (intervals : List (Nat × Nat)) (ordinal : Nat) : Prop :=
  ∃ interval ∈ intervals, interval.1 ≤ ordinal ∧ ordinal ≤ interval.2

theorem holds_cons {head : Nat × Nat} {tail : List (Nat × Nat)} {ordinal : Nat} :
    Holds (head :: tail) ordinal ↔ (head.1 ≤ ordinal ∧ ordinal ≤ head.2) ∨ Holds tail ordinal := by
  simp [Holds]

theorem mergeStep_holds {merged : List (Nat × Nat)} {range : Nat × Nat}
    (hAfter : ∀ earlier ∈ merged, earlier.1 ≤ range.1) (ordinal : Nat) :
    Holds (mergeStep merged range) ordinal ↔
      Holds merged ordinal ∨ (range.1 ≤ ordinal ∧ ordinal ≤ range.2) := by
  cases merged with
  | nil => simp [mergeStep, Holds]
  | cons last earlier =>
    have hLast := hAfter last List.mem_cons_self
    by_cases hJoin : range.1 ≤ last.2
    · simp only [mergeStep, hJoin, ite_true, holds_cons]
      grind
    · simp only [mergeStep, hJoin, ite_false, holds_cons]
      grind

theorem mergeStep_after {merged : List (Nat × Nat)} {range : Nat × Nat} {bound : Nat}
    (hMerged : ∀ earlier ∈ merged, earlier.1 ≤ bound) (hRange : range.1 ≤ bound) :
    ∀ earlier ∈ mergeStep merged range, earlier.1 ≤ bound := by
  cases merged with
  | nil => simpa [mergeStep] using hRange
  | cons last earlier =>
    simp only [List.mem_cons, forall_eq_or_imp] at hMerged
    by_cases hJoin : range.1 ≤ last.2
    · simp only [mergeStep, hJoin, ite_true, List.mem_cons, forall_eq_or_imp]
      exact hMerged
    · simp only [mergeStep, hJoin, ite_false, List.mem_cons, forall_eq_or_imp]
      exact ⟨hRange, hMerged⟩

/-- Every interval the fold has merged starts no later than any still pending -/
theorem merge_fold_holds :
    ∀ (pending merged : List (Nat × Nat)),
      pending.Pairwise (fun first second => first.1 ≤ second.1) →
        (∀ earlier ∈ merged, ∀ range ∈ pending, earlier.1 ≤ range.1) →
          ∀ ordinal, Holds (pending.foldl mergeStep merged) ordinal ↔
            Holds merged ordinal ∨ Holds pending ordinal
  | [], merged, _, _ => by simp [Holds]
  | range :: rest, merged, hSorted, hAfter => by
    obtain ⟨hRangeFirst, hRestSorted⟩ := List.pairwise_cons.1 hSorted
    have hStepAfter : ∀ earlier ∈ mergeStep merged range, ∀ other ∈ rest, earlier.1 ≤ other.1 :=
      fun earlier hEarlier other hOther =>
        mergeStep_after (fun earlier hEarlier => Nat.le_trans
            (hAfter earlier hEarlier range List.mem_cons_self) (hRangeFirst other hOther))
          (hRangeFirst other hOther) earlier hEarlier
    intro ordinal
    have hRest := merge_fold_holds rest (mergeStep merged range) hRestSorted hStepAfter ordinal
    have hStep := mergeStep_holds (fun earlier hEarlier => hAfter earlier hEarlier range List.mem_cons_self) ordinal
    simp only [List.foldl_cons, hRest, hStep, holds_cons]
    grind

theorem merge_holds (intervals : List (Nat × Nat)) (ordinal : Nat) :
    Holds (mergeIntervals intervals) ordinal ↔ Holds intervals ordinal := by
  have hSorted := List.pairwise_mergeSort
    (le := fun (first second : Nat × Nat) => decide (first.1 ≤ second.1))
    (by intro first second third; simp only [decide_eq_true_eq]; omega)
    (by intro first second; simp only [Bool.or_eq_true, decide_eq_true_eq]; omega) intervals
  have := merge_fold_holds _ [] (hSorted.imp (by simp)) (by simp) ordinal
  simp only [Holds, mergeIntervals, List.mem_reverse, List.mem_mergeSort] at this ⊢
  simpa using this

theorem merge_keeps_locations : MergeKeepsLocations := by
  intro intervals regionOrdinals
  simp only [regionTest, List.any_eq_true, Bool.and_eq_true, decide_eq_true_eq, ge_iff_le]
  constructor
  · rintro ⟨merged, hMerged, ordinal, hOrdinal, hBounds⟩
    obtain ⟨source, hSource, hSourceBounds⟩ :=
      (merge_holds intervals ordinal).mp ⟨merged, hMerged, hBounds⟩
    exact ⟨source, hSource, ordinal, hOrdinal, hSourceBounds⟩
  · rintro ⟨source, hSource, ordinal, hOrdinal, hBounds⟩
    obtain ⟨merged, hMerged, hMergedBounds⟩ :=
      (merge_holds intervals ordinal).mpr ⟨source, hSource, hBounds⟩
    exact ⟨merged, hMerged, ordinal, hOrdinal, hMergedBounds⟩

end RegionTerms
