# Rolling Block Strike Plan

## Version 1 Goal

Build a playable modern brick-breaker prototype:

1. Paddle and ball movement
2. Block collision and damage
3. Stage clear when main-face breakable blocks are gone
4. Multi-hit blocks
5. Four special block effects
6. Visible special blocks
7. Lives and game over

## Visual Style

Use the third selected concept: modern toy-like 3D soft blocks.

- Rounded block corners
- Soft shadows
- Glossy top highlights
- Bright but refined palette
- Dark navy/charcoal playfield
- No pixel-art retro styling

## Block Rules

- Normal block:
  - has `hp`
  - breaks when hp reaches 0
- Solid block:
  - appears as a black block
  - does not break
  - is not counted for stage clear
- Layout:
  - 7 columns
  - 4 rows
  - top row starts about one block lower from the upper playfield wall
- Special block:
  - breaks like a normal block
  - triggers an effect when destroyed
  - is visually distinct by color
  - has no text label inside the block
  - appears exactly once per row

## Level Rules

- Bottom two rows start at level 1
- Third row from the bottom starts at level 2
- Top row starts at level 3
- Every new stage adds +1 level to every block

## Special Effects

- `x3`: split one ball into three
- `slow`: reduce ball speed temporarily
- `wide`: widen the paddle to 1.3x for 20 seconds
- `bomb`: grant bomb charges; later block hits explode around impact in about a two-block radius
- `rocket`: travel in a straight line and remove every block it meets until blocked by a shield
- `shield`: unbreakable block that stops rockets and protects blocks behind it

## Asset Rules

- Normal blocks, power blocks, bottom item icons, hearts, and logo use reusable SVG assets from `assets/images`
- Explosion effects are animated in canvas so the blast can expand across nearby blocks

## Stage Rules

- Starting lives: 3
- Max lives: 5
- Every 5 stages, add 1 life
- If all balls fall below the paddle, lose 1 life
- If lives reach 0, restart from stage 1

## Rotation Design For Later

Each stage should be represented as:

```js
stage = {
  number: 1,
  activeFaceIndex: 0,
  faces: [mainFace, sideFaceA, sideFaceB, backFace]
}
```

Only `faces[0]` counts for stage clear.

When rotation is added:

- Arrow up/down changes `activeFaceIndex`
- Ball position and velocity stay unchanged
- If a ball overlaps a block after rotation, move it downward until it reaches empty space
- If no safe space is found, move it to a safe position above the paddle

This keeps rotation strategic instead of decorative.
