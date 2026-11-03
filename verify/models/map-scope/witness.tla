---- MODULE witness ----
EXTENDS spec, Sequences

VARIABLE at

\* The pane's heading, the Scope bar's name and data-active, the metrics, and a target's marker
Observed == [
    page |-> page,
    scope |-> IF store.scope = "none" THEN "" ELSE store.scope,
    active |-> store.scope # "none" /\ store.enabled,
    loaded |-> rows = "cached",
    marker |-> rows = "cached" /\ store.key \in Locations]

\* The e2e spec holds the directory request until the path says it lands
Path == <<
    [step |-> "Init",               seen |-> [page |-> "tainan", scope |-> "tainan", active |-> TRUE,  loaded |-> FALSE, marker |-> FALSE]],
    [step |-> "YouFollowALink",     seen |-> [page |-> "temple", scope |-> "tainan", active |-> TRUE,  loaded |-> FALSE, marker |-> FALSE]],
    [step |-> "YouFollowALink",     seen |-> [page |-> "theme",  scope |-> "theme",  active |-> TRUE,  loaded |-> FALSE, marker |-> FALSE]],
    [step |-> "YouSwitchTheScope",  seen |-> [page |-> "theme",  scope |-> "theme",  active |-> FALSE, loaded |-> FALSE, marker |-> FALSE]],
    [step |-> "TheDirectoryLands",  seen |-> [page |-> "theme",  scope |-> "theme",  active |-> FALSE, loaded |-> TRUE,  marker |-> FALSE]],
    [step |-> "YouFollowALink",     seen |-> [page |-> "temple", scope |-> "theme",  active |-> FALSE, loaded |-> TRUE,  marker |-> TRUE]],
    [step |-> "YouOpenFromTheMap",  seen |-> [page |-> "theme",  scope |-> "theme",  active |-> TRUE,  loaded |-> TRUE,  marker |-> FALSE]],
    [step |-> "YouFollowALink",     seen |-> [page |-> "temple", scope |-> "",       active |-> FALSE, loaded |-> TRUE,  marker |-> TRUE]]
>>

Step(name) ==
    CASE name = "YouFollowALink" -> \E p \in Pages: YouFollowALink(p)
      [] name = "TheDirectoryLands" -> TheDirectoryLands
      [] name = "YouSwitchTheScope" -> \E isEnabled \in BOOLEAN: YouSwitchTheScope(isEnabled)
      [] name = "YouOpenFromTheMap" -> \E p \in Pages: YouOpenFromTheMap(p)

\* A cold load of the Tainan Region with the Atlas on
WitnessInit == Init /\ page = "tainan" /\ at = 1 /\ Observed = Path[1].seen

WitnessNext ==
    \/ /\ opening # "none"
       /\ TheOpenedPageArrives
       /\ UNCHANGED at
    \/ /\ opening = "none"
       /\ Observed = Path[at].seen
       /\ at < Len(Path)
       /\ Step(Path[at + 1].step)
       /\ at' = at + 1

WitnessSpec == WitnessInit /\ [][WitnessNext]_<<vars, at>>

PathNotReplayed == ~(at = Len(Path) /\ opening = "none" /\ Observed = Path[at].seen)

====
