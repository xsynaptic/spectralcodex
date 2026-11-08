---- MODULE mutants ----
EXTENDS spec

\* A mutant never calls the def it replaces, since the override would make it call itself

\* sync()'s old catch, which marked the view decided when the fetch failed
FailureForgetsThePending(st) == [st EXCEPT !.pending = {}]

\* The Scope toggle live while a Location is pending
TheToggleIgnoresThePending == TRUE

\* resolveMapScope resolving only the Location open when the rows land
ResolveForgetsTheEarlier(st) ==
    IF st.pending = {} THEN st
    ELSE [st EXCEPT !.scope = IF st.key \notin Locations \/ KeepsTheScope(st.key, st.scope)
                              THEN st.scope ELSE "none",
                    !.pending = {}]

\* reduceMapScope without isEveryTargetInRule
EveryLocationKeepsTheScope(p, s) == TRUE

\* reduceMapScope without its isScopeEnabled check
OffScopeStillDecides(st, p) == st.scope # "none" /\ p \in Locations

\* resolveClick without isScopeRestored
MapForgetsTheRestore(p) == FALSE

\* syncView without its viewKey check, so a resync of a Scope page switches it back on
ResyncReappliesTheView(st, p) == FALSE

====
