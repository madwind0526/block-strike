# Rolling Block Strike

Rolling Block Strike is a modern web brick-breaker prototype. It starts from the classic paddle-and-ball loop, then leaves room for a later rotating block-face mechanic.

## Current Prototype

- HTML5 Canvas, no build step
- Modern soft 3D block style
- Paddle, ball, wall, and block collision
- Stage progression
- Block hit points
- 7-column, 4-row block layout
- Unbreakable black blocks appear in the grid and are not counted for stage clear
- Row-based block levels:
  - bottom two rows start at level 1
  - third row from the bottom starts at level 2
  - top row starts at level 3
  - every new stage adds +1 level to every block
- Special blocks:
  - `x3`: adds two extra balls
  - `SLOW`: slows balls for a short time
  - `WIDE`: expands the paddle to 1.3x for 20 seconds
  - `BOMB`: gives bomb charges that damage nearby blocks
  - `ROCKET`: clears blocks in a straight line until it hits a shield block
  - `SHIELD`: an unbreakable block that stops rockets
- SVG image assets for normal blocks, power blocks, bottom item icons, hearts, and the logo
- Bomb explosion animation with about a two-block radius
- Lives:
  - starts at 3
  - +1 every 5 stages
  - max 5

## Run

Open `index.html` in a browser.

## Controls

- Left / Right arrows or mouse: move paddle
- Space or click: launch ball
- P: pause

## Design Direction

The chosen visual style is modern toy-like 3D:

- dark polished playfield
- rounded soft blocks
- clean gradients and shadows
- bright but controlled colors
- no text inside blocks
- visible special blocks rendered with reusable image icons

## Future Rotation Mechanic

Stages are already shaped as `faces[4]` internally. The first version only shows `faces[0]`, but the structure is prepared for later rotating between four block faces.
