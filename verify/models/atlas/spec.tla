---- MODULE spec ----
\* One reader in one tab; values the reader cannot tell apart are merged
\* Models src/components/atlas/atlas-setup.astro
\* Models src/components/atlas/atlas-sheet-handle.ts
\* Models src/lib/atlas/atlas-directive.ts
\* Models src/lib/atlas/atlas-intent.ts
\* Models src/lib/atlas/atlas-layout-factory.ts
\* Models src/lib/atlas/atlas-mode.ts
\* Models src/lib/atlas/atlas-sheet-factory.ts
\* Models src/lib/atlas/atlas-sheet.ts

VARIABLES page, screen, flag, remembered, rest, pref, slide, closing, island, exitLost
vars == <<page, screen, flag, remembered, rest, pref, slide, closing, island, exitLost>>

Pages == {"article", "place", "atlas"}
MapPages == {"place", "atlas"}
\* wide: --atlas-pane-layout split; tall and short: sheet, with and without --atlas-sheet-half
Screens == {"wide", "tall", "short"}
Rests == {"raised", "half", "lowered"}
\* currentMove's target, or none
Slides == {"none", "raised", "half", "lowered"}
\* none: no shell in this document; asleep: client:atlas waits; waking: hydrating; live: React runs
Islands == {"none", "asleep", "waking", "live"}

TypeOK ==
    /\ page \in Pages
    /\ screen \in Screens
    /\ flag \in BOOLEAN
    /\ remembered \in BOOLEAN
    /\ rest \in Rests
    /\ pref \in {"half", "raised"}
    /\ slide \in Slides
    /\ closing \in BOOLEAN
    /\ island \in Islands
    /\ exitLost \in BOOLEAN

\* isAtlasMapShown and getAtlasLayout
Shown(f, p) == f /\ p \in MapPages
LayoutOf(f, p, s) ==
    IF ~Shown(f, p) THEN "regular"
    ELSE IF p = "atlas" THEN "map"
    ELSE IF s = "wide" THEN "split"
    ELSE "sheet"
Layout == LayoutOf(flag, page, screen)

\* hasHalfRest, getSheetRests, getPreferredSheetRest; an unset preference reads as half
\* Wide reads as no half, which holds only because every crossing into or out of wide resets the sheet
HasHalf(s) == s = "tall"
RestsOn(s) == IF HasHalf(s) THEN Rests ELSE {"raised", "lowered"}
Preferred(s) == IF HasHalf(s) THEN pref ELSE "raised"

MapTappable ==
    /\ island = "live"
    /\ \/ Layout \in {"map", "split"}
       \/ Layout = "sheet" /\ rest # "raised"

\* astro:before-swap in startAtlasMode; its placeholder keeps the shell on an article
IslandAfter(p, shown) ==
    IF island \in {"waking", "live"} THEN island
    ELSE IF island = "none" /\ p = "article" THEN "none"
    ELSE IF shown THEN "waking"
    ELSE "asleep"

\* The setup script, then startAtlasMode's half reset
ColdRest(f, p, s) == IF LayoutOf(f, p, s) = "sheet" /\ HasHalf(s) /\ pref = "half" THEN "half" ELSE "raised"
ColdIsland(f, p) ==
    IF p \notin MapPages THEN "none"
    ELSE IF Shown(f, p) THEN "waking"
    ELSE "asleep"

\* The flag comes from sessionStorage or an ?atlas link, and /atlas always sets it
Init ==
    /\ page \in Pages
    /\ screen \in Screens
    /\ pref \in {"half", "raised"}
    /\ flag \in BOOLEAN
    /\ page = "atlas" => flag
    /\ remembered = flag
    /\ rest = ColdRest(flag, page, screen)
    /\ slide = "none"
    /\ closing = FALSE
    /\ island = ColdIsland(flag, page)
    /\ exitLost = FALSE

SetFlag(isEnabled) ==
    /\ flag' = isEnabled
    /\ remembered' = isEnabled

\* prepareSheetArrival
ArrivalRest(f, p) == IF LayoutOf(f, p, screen) = "sheet" THEN Preferred(screen) ELSE "raised"

\* A link, the back button, a place tapped on the map or expand, then astro:before-swap in startAtlasMode
\* A waiting closeAtlas finds its pane disconnected and returns without closing
YouFollowALink(p) ==
    LET f == p = "atlas" \/ flag
    IN /\ page' = p
       /\ flag' = f
       /\ remembered' = (p = "atlas" \/ remembered)
       /\ rest' = ArrivalRest(f, p)
       /\ slide' = "none"
       /\ exitLost' = closing
       /\ closing' = FALSE
       /\ island' = IslandAfter(p, Shown(f, p))
       /\ UNCHANGED <<screen, pref>>

\* getAtlasOpenAction's raise
YouTapThisPlaceOnTheMap ==
    /\ MapTappable
    /\ page = "place"
    /\ Layout = "sheet"
    /\ rest = "lowered"
    /\ slide = "none"
    /\ slide' = Preferred(screen)
    /\ exitLost' = FALSE
    /\ UNCHANGED <<page, screen, flag, remembered, rest, pref, closing, island>>

\* openAtlas, then openSheet
YouPressEnter ==
    /\ page = "place"
    /\ ~flag
    /\ SetFlag(TRUE)
    /\ island' = IF island = "live" THEN "live" ELSE "waking"
    /\ rest' = IF screen = "tall" THEN "half" ELSE rest
    /\ slide' = IF screen = "short" THEN "lowered" ELSE slide
    /\ exitLost' = FALSE
    /\ UNCHANGED <<page, screen, pref, closing>>

\* atlas-sheet-handle.ts; holdSheet's data-grabbing blocks a tap, drag or key mid-slide
\* commitRest stores the rest at release, before the slide ends
YouMoveTheSheet ==
    /\ Layout = "sheet"
    /\ slide = "none"
    /\ \E r \in RestsOn(screen) \ {rest}:
         /\ slide' = r
         /\ pref' = IF r = "lowered" THEN pref ELSE r
    /\ exitLost' = FALSE
    /\ UNCHANGED <<page, screen, flag, remembered, rest, closing, island>>

\* moveSheet after its await; a waiting closeAtlas then calls setFlag(false)
TheSheetSettles ==
    /\ slide # "none"
    /\ IF closing
       THEN /\ rest' = "raised"
            /\ SetFlag(FALSE)
       ELSE /\ rest' = slide
            /\ UNCHANGED <<flag, remembered>>
    /\ slide' = "none"
    /\ closing' = FALSE
    /\ exitLost' = FALSE
    /\ UNCHANGED <<page, screen, pref, island>>

\* setFlag(false)
CloseNow ==
    /\ SetFlag(FALSE)
    /\ rest' = "raised"
    /\ slide' = "none"
    /\ closing' = FALSE
    /\ exitLost' = FALSE

\* closeAtlas off /atlas
YouPressClose ==
    /\ MapTappable
    /\ Layout \in {"split", "sheet"}
    /\ IF rest = "lowered" /\ slide = "none"
       THEN /\ slide' = "raised"
            /\ closing' = TRUE
            /\ exitLost' = FALSE
            /\ UNCHANGED <<flag, remembered, rest>>
       ELSE CloseNow
    /\ UNCHANGED <<page, screen, pref, island>>

\* closeAtlas on /atlas, then leaveMap
YouPressCloseOnTheAtlas ==
    /\ MapTappable
    /\ Layout = "map"
    /\ \E p \in {"article", "place"}:
         /\ page' = p
         /\ island' = IslandAfter(p, FALSE)
    /\ CloseNow
    /\ UNCHANGED <<screen, pref>>

\* The resize listener in startAtlasMode
\* resetSheet cancels a slide, so a waiting closeAtlas resumes and closes
YouResizeTheWindow ==
    /\ \E s \in Screens \ {screen}:
         LET isLayoutChange == (s = "wide") # (screen = "wide")
             isHalfChange == HasHalf(s) # HasHalf(screen)
             isReset == isLayoutChange \/ (isHalfChange /\ rest = "half")
         IN /\ screen' = s
            /\ IF isReset
               THEN /\ rest' = "raised"
                    /\ slide' = "none"
                    /\ closing' = FALSE
                    /\ IF closing THEN SetFlag(FALSE) ELSE UNCHANGED <<flag, remembered>>
               ELSE UNCHANGED <<rest, slide, flag, remembered, closing>>
    /\ exitLost' = FALSE
    /\ UNCHANGED <<page, pref, island>>

\* A full load of the same url, which drops a waiting closeAtlas
YouReload ==
    LET f == page = "atlas" \/ remembered
    IN /\ flag' = f
       /\ remembered' = f
       /\ rest' = ColdRest(f, page, screen)
       /\ slide' = "none"
       /\ exitLost' = closing
       /\ closing' = FALSE
       /\ island' = ColdIsland(f, page)
       /\ UNCHANGED <<page, screen, pref>>

\* client:atlas hydrating
TheMapFinishesLoading ==
    /\ island = "waking"
    /\ island' = "live"
    /\ exitLost' = FALSE
    /\ UNCHANGED <<page, screen, flag, remembered, rest, pref, slide, closing>>

Next ==
    \/ \E p \in Pages: YouFollowALink(p)
    \/ YouTapThisPlaceOnTheMap
    \/ YouPressEnter
    \/ YouMoveTheSheet
    \/ TheSheetSettles
    \/ YouPressClose
    \/ YouPressCloseOnTheAtlas
    \/ YouResizeTheWindow
    \/ YouReload
    \/ TheMapFinishesLoading

Spec == Init /\ [][Next]_vars

SheetOnlyOnPhonePlaces == (rest # "raised" \/ slide # "none") => Layout = "sheet"

HalfOnlyOnTallScreens == rest = "half" => screen = "tall"

ModeRemembered == flag = remembered

MapWakesWhenShown == Layout # "regular" => island \in {"waking", "live"}

CloseIsNotLost == ~exitLost

====
