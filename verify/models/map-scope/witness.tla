---- MODULE witness ----
EXTENDS spec, Sequences

VARIABLE at

\* The pane's heading, the Scope bar's name and data-active, the metrics, a target's marker, and the toggle's disabled
Observed == [
    page |-> page,
    scope |-> IF store.scope = "none" THEN "" ELSE store.scope,
    active |-> store.scope # "none" /\ store.enabled,
    loaded |-> rows = "cached",
    marker |-> rows = "cached" /\ store.key \in Locations,
    pending |-> store.pending # {}]

\* The e2e spec holds the directory request until the path says it lands
Path == <<
    [step |-> "Init",              seen |-> [page |-> "tainan", scope |-> "tainan", active |-> TRUE,  loaded |-> FALSE, marker |-> FALSE, pending |-> FALSE]],
    [step |-> "YouFollowALink",    seen |-> [page |-> "temple", scope |-> "tainan", active |-> TRUE,  loaded |-> FALSE, marker |-> FALSE, pending |-> TRUE]],
    [step |-> "TheDirectoryLands", seen |-> [page |-> "temple", scope |-> "tainan", active |-> TRUE,  loaded |-> TRUE,  marker |-> TRUE,  pending |-> FALSE]],
    [step |-> "YouFollowALink",    seen |-> [page |-> "theme",  scope |-> "theme",  active |-> TRUE,  loaded |-> TRUE,  marker |-> FALSE, pending |-> FALSE]],
    [step |-> "YouSwitchTheScope", seen |-> [page |-> "theme",  scope |-> "theme",  active |-> FALSE, loaded |-> TRUE,  marker |-> FALSE, pending |-> FALSE]],
    [step |-> "YouFollowALink",    seen |-> [page |-> "temple", scope |-> "theme",  active |-> FALSE, loaded |-> TRUE,  marker |-> TRUE,  pending |-> FALSE]],
    [step |-> "YouFollowALink",    seen |-> [page |-> "theme",  scope |-> "theme",  active |-> TRUE,  loaded |-> TRUE,  marker |-> FALSE, pending |-> FALSE]],
    [step |-> "YouSwitchTheScope", seen |-> [page |-> "theme",  scope |-> "theme",  active |-> FALSE, loaded |-> TRUE,  marker |-> FALSE, pending |-> FALSE]],
    [step |-> "YouOpenFromTheMap", seen |-> [page |-> "theme",  scope |-> "theme",  active |-> TRUE,  loaded |-> TRUE,  marker |-> FALSE, pending |-> FALSE]],
    [step |-> "YouFollowALink",    seen |-> [page |-> "temple", scope |-> "",       active |-> FALSE, loaded |-> TRUE,  marker |-> TRUE,  pending |-> FALSE]],
    [step |-> "YouFollowALink",    seen |-> [page |-> "tainan", scope |-> "tainan", active |-> TRUE,  loaded |-> TRUE,  marker |-> FALSE, pending |-> FALSE]],
    [step |-> "YouSwitchTheScope", seen |-> [page |-> "tainan", scope |-> "tainan", active |-> FALSE, loaded |-> TRUE,  marker |-> FALSE, pending |-> FALSE]],
    [step |-> "YouFollowALink",    seen |-> [page |-> "theater", scope |-> "tainan", active |-> FALSE, loaded |-> TRUE, marker |-> TRUE,  pending |-> FALSE]],
    [step |-> "YouSwitchTheScope", seen |-> [page |-> "theater", scope |-> "tainan", active |-> TRUE,  loaded |-> TRUE, marker |-> TRUE,  pending |-> FALSE]]
>>

Step(name) ==
    CASE name = "YouFollowALink" -> \E p \in Pages: YouFollowALink(p)
      [] name = "TheDirectoryLands" -> TheDirectoryLands
      [] name = "YouSwitchTheScope" -> \E isEnabled \in BOOLEAN: YouSwitchTheScope(isEnabled)
      [] name = "YouOpenFromTheMap" -> \E p \in Pages: YouOpenFromTheMap(p)

\* A cold load of the Tainan Region with the Atlas on
WitnessInit == Init /\ page = "tainan" /\ at = 1 /\ Observed = Path[1].seen

WitnessNext ==
    \/ /\ ~Settled
       /\ TheOpenedPageArrives \/ TheMapReadsTheRows
       /\ UNCHANGED at
    \/ /\ Settled
       /\ Observed = Path[at].seen
       /\ at < Len(Path)
       /\ Step(Path[at + 1].step)
       /\ at' = at + 1

WitnessSpec == WitnessInit /\ [][WitnessNext]_<<vars, at>>

PathNotReplayed == ~(at = Len(Path) /\ Settled /\ Observed = Path[at].seen)

====
