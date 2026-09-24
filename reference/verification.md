# Browser verification log

This log distinguishes an emulator window from a playable, validated game. The
native Windows captures and EXE hashes are in `capture-manifest.json` and
`public/assets/sources.json`. The browser build currently uses BoxedWine 26R1.0.

| Game | Browser evidence so far | Remaining validation |
| --- | --- | --- |
| balloon | Original title rendered | Input, score, failure, restart, touch, sound |
| chan | Title and score 0 play screen; F5 starts | Direction action, score, failure, restart, touch, sound |
| concert | Title and play screen with score 0 push; wrapper F5 start works | Correct timed input/score progression, end, restart, touch, sound |
| endroll | Windows game window appeared | Title, play, score, end, restart, input, sound |
| HipDance | Windows game window appeared | Title, play, score, end, restart, input, sound |
| hvst | Windows game window appeared | Title, play, score, end, restart, input, sound |
| ikki | Windows game window appeared | Title, play, score, end, restart, input, sound |
| kodomo | Windows game window appeared | Title, play, score, end, restart, input, sound |
| kona | Title, timed play screen, failure/name-entry modal, restart via F5 after closing modal | Correct input/score progression, touch, sound |
| lift | Original title rendered | Play, score, failure, restart, input, touch, sound |
| makyu | Original title rendered | Play, score, failure, restart, input, touch, sound |
| manu | Title, score 000 play screen, F5 start and restart | Correct direct input, score, failure, touch, sound; opening takes about 60 s on test machine |
| musa | Windows game window appeared | Title, play, score, end, restart, input, sound |
| nawa | Title, play, failure/name-entry modal | Score progression, restart, touch, sound |
| rocket | Title and moving play screen | Direction input, score, failure, restart, touch, sound |
| rodeo | Title and timed play screen | Input, score, failure, restart, touch, sound |
| santa | Windows game window appeared | Title, play, score, end, restart, input, sound |
| t-shirt | Title, READY and play screen | Input, score, failure, restart, touch, sound; opening about 35 s |
| tube | Windows game window appeared | Title, play, score, end, restart, input, sound |
| apple | Title and play screen | Input, score, failure, restart, touch, sound; opening is long |

Common acceptance still pending: native side-by-side visual comparison of all
states, timing comparison, mobile touch, audio start, persistence, landscape and
portrait, back navigation, deep links, production asset loading. A visible
window alone is **not** a pass.
