---- MODULE mutants ----
EXTENDS spec

\* A mutant never calls the def it replaces, since the override would make it call itself

\* prepareSheetArrival without its isSheet check
ArrivalIgnoresLayout(f, p) == Preferred(screen)

\* setFlag without its sessionStorage write
SetFlagForgetsTheTab(isEnabled) ==
    /\ flag' = isEnabled
    /\ UNCHANGED remembered

\* client:atlas without its MutationObserver, so a persisted shell that slept never wakes
DirectiveLooksOnce(p, shown) ==
    IF island \in {"asleep", "waking", "live"} THEN island
    ELSE IF p = "article" THEN "none"
    ELSE IF shown THEN "waking"
    ELSE "asleep"

====
