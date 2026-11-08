---- MODULE spec ----
\* One reader, one Atlas map kept across navigations; pages the Scope cannot tell apart are merged
\* Models packages/react-map-component/src/store/store-scope.ts
\* Models packages/react-map-component/src/store/store-factory.ts
\* Models packages/react-map-component/src/host/host-view.ts
\* Models packages/react-map-component/src/host/host-adapter.ts
\* Models packages/react-map-component/src/host/host-click-factory.ts
\* Models packages/react-map-component/src/data/data-query.ts
\* Models packages/react-map-component/src/data/data-filter.ts
\* Models packages/react-map-component/src/controls/controls-scope.tsx
\* Models src/lib/atlas/atlas-layout-factory.ts
\* Sync commit d1958624
EXTENDS Naturals

VARIABLES page, store, rows, opening, want
vars == <<page, store, rows, opening, want>>

\* tainan and theme set a Scope; temple lies in tainan only; theater in neither; about has no view
Pages == {"tainan", "theme", "temple", "theater", "about"}
Scopes == {"tainan", "theme"}
Locations == {"temple", "theater"}
\* none: no rows and no fetch; flying: one fetch in flight; cached: rows held, staleTime Infinity
RowStates == {"none", "flying", "cached"}

ScopeOf(p) == IF p \in Scopes THEN p ELSE "none"
\* The glossary's membership
Inside(p, s) == p = "temple" /\ s = "tainan"
\* The raw data-map-view string; a Scope's JSON carries its url and Point ids are unique, so only view-less pages share one
KeyOf(p) == IF p = "about" THEN "none" ELSE p

\* pending: pendingTargetIds, as the Locations they came from
TypeOK ==
    /\ page \in Pages
    /\ store \in [scope: Scopes \cup {"none"}, enabled: BOOLEAN, key: Pages \cup {"none"}, pending: SUBSET Locations]
    /\ rows \in RowStates
    /\ opening \in Pages \cup {"none"}
    /\ want \in [scope: Scopes \cup {"none"}, enabled: BOOLEAN]

\* isEveryTargetInRule
KeepsTheScope(p, s) == Inside(p, s)

\* reduceMapScope's guard
DecidesTheScope(st, p) == st.scope # "none" /\ st.enabled /\ p \in Locations

\* resolveMapScope
ResolveScope(st) ==
    IF st.pending = {} THEN st
    ELSE [st EXCEPT !.scope = IF \A l \in st.pending: KeepsTheScope(l, st.scope) THEN st.scope ELSE "none",
                    !.pending = {}]

\* reduceMapScope
ReduceScope(st, p, hasRows) ==
    IF ScopeOf(p) # "none" THEN [st EXCEPT !.scope = ScopeOf(p), !.enabled = TRUE, !.pending = {}]
    ELSE LET owing == IF DecidesTheScope(st, p) THEN [st EXCEPT !.pending = @ \cup {p}] ELSE st
         IN IF hasRows THEN ResolveScope(owing) ELSE owing

\* syncView's viewKey check
IsSameView(st, p) == KeyOf(p) = st.key

\* syncView
SyncView(st, p, hasRows) ==
    IF IsSameView(st, p) THEN st
    ELSE [ReduceScope(st, p, hasRows) EXCEPT !.key = KeyOf(p)]

\* A query error reaches no store action
FailedFetch(st) == st

\* The glossary's Map Scope
Arrive(w, p) ==
    IF ScopeOf(p) # "none" THEN [scope |-> ScopeOf(p), enabled |-> TRUE]
    ELSE IF p \in Locations /\ w.enabled /\ w.scope # "none" /\ ~Inside(p, w.scope)
    THEN [w EXCEPT !.scope = "none"]
    ELSE w

\* sync(), in one task
Sync(p) == store' = SyncView(store, p, rows = "cached")

\* Astro swaps the page, then astro:after-swap dispatches map:sync one microtask later
Open(p) ==
    /\ page' = p
    /\ opening' = "none"
    /\ Sync(p)
    /\ UNCHANGED rows

\* A pane link, the back or forward button, or the header; Astro swaps even for the page already open
YouFollowALink(p) ==
    /\ Open(p)
    /\ want' = IF p = page THEN want ELSE Arrive(want, p)

\* map:sync with no navigation: setFlag on enter or close, or a resize that resets the sheet
TheHostResyncs ==
    /\ Sync(page)
    /\ UNCHANGED <<page, rows, opening, want>>

\* MapScopeHeld's disabled={isScopePending}
CanSwitch == store.pending = {}

\* The Scope bar's toggle, rendered while the store holds a Scope
YouSwitchTheScope(isEnabled) ==
    /\ store.scope # "none"
    /\ store.enabled # isEnabled
    /\ CanSwitch
    /\ store' = [store EXCEPT !.enabled = isEnabled]
    /\ want' = [want EXCEPT !.enabled = isEnabled]
    /\ UNCHANGED <<page, rows, opening>>

\* resolveClick's isScopeRestored: the url opened is the held Scope's page
ScopeRestored(p) == p = store.scope

\* A Point needs rows; the Scope bar's name and a search pick do not
CanClick(p) == p \in Locations => rows = "cached"

\* resolveClick then applyClick; getAtlasOpenAction navigates only off the current page
YouOpenFromTheMap(p) ==
    /\ p # "about"
    /\ CanClick(p)
    /\ store' = IF ScopeRestored(p) THEN [store EXCEPT !.enabled = TRUE] ELSE store
    /\ want' = IF p = want.scope THEN [want EXCEPT !.enabled = TRUE] ELSE want
    /\ opening' = IF p = page THEN "none" ELSE p
    /\ UNCHANGED <<page, rows>>

\* astro:transitions navigate, once it has fetched the page
TheOpenedPageArrives ==
    /\ opening # "none"
    /\ Open(opening)
    /\ want' = Arrive(want, opening)

\* The query cache takes the rows; a sync from here on reads them, and the map draws them
TheDirectoryLands ==
    /\ rows = "flying"
    /\ rows' = "cached"
    /\ UNCHANGED <<page, store, opening, want>>

\* useHostViewSync's effect on useMapRows' data, a render after the rows land
TheMapReadsTheRows ==
    /\ rows = "cached"
    /\ store.pending # {}
    /\ store' = ResolveScope(store)
    /\ UNCHANGED <<page, rows, opening, want>>

TheDirectoryFails ==
    /\ rows = "flying"
    /\ rows' = "none"
    /\ store' = FailedFetch(store)
    /\ UNCHANGED <<page, opening, want>>

\* useMapRows refetches a failed query on focus, reconnect or a new observer, with no sync
TheMapRefetches ==
    /\ rows = "none"
    /\ rows' = "flying"
    /\ UNCHANGED <<page, store, opening, want>>

\* createMapStore(host.readView()) while useMapRows fetches
Init ==
    /\ page \in Pages
    /\ store = [scope |-> ScopeOf(page), enabled |-> TRUE, key |-> KeyOf(page), pending |-> {}]
    /\ rows = "flying"
    /\ opening = "none"
    /\ want = [scope |-> ScopeOf(page), enabled |-> TRUE]

Next ==
    \/ \E p \in Pages: YouFollowALink(p)
    \/ TheHostResyncs
    \/ \E isEnabled \in BOOLEAN: YouSwitchTheScope(isEnabled)
    \/ \E p \in Pages: YouOpenFromTheMap(p)
    \/ TheOpenedPageArrives
    \/ TheDirectoryLands
    \/ TheMapReadsTheRows
    \/ TheDirectoryFails
    \/ TheMapRefetches

Spec == Init /\ [][Next]_vars

Settled == opening = "none" /\ ~(rows = "cached" /\ store.pending # {})

LocationKeepsOrClearsTheScope == (Settled /\ rows = "cached" /\ page \in Locations) => store.scope = want.scope

ScopeHeldWhileOff == (Settled /\ ~want.enabled) => (~store.enabled /\ store.scope = want.scope)

ScopeOnWhenAsked == (Settled /\ want.enabled /\ want.scope # "none") => (store.enabled /\ store.scope = want.scope)

====
