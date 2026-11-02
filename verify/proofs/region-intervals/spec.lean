/-! Models `numberNestedSets` in `src/lib/utils/hierarchy.ts` and the `region` case of
`createRuleTest` in `packages/map-codec/src/map-rules.ts`. -/

namespace RegionIntervals

inductive Region where
  | node (id : String) (children : List Region)

inductive Numbered where
  | node (id : String) (left right : Nat) (children : List Numbered)

def Numbered.left : Numbered → Nat
  | .node _ left _ _ => left

def Numbered.right : Numbered → Nat
  | .node _ _ right _ => right

mutual
def visit (counter : Nat) : Region → Numbered × Nat
  | .node id children =>
    let left := counter
    let after := visitAll (left + 1) children
    let right := after.2
    (.node id left right after.1, right + 1)

/-- The `for (const childId of children)` loop in `visit` -/
def visitAll (counter : Nat) : List Region → List Numbered × Nat
  | [] => ([], counter)
  | child :: rest =>
    let first := visit counter child
    let others := visitAll first.2 rest
    (first.1 :: others.1, others.2)
end

def numberNestedSets (roots : List Region) : List Numbered :=
  (visitAll 1 roots).1

mutual
def Numbered.subtree : Numbered → List Numbered
  | .node id left right children => .node id left right children :: subtrees children

def subtrees : List Numbered → List Numbered
  | [] => []
  | child :: rest => child.subtree ++ subtrees rest
end

def regionTest (interval : Nat × Nat) (regionOrdinals : List Nat) : Bool :=
  regionOrdinals.any fun ordinal => ordinal ≥ interval.1 && ordinal ≤ interval.2

def RegionMapShowsIff : Prop :=
  ∀ roots : List Region, ∀ region ∈ subtrees (numberNestedSets roots),
    ∀ filed : List Numbered, (∀ filedRegion ∈ filed, filedRegion ∈ subtrees (numberNestedSets roots)) →
      (regionTest (region.left, region.right) (filed.map Numbered.left) = true ↔
        ∃ filedRegion ∈ filed, filedRegion ∈ region.subtree)

def Numbered.entry : Numbered → String × Nat × Nat
  | .node id left right _ => (id, left, right)

-- Pinned by `numbering matches the Lean model fixture` in `src/lib/utils/hierarchy.test.ts`
example :
    (subtrees (numberNestedSets [
      .node "canada" [],
      .node "taiwan" [.node "north" [.node "taipei" []], .node "south" []]
    ])).map Numbered.entry = [
      ("canada", 1, 2),
      ("taiwan", 3, 10),
      ("north", 4, 7),
      ("taipei", 5, 6),
      ("south", 8, 9)
    ] := rfl

end RegionIntervals
