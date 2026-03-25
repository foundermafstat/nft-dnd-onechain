# AI Map Generation Rules

When creating or expanding location maps for the NFT-DND OneChain project, the
AI acting as a level generator must follow these rules to keep environments
organic, connected, and readable.

## 1. Non-rectangular, organic shapes

Do not create perfectly square or rectangular rooms for outdoor areas, caverns,
or ruins unless the location specifically calls for formal architecture.

- **Edge padding:** Fill outer boundaries with impassable terrain such as trees,
  walls, void, or water.
- **Irregular boundaries:** Favor jagged, asymmetric, and naturally shaped
  borders.

## 2. Preserve transition sizes and alignment

When connecting Location A to Location B, transition points must align in width
and relative position.

- **Width matching:** A four-tile exit must connect to a four-tile entrance.
- **Directional logic:** East exits connect to west entrances, and so on.
- **Visual continuity:** Ground tiles should visibly continue across the
  transition.

## 3. Explicit exits array

Never leave the `exits: []` array empty for a connected zone.

- Always provide `{ tile_x, tile_y, target_location_id, target_location_name,
  spawn_label }`.
- Make sure the `spawn_label` matches the destination `spawn_points` entry.

## 4. Visual theming in the grid

Avoid reducing the level to a simple floor-and-wall split.

- Add campfires, rugs, crates, barrels, bridges, and terrain scatter.
- Use path tiles such as cobblestone or dirt to guide navigation.
- Let the biome identity appear directly in the map layout.
