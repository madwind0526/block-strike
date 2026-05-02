# Rolling Block Strike

Rolling Block Strike is a browser brick-breaker game with stage progression, power blocks, rolling block rows, local ranking, and mobile controls.

Play:

```text
https://madwind0526.github.io/block-strike/
```

## Controls

Desktop:

- `Left` / `Right`: move the paddle.
- Mouse move: move the paddle.
- Click or `Space`: launch the attached ball.
- `Space`: hold or resume during play.
- `Enter`: start, continue, or restart from menu screens.
- `Up` / `Down`: switch between block faces.

Mobile:

- Touch drag: move the paddle.
- Double tap the game screen: launch, hold, or resume.
- Double tap menu screens: start, continue, or restart.
- Swipe left or right on the game screen: switch between block faces.

## Gameplay

- Break all breakable blocks to clear the stage.
- Normal blocks show their remaining HP.
- A level 3 block shows `3`, then `2`, then `1`, then breaks.
- Desktop stages use 5 block rows.
- Mobile stages use 4 block rows.
- Every 20 seconds after launch, block rows start rolling.
- If a rolling block overlaps the ball, the ball is pushed downward to the nearest open position.
- Each stage has three block faces. Clear all faces to advance.
- Rolling time only runs on the currently visible face.

## Blocks

Normal block score values:

- Level 1: `20`
- Level 2: `30`
- Level 3: `40`
- Level 4: `50`
- Level 5: `60`
- Level 6: `70`
- Level 7: `80`
- Level 8: `90`

Power blocks:

- `x3`: splits the ball that hit it into three.
- `SLOW`: resets speed increases. If speed is already normal, slows the ball by 10%.
- `WIDE`: widens the paddle for 20 seconds.
- `BOMB`: damages adjacent blocks up, down, left, and right.
- `ROCKET`: clears blocks in a straight line until blocked.
- `Infi-Block`: unbreakable block.

## Stages

- Stage 1-5: normal blocks use level 1-2.
- Stage 6-10: level 1-3.
- Stage 11-15: level 1-4.
- Stage 16-20: level 1-5.
- Stage 21-25: level 1-6.
- Stage 26-30: level 1-7.
- Stage 31-34: level 1-8.
- Stage 35-39: level 2-8.
- Stage 40-44: level 3-8.
- Stage 45-49: level 4-8.
- Stage 50 and above: level 5-8.

`Infi-Block` starts appearing from Stage 10 and increases gradually up to 7 blocks.

Power blocks start at 1 per face, then increase by 1 every 5 stages. The maximum is 5 on desktop and 4 on mobile.

## Score And Ranking

- Normal blocks award their level score when broken.
- Power blocks award a random score from `1` to `100`.
- `Infi-Block` awards a random score from `1` to `10` each time it is hit.
- Score gains appear as floating `+points`.
- Top ranks are saved locally in the browser.

## Local Run

```powershell
python -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/
```
