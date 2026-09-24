# Browser verification log

This log distinguishes an emulator window from a playable, validated game. The
native Windows captures and EXE hashes are in `capture-manifest.json` and
`public/assets/sources.json`. The browser build currently uses BoxedWine 26R1.0.

| Game | Browser evidence so far | Remaining validation |
| --- | --- | --- |
| balloon | Title; F5 play with score 000; customers advanced; returned to title after failure | Correct handoff/score, restart, touch, sound |
| chan | Title and score 0 play screen; F5 starts | Direction action, score, failure, restart, touch, sound |
| concert | Title and play screen with score 0 push; wrapper F5 start works | Correct timed input/score progression, end, restart, touch, sound |
| endroll | Title; F5 play; stunt score rose 0% to 1.5%; failure/name-entry modal; F5 restart | Correct input/timing, touch, sound, native visual comparison |
| HipDance | Title; F5 play with score 000; failure/name-entry modal | Correct left/right scoring, restart, touch, sound |
| hvst | Title; F5 play; harvested score rose to 5 ha; failure/name-entry modal; score reset to 0 on restart | Direction input, touch, sound, native timing comparison |
| ikki | Title; F5 play; elapsed timer advanced past 59 s. Direct canvas clicks and wrapper button clicks did not produce a confirmed drink/spew animation | Determine why BoxedWine does not visibly respond to received clicks; verify completion/failure, touch, sound and timing |
| kodomo | Title; F5 play; parent colors and six choices rendered; direct click produced failure/name-entry modal | Correct answer/score progression, restart, touch, sound |
| kona | Title, timed play screen, failure/name-entry modal, restart via F5 after closing modal | Correct input/score progression, touch, sound |
| lift | Title; F5 play with score 000; action button visibly moved player onto lift; failure/name-entry modal | Successful boarding/score, restart, touch, sound |
| makyu | Title; F5 play with 0 balls; action button visibly swung the bat; failure/name-entry modal | Successful hit/score, restart, touch, sound |
| manu | Title, score 000 play screen, F5 start and restart | Correct direct input, score, failure, touch, sound; opening takes about 60 s on test machine |
| musa | Title; F5 play; side-scrolling flying scene; action button accepted | Distance/score progression, end, restart, touch, sound |
| nawa | Title, play, failure/name-entry modal | Score progression, restart, touch, sound |
| rocket | Title and moving play screen | Direction input, score, failure, restart, touch, sound |
| rodeo | Title and timed play screen | Input, score, failure, restart, touch, sound |
| santa | Title; F5 READY/GO play screen with gift count 00; returned to title after failure | Correct gift input/score, restart, touch, sound |
| t-shirt | Title, READY and play screen | Input, score, failure, restart, touch, sound; opening about 35 s |
| tube | Title; F5 GO play with score 000; returned to title after a missed bounce | Successful bounce/score, restart, touch, sound |
| apple | Title and play screen | Input, score, failure, restart, touch, sound; opening is long |

Common acceptance still pending: native side-by-side visual comparison of all
states, timing comparison, actual mobile touch, audio start, persistence,
landscape layout, and production asset loading. The 390 × 844 responsive menu
and game stage were visually checked, as were deep links and back navigation.
Touch bridge lifecycle has six automated tests; this does not substitute for
real device testing. A visible window alone is **not** a pass.

For `ikki`, a temporary browser diagnostic confirmed both wrapper-generated
`mousedown`/`mouseup` events and a physical trusted click arrived at the
emulator canvas during play. BoxedWine had installed a `mousedown` listener on
that canvas and a `mouseup` listener on the document. The game still showed no
confirmed drinking or danger indicator. The diagnostic was removed after the
check; the remaining fault is past DOM event delivery, or the game's timing or
input conditions are still misunderstood. Clicking the original toolbar's
`R` icon during play did return to the title, so at least toolbar mouse input
reaches the emulated Windows application. Forty direct clicks on the bottle
during one round did not visibly empty it. Twelve wrapper clicks paced roughly
1.4 seconds apart likewise left the bottle unchanged. The failed checks cover
both fast and slow input; `ikki` remains unverified.

The emulated Windows title bar and score dialogs render Japanese text as
mojibake. Setting `LANG=ja_JP.UTF-8` through BoxedWine's `env` parameter did not
fix the title bar in a browser check. BoxedWine's upstream
[Japanese-language issue](https://github.com/danoon2/Boxedwine/issues/115)
describes the same limitation. This is a visual-fidelity gap for all 20 games.
