---- MODULE witness ----
EXTENDS spec, Naturals, Sequences

VARIABLE at

\* The root's data-atlas, data-atlas-page and data-atlas-sheet, then scx-atlas and scx-atlas-sheet-rest
Observed == [
    atlas |-> flag,
    page |-> CASE page = "article" -> "" [] page = "place" -> "pane" [] page = "atlas" -> "map",
    sheet |-> IF rest = "raised" THEN "" ELSE rest,
    tab |-> IF remembered THEN "1" ELSE "",
    stored |-> pref]

\* A Playwright expect retries until the browser finishes its slides and loads
Settled == slide = "none" /\ island # "waking"

Path == <<
    [step |-> "Init",            seen |-> [atlas |-> TRUE,  page |-> "pane", sheet |-> "half",    tab |-> "1", stored |-> "half"]],
    [step |-> "YouMoveTheSheet", seen |-> [atlas |-> TRUE,  page |-> "pane", sheet |-> "",        tab |-> "1", stored |-> "raised"]],
    [step |-> "YouFollowALink",  seen |-> [atlas |-> TRUE,  page |-> "pane", sheet |-> "",        tab |-> "1", stored |-> "raised"]],
    [step |-> "YouReload",       seen |-> [atlas |-> TRUE,  page |-> "pane", sheet |-> "",        tab |-> "1", stored |-> "raised"]],
    [step |-> "YouMoveTheSheet", seen |-> [atlas |-> TRUE,  page |-> "pane", sheet |-> "half",    tab |-> "1", stored |-> "half"]],
    [step |-> "YouMoveTheSheet", seen |-> [atlas |-> TRUE,  page |-> "pane", sheet |-> "lowered", tab |-> "1", stored |-> "half"]],
    [step |-> "YouPressClose",   seen |-> [atlas |-> FALSE, page |-> "pane", sheet |-> "",        tab |-> "",  stored |-> "half"]]
>>

Step(name) ==
    CASE name = "YouMoveTheSheet" -> YouMoveTheSheet
      [] name = "YouFollowALink" -> \E p \in Pages: YouFollowALink(p)
      [] name = "YouReload" -> YouReload
      [] name = "YouPressClose" -> YouPressClose

\* The e2e spec's phone viewport
WitnessInit == Init /\ screen = "tall" /\ at = 1 /\ Observed = Path[1].seen

WitnessNext ==
    \/ /\ ~Settled
       /\ TheSheetSettles \/ TheMapFinishesLoading
       /\ UNCHANGED at
    \/ /\ Settled
       /\ Observed = Path[at].seen
       /\ at < Len(Path)
       /\ Step(Path[at + 1].step)
       /\ at' = at + 1

WitnessSpec == WitnessInit /\ [][WitnessNext]_<<vars, at>>

PathNotReplayed == ~(at = Len(Path) /\ Settled /\ Observed = Path[at].seen)

====
