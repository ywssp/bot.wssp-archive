# Update 3.0.0

## General
- All Files now use strict mode
- Added some NPM modules
- Default command settings are now defined

## Commands
### APIs
- Added `UselessFact.js`
- Optimized `UrbanDictionary.js`

### Music
- All commands in this category are now restricted to guilds
- Merged `PauseMusic.js` and `ResumeMusic.js` into `TogglePause.js`
- Merged `SkipTrack.js` and `SkipToTrack.js`
- Revamped how the `loop` command works
- `play` command no longer searches for 5 videos and instead plays the first video immediately
- Some functions in `PlayMusic.js` are moved to `./Functions/MusicFunctions.js`
- `volume`, `queue`, `nowplaying`, and `play` now display the music player settings

## Functions
- `EmbedCreator.js` now uses presets
- Optimized `MusicCheck.js`
