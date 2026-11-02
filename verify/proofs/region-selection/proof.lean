import proofs.«region-selection».spec

namespace RegionSelection

open RegionIntervals (regionTest)

variable {α : Type}

theorem mem_takeWhile_of_sorted {key : α → Nat} {bound : Nat} :
    ∀ {list : List α}, list.Pairwise (fun first second => key first ≤ key second) →
      ∀ {item}, item ∈ list.takeWhile (fun other => key other ≤ bound) ↔
        item ∈ list ∧ key item ≤ bound
  | [], _, _ => by simp
  | head :: tail, hSorted, item => by
    have ih := mem_takeWhile_of_sorted (bound := bound) (List.pairwise_cons.1 hSorted).2 (item := item)
    have hHead := (List.pairwise_cons.1 hSorted).1
    by_cases hBound : key head ≤ bound
    · simp only [List.takeWhile_cons_of_pos (p := fun other => decide (key other ≤ bound))
        (by simpa using hBound), List.mem_cons, ih]
      grind
    · simp only [List.takeWhile_cons_of_neg (p := fun other => decide (key other ≤ bound))
        (by simpa using hBound), List.mem_cons]
      grind

theorem mem_dropWhile_of_sorted {key : α → Nat} {bound : Nat} :
    ∀ {list : List α}, list.Pairwise (fun first second => key first ≤ key second) →
      ∀ {item}, item ∈ list.dropWhile (fun other => key other < bound) ↔
        item ∈ list ∧ bound ≤ key item
  | [], _, _ => by simp
  | head :: tail, hSorted, item => by
    have ih := mem_dropWhile_of_sorted (bound := bound) (List.pairwise_cons.1 hSorted).2 (item := item)
    have hHead := (List.pairwise_cons.1 hSorted).1
    by_cases hBound : key head < bound
    · simp only [List.dropWhile_cons_of_pos (p := fun other => decide (key other < bound))
        (by simpa using hBound), List.mem_cons, ih]
      grind
    · simp only [List.dropWhile_cons_of_neg (p := fun other => decide (key other < bound))
        (by simpa using hBound), List.mem_cons]
      grind

theorem drop_length_takeWhile (predicate : α → Bool) :
    ∀ list : List α, list.drop (list.takeWhile predicate).length = list.dropWhile predicate
  | [] => rfl
  | head :: tail => by
    cases hHead : predicate head <;>
      simp [hHead, drop_length_takeWhile predicate tail]

theorem regionIndex_sorted (rows : List (List Nat)) :
    (regionIndex rows).Pairwise (fun first second => first.1 ≤ second.1) := by
  have := List.pairwise_mergeSort (le := fun (first second : Nat × Nat) => decide (first.1 ≤ second.1))
    (by intro a b c; simp only [decide_eq_true_eq]; omega)
    (by intro a b; simp only [Bool.or_eq_true, decide_eq_true_eq]; omega)
  simpa [regionIndex] using this _

theorem mem_regionIndex {rows : List (List Nat)} {pair : Nat × Nat} :
    pair ∈ regionIndex rows ↔ ∃ row, rows[pair.2]? = some row ∧ pair.1 ∈ row := by
  simp only [regionIndex, List.mem_mergeSort, List.mem_flatMap, List.mem_map,
    List.mem_zipIdx_iff_getElem?]
  constructor
  · rintro ⟨entry, hEntry, ordinal, hOrdinal, rfl⟩
    exact ⟨entry.1, hEntry, hOrdinal⟩
  · rintro ⟨row, hRow, hOrdinal⟩
    exact ⟨(row, pair.2), hRow, pair.1, hOrdinal, rfl⟩

theorem mem_matched {rows : List (List Nat)} {interval : Nat × Nat} {position : Nat} :
    let index := regionIndex rows
    let window := (index.drop (sortedIndex (index.map (·.1)) interval.1)).takeWhile
      (·.1 ≤ interval.2)
    position ∈ window.map (·.2) ↔
      ∃ row, rows[position]? = some row ∧ regionTest interval row = true := by
  have hSorted := regionIndex_sorted rows
  simp only [sortedIndex, List.takeWhile_map, List.length_map, Function.comp_def,
    drop_length_takeWhile, List.mem_map,
    mem_takeWhile_of_sorted (key := Prod.fst) (List.Pairwise.sublist (List.dropWhile_sublist _) hSorted),
    mem_dropWhile_of_sorted (key := Prod.fst) hSorted, mem_regionIndex, regionTest, List.any_eq_true,
    Bool.and_eq_true, decide_eq_true_eq]
  constructor
  · rintro ⟨pair, ⟨⟨⟨row, hRow, hOrdinal⟩, hLeft⟩, hRight⟩, rfl⟩
    exact ⟨row, hRow, pair.1, hOrdinal, hLeft, hRight⟩
  · rintro ⟨row, hRow, ordinal, hOrdinal, hLeft, hRight⟩
    exact ⟨(ordinal, position), ⟨⟨⟨row, hRow, hOrdinal⟩, hLeft⟩, hRight⟩, rfl⟩

theorem skipRepeats_some :
    ∀ {list : List Nat} (previous : Nat), list.Pairwise (· ≤ ·) → (∀ item ∈ list, previous ≤ item) →
      (skipRepeats (some previous) list).Pairwise (· < ·) ∧
        (∀ item ∈ skipRepeats (some previous) list, previous < item) ∧
        ∀ item, item ∈ skipRepeats (some previous) list ↔ item ∈ list ∧ item ≠ previous
  | [], _, _, _ => by simp [skipRepeats]
  | head :: tail, previous, hSorted, hAbove => by
    have hTail := (List.pairwise_cons.1 hSorted)
    by_cases hSame : previous = head
    · subst hSame
      have ih := skipRepeats_some (list := tail) previous hTail.2 (by grind)
      simp only [skipRepeats, List.mem_cons]
      grind
    · have ih := skipRepeats_some (list := tail) head hTail.2 hTail.1
      simp only [skipRepeats, Option.some.injEq, hSame, ite_false, List.pairwise_cons,
        List.mem_cons]
      have hPrevious : previous ≤ head := hAbove head (by simp)
      refine ⟨⟨ih.2.1, ih.1⟩, fun item hItem => ?_, fun item => ?_⟩
      · have := ih.2.1 item
        grind
      · have := ih.2.2 item
        have := hTail.1 item
        grind

theorem skipRepeats_none {list : List Nat} (hSorted : list.Pairwise (· ≤ ·)) :
    (skipRepeats none list).Pairwise (· < ·) ∧ ∀ item, item ∈ skipRepeats none list ↔ item ∈ list := by
  cases list with
  | nil => simp [skipRepeats]
  | cons head tail =>
    have hTail := List.pairwise_cons.1 hSorted
    have ih := skipRepeats_some (list := tail) head hTail.2 hTail.1
    simp only [skipRepeats, reduceCtorEq, ite_false, List.pairwise_cons, List.mem_cons]
    grind

theorem eq_of_pairwise_lt :
    ∀ {first second : List Nat}, first.Pairwise (· < ·) → second.Pairwise (· < ·) →
      (∀ item, item ∈ first ↔ item ∈ second) → first = second
  | [], [], _, _, _ => rfl
  | [], head :: _, _, _, hSame => by simpa using (hSame head).2 (by simp)
  | head :: _, [], _, _, hSame => by simpa using (hSame head).1 (by simp)
  | head :: tail, other :: rest, hFirst, hSecond, hSame => by
    have hHead := (hSame head).1 (by simp)
    have hOther := (hSame other).2 (by simp)
    simp only [List.pairwise_cons, List.mem_cons] at hFirst hSecond hHead hOther
    have hEqual : head = other := by grind
    subst hEqual
    rw [eq_of_pairwise_lt hFirst.2 hSecond.2 (fun item => by have := hSame item; grind)]

theorem filterMap_eq_map_of_mem {β γ : Type} {lookup : β → Option γ} {value : β → γ} :
    ∀ {list : List β}, (∀ item ∈ list, lookup item = some (value item)) →
      list.filterMap lookup = list.map value
  | [], _ => rfl
  | head :: tail, hLookup => by
    have ih := filterMap_eq_map_of_mem (list := tail)
      (fun item hItem => hLookup item (List.mem_cons_of_mem _ hItem))
    simp [hLookup head (by simp), ih]

theorem filter_eq_positions (rows : List (List Nat)) (test : List Nat → Bool) :
    let positions := (rows.zipIdx.filter fun entry => test entry.1).map (·.2)
    rows.filter test = positions.filterMap (rows[·]?) ∧ positions.Pairwise (· < ·) ∧
      ∀ position, position ∈ positions ↔ ∃ row, rows[position]? = some row ∧ test row = true := by
  refine ⟨?_, ?_, ?_⟩
  · rw [List.filterMap_map, filterMap_eq_map_of_mem (value := Prod.fst)
      (fun entry hEntry => by
        simpa using List.mem_zipIdx_iff_getElem?.1 (List.mem_filter.1 hEntry).1)]
    conv => lhs; rw [← List.zipIdx_map_fst 0 rows]
    rw [List.filter_map]
    rfl
  · have hRange : (rows.zipIdx.map (·.2)).Pairwise (· < ·) := by
      simpa [List.zipIdx_map_snd] using List.pairwise_lt_range' (s := 0) (n := rows.length)
    exact hRange.sublist ((List.filter_sublist).map _)
  · intro position
    simp only [List.mem_map, List.mem_filter, List.mem_zipIdx_iff_getElem?]
    constructor
    · rintro ⟨entry, ⟨hEntry, hTest⟩, rfl⟩
      exact ⟨entry.1, hEntry, hTest⟩
    · rintro ⟨row, hRow, hTest⟩
      exact ⟨(row, position), ⟨hRow, hTest⟩, rfl⟩

theorem select_matches_filter : SelectMatchesFilter := by
  intro rows interval
  have ⟨hFilter, hPositions, hMemPositions⟩ := filter_eq_positions rows (regionTest interval)
  let index := regionIndex rows
  let window := (index.drop (sortedIndex (index.map (·.1)) interval.1)).takeWhile
    (·.1 ≤ interval.2)
  have hSorted : ((window.map (·.2)).mergeSort (· ≤ ·)).Pairwise (· ≤ ·) := by
    simpa using List.pairwise_mergeSort (le := fun (first second : Nat) => decide (first ≤ second))
      (by intro a b c; simp only [decide_eq_true_eq]; omega)
      (by intro a b; simp only [Bool.or_eq_true, decide_eq_true_eq]; omega) (window.map (·.2))
  have ⟨hSkipped, hMemSkipped⟩ := skipRepeats_none hSorted
  rw [hFilter]
  show (skipRepeats none ((window.map (·.2)).mergeSort (· ≤ ·))).filterMap (rows[·]?) = _
  congr 1
  apply eq_of_pairwise_lt hSkipped hPositions
  intro position
  rw [hMemSkipped, List.mem_mergeSort, hMemPositions]
  exact mem_matched

end RegionSelection
