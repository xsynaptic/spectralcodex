import proofs.«region-intervals».spec

namespace RegionIntervals

def OrdinalWithinIff : Prop :=
  ∀ roots : List Region, ∀ region ∈ subtrees (numberNestedSets roots),
    ∀ other ∈ subtrees (numberNestedSets roots),
      (region.left ≤ other.left ∧ other.left ≤ region.right) ↔ other ∈ region.subtree

mutual
theorem subtree_closed :
    ∀ (region : Numbered) {inner other : Numbered},
      inner ∈ region.subtree → other ∈ inner.subtree → other ∈ region.subtree
  | .node id left right children, inner, other, hInner, hOther => by
    have := @subtrees_closed children inner other
    grind [Numbered.subtree]
theorem subtrees_closed :
    ∀ (regions : List Numbered) {inner other : Numbered},
      inner ∈ subtrees regions → other ∈ inner.subtree → other ∈ subtrees regions
  | [], _, _, hInner, _ => by simp [subtrees] at hInner
  | child :: rest, inner, other, hInner, hOther => by
    have := @subtree_closed child inner other
    have := @subtrees_closed rest inner other
    grind [subtrees]
end

def InBlock (start finish : Nat) (region : Numbered) : Prop :=
  start ≤ region.left ∧ region.left ≤ region.right ∧ region.right < finish

mutual
theorem visit_block :
    ∀ (counter : Nat) (region : Region),
      counter < (visit counter region).2 ∧
        ∀ inner ∈ (visit counter region).1.subtree, InBlock counter (visit counter region).2 inner
  | counter, .node id children => by
    have := visitAll_block (counter + 1) children
    grind [visit, Numbered.subtree, InBlock, Numbered.left, Numbered.right]
theorem visitAll_block :
    ∀ (counter : Nat) (regions : List Region),
      counter ≤ (visitAll counter regions).2 ∧
        ∀ inner ∈ subtrees (visitAll counter regions).1,
          InBlock counter (visitAll counter regions).2 inner
  | counter, [] => by simp [visitAll, subtrees]
  | counter, child :: rest => by
    have := visit_block counter child
    have := visitAll_block (visit counter child).2 rest
    grind [visitAll, subtrees, InBlock]
end

mutual
theorem visit_spans :
    ∀ (counter : Nat) (source : Region),
      ∀ region ∈ (visit counter source).1.subtree, ∀ other ∈ (visit counter source).1.subtree,
        (region.left ≤ other.left ∧ other.left ≤ region.right) ↔ other ∈ region.subtree
  | counter, .node id children => by
    have := visitAll_block (counter + 1) children
    have := visitAll_spans (counter + 1) children
    have := @subtrees_closed (visitAll (counter + 1) children).1
    grind [visit, Numbered.subtree, InBlock, Numbered.left, Numbered.right]
theorem visitAll_spans :
    ∀ (counter : Nat) (sources : List Region),
      ∀ region ∈ subtrees (visitAll counter sources).1,
        ∀ other ∈ subtrees (visitAll counter sources).1,
          (region.left ≤ other.left ∧ other.left ≤ region.right) ↔ other ∈ region.subtree
  | counter, [] => by simp [visitAll, subtrees]
  | counter, child :: rest => by
    have := visit_block counter child
    have := visitAll_block (visit counter child).2 rest
    have := visit_spans counter child
    have := visitAll_spans (visit counter child).2 rest
    have := @subtree_closed (visit counter child).1
    have := @subtrees_closed (visitAll (visit counter child).2 rest).1
    grind [visitAll, subtrees, InBlock]
end

theorem ordinal_within_iff : OrdinalWithinIff :=
  fun roots => visitAll_spans 1 roots

theorem region_map_shows_iff : RegionMapShowsIff := by
  intro roots region hRegion filed hFiled
  have := ordinal_within_iff roots region hRegion
  simp only [regionTest, List.any_map, List.any_eq_true]
  grind

end RegionIntervals
