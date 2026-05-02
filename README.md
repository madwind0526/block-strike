# Rolling Block Strike

Rolling Block Strike is a web arcade brick-breaker prototype with glossy 3D-style blocks, power blocks, stage progression, intro/game-over screens, and a local Top Ranks flow.

## Run

Open the local game URL:

```text
http://127.0.0.1:8000/
```

Useful test screens:

```text
http://127.0.0.1:8000/?screen=ranking
http://127.0.0.1:8000/?screen=gameover
http://127.0.0.1:8000/?screen=nextstage
```

The game is a static HTML/CSS/JS app, so it can also be uploaded to a static web host and opened from a mobile browser.
The layout updates its app height from the browser viewport so mobile address bars and different phone sizes are handled without clipping the cabinet.

## Current Player Flow

- The game starts with an Intro screen.
- Press `Enter` on the Intro screen to start.
- Clicking an Enter prompt performs the same action as pressing `Enter`.
- If all lives are lost, the Game Over screen appears.
- When a stage is cleared, the current game screen is blurred and the Next Stage screen appears.
- Press `Enter` on the Next Stage screen to continue.
- If the score enters the Top 10, the player can enter a name.
- Player names are English-only, with a short length limit.
- Rankings are saved in browser `localStorage`.
- The Top Ranks screen shows rank, name, score, and stage.
- HUD Rank is updated from the current local Top 10 data.
- If the current score is outside the Top 10, HUD Rank shows `Over 10`.
- Press `Enter` on the Top Ranks or Game Over screen to start again.

## Current Controls

- `Left` / `Right` arrow, mouse, or touch drag: move the paddle.
- Click: launch the ball when it is attached to the paddle.
- `Space`: launch the attached ball. During active play, `Space` holds or resumes the game.
- `P`: pause.
- `?`: open debug command mode during gameplay.
- Mobile double tap on the game screen: same action as `Space`.
- Mobile double tap on Intro, Next Stage, Game Over, Top Ranks, or name-entry screens: same action as `Enter`.
- Logo click/tap during gameplay: open debug command mode.

## Debug Commands

Press `?` during gameplay to pause the game and open the styled debug command panel. Debug commands are only applied from the gameplay screen.
Applying a debug command marks the current play as ineligible for ranking updates. Starting a new game resets all debug modes.

The lower-right cheat status overlay shows `godMode`, `fullLives`, `Immortal`, and `JumpTo`. Active modes are white; inactive modes are gray.

- `fullLives`: sets lives to 5.
- `godMode`: breaks any non-`Infi-Block` with one hit, regardless of level.
- `goodGame`: opens the Game Over flow.
- `immortal`: prevents life loss after missing the ball.
- `jumpTo`: jumps directly to the requested stage and applies that stage's rules.
- `resetData`: resets the current score to 0 and clears saved ranking data.
- `showRank`: opens the Top Ranks screen.

## Current Visual Design

- Dark mobile arcade cabinet frame.
- Intro logo image: `IntroLogo2.png`.
- Main HUD logo image: `logo-rolling-block-strike-Photoroom.png`.
- Next Stage image: `NextStage.png`.
- Game Over image: `GameOver.png`.
- Top Ranks image: `TopRanks.png`.
- Normal blocks, power blocks, hearts, paddle, and item icons use PNG assets.
- Sound effects use MP3 files from `assets/sounds`.
- The UI uses the `DS-DIGIB.TTF` digital font.

## Current Sound Effects

- `PaddleHit.mp3`: paddle bounce.
- `BlockHit.mp3`: normal block hit and fallback sound for unspecified block events.
- `InfiBlockHit.mp3`: `Infi-Block` hit.
- `Bomb.mp3`: bomb explosion.
- `Rocket.mp3`: rocket block activation.
- `WiderHit.mp3`: `WIDE` block activation.
- `SlowHit.mp3`: `SLOW` block activation.
- `GameStart.mp3`: Intro screen loop while waiting to start.
- `GameOver.mp3`: one-shot sound when the game ends.
- `Rank.mp3`: Top Ranks screen loop.
- `StageStart.mp3`: one-shot sound when a stage starts.
- `Rolling1.mp3`: block rolling sound.
- `Rolling2.mp3`: reserved for four-face screen rotation.

## Current Blocks And Power Blocks

Normal blocks display their remaining HP. For example, a level 3 block starts at `3`, then shows `2`, then `1`, and breaks on the next hit.

Normal block colors are fixed by level so the same level always uses the same color. Available normal block assets are `yellow`, `orange`, `green`, `blue`, `red`, and `purple`.

Level color order:

- Level 1 / `20`: `yellow`
- Level 2 / `30`: `orange`
- Level 3 / `40`: `green`
- Level 4 / `50`: `blue`
- Level 5 / `60`: `red`
- Level 6 / `70`: `purple`
- Level 7 / `80`: dark `purple`
- Level 8 / `90`: darkest `purple`

The `20`-`90` values are the level score values and color mapping, not the number shown on the block during play.

Each generated face currently places 5 breakable power blocks at random positions. Their types are randomly selected from `ROCKET`, `SLOW`, `x3`, `WIDE`, and `BOMB`.

Power blocks:

- `x3`: splits one ball into three.
- `SLOW`: changes ball speed.
- `WIDE`: expands the paddle to 1.3x for 20 seconds.
- `BOMB`: explodes when broken, damaging the adjacent blocks above, below, left, and right by 1 level.
- `ROCKET`: clears blocks in a straight line until blocked.
- `SHIELD`: unbreakable block type. Going forward this is called `Infi-Block`; its staged generation rules are planned below.

## Current Scoring

- Normal blocks display remaining HP, but award their level score value when broken: `20`, `30`, `40`, and so on.
- Power blocks receive a random score from `1` to `100` when the stage is generated.
- `Infi-Block` awards a random score from `1` to `10` each time it is hit.
- Stage number does not add a direct score bonus.
- Every score gain shows a floating `+points` popup near the hit block.

## Target Gameplay Rules

These are the intended rules for the next gameplay implementation pass.

### Hold

- Implemented: during active play, pressing `Space` holds the game.
- Implemented: pressing `Space` again resumes.

### Stage And Block Difficulty

- Implemented: the game starts at Stage 1.
- Implemented: block difficulty increases as stages progress.
- Implemented: Stage 1-9 has no `Infi-Block`.
- Implemented: Stage 1-5 normal blocks only use level 1-2.
- Implemented: Stage 6-10 normal blocks use level 1-3.
- Implemented: Stage 11-15 normal blocks use level 1-4.
- Implemented: every 5 stages, the maximum block level increases by 1.

Block level values:

- Level 1: `20`
- Level 2: `30`
- Level 3: `40`
- Level 4: `50`
- Level 5: `60`
- Level 6: `70`
- Level 7: `80`
- Level 8: `90`

Each normal block requires hits equal to its level. For example, level 1 breaks in 1 hit, level 3 breaks in 3 hits, and level 8 breaks in 8 hits.

### Infi-Block Rules

- `Infi-Block` means an unbreakable block.
- Implemented: `Infi-Block` starts appearing from Stage 10.
- Implemented: every 5 stages, the maximum number of `Infi-Block`s increases by 1.
- Implemented: a single screen can have at most 7 `Infi-Block`s.

### Block Placement

- Blocks should be placed randomly.
- The first implementation should focus on one active face.
- Four-face stage generation should remain planned, but not implemented first.

### Ball Speed

- Implemented: count paddle hits.
- Implemented: every 10 paddle hits increases ball speed by 10%.
- Implemented: stationary paddle bounces the ball by preserving the incoming horizontal direction and reflecting upward.
- Implemented: moving the paddle during impact adds horizontal influence to the bounce.
- Example:
  - 10 hits: `+10%`
  - 20 hits: `+20%`
- Implemented: breaking a `SLOW` block resets the speed increase back to normal.
- Implemented: if the ball has no speed increase when `SLOW` is broken, ball speed decreases by 10%.

### Rolling Blocks

Rolling starts after time has passed on the current face.

- Implemented for the current single active face.
- Rolling time starts after the ball is launched.
- 20 seconds: bottom row rotates one cell to the right.
- 40 seconds:
  - bottom row rotates right
  - second row rotates left
- 60 seconds:
  - bottom row rotates right
  - second row rotates left
  - third row rotates right
- 80 seconds:
  - bottom row rotates right
  - second row rotates left
  - third row rotates right
  - fourth row rotates left

This pattern continues by row, alternating direction.
If rolling moves a block onto the ball, the ball is moved downward to the nearest open position.

## Four-Face Rotation Plan

This is planned for later. The first gameplay pass should implement only one face.

At stage start:

- Generate 4 faces with random blocks.
- Only the active face is visible and playable.

Rotation controls:

- `ArrowUp`: rotate to the next face to the right.
- `ArrowDown`: rotate to the next face to the left.

Rotation behavior:

- Ball position, direction, and speed are preserved.
- If the ball overlaps a block after rotation, move the ball downward until it reaches an empty position.
- Rolling timers only run for the active face.
- Inactive faces are held.

Example:

- Face 1 is played for 40 seconds.
- Switch to Face 2.
- Face 1 timer stays at 40 seconds.
- Face 2 timer starts from 0 seconds.
- Returning to Face 1 resumes its timer from 40 seconds.
