# Travino in-app capybaras

Four transparent PNG illustrations prepared with the built-in image generation
tool on 2026-10-24 from the user's supplied travel capybara reference sheets.
The selected outputs were downscaled to 512 × 512 for bundled app use; alpha is
preserved. No network request is needed to display the mascots.

| File | Context |
| --- | --- |
| `capybara-travel.png` | New trip setup, empty Days/Trip/Map, friends |
| `capybara-packing.png` | Choosing a packing list, map retry |
| `capybara-celebrate.png` | First activity saved, all packed, trip planner confirmation |
| `capybara-memories.png` | Empty memories, blank journal page |

`src/capybara.tsx` gives each image two subtle greetings on screen focus, then
rests. Motion stops on blur/background and is disabled for Reduce Motion. These
are illustrated cutouts animated by React Native, not frame-by-frame character
animations. The wrapper reserves all layout space and ignores touches and
screen-reader focus.

## Final prompt set

Each request used `transparent_background: true` and the corresponding reference
sheet as `referenced_image_paths`.

Common prefix:

> Use case: background-extraction. Asset type: a single polished app mascot
> cutout. Edit target: attached reference sheet.

Individual requests:

- **Travel**, reference “Seks uttrykksfulle kapybara på reise”: Extract ONLY the
  top-left aviator capybara with yellow scarf, goggles and rolling suitcase.
  Preserve this exact happy character, its pose, proportions, warm orange
  shading and thick dark brown outline. Remove all other characters and the
  cream background.
- **Packing**, reference “Søt reisekapybara i tolv app-tilstander”: Extract ONLY
  the middle-row third-column explorer capybara in green hat and backpack looking
  into an open empty brown suitcase. Preserve exact pose, outfit, suitcase and
  thick dark brown outline, but give it a gentle friendly smile rather than a
  worried frown. Keep the small question mark. Remove all other characters and
  the cream background.
- **Celebrate**, reference “Søt reisekapybara i tolv app-tilstander”: Extract ONLY
  the top-row fourth-column delighted aviator capybara with yellow scarf and
  green check badge, in its little jumping celebration pose. Preserve exact
  character, pose, proportions, shading and thick brown outline. Keep only a few
  nearby confetti marks. Remove all other characters and cream background.
- **Memories**, reference “Seks uttrykksfulle kapybara på reise”: Extract ONLY the
  bottom-left cheerful photographer capybara in blue hoodie, brown shoulder bag,
  holding its camera. Preserve exact pose, proportions, warm orange shading,
  happy expression and thick brown outline. Remove all other characters and the
  cream background.

Common suffix:

> Output one standalone character centered on a genuinely transparent alpha
> background, square canvas, full character and accessories visible with about
> 6% clear margin, no text, no extra characters, no grid, no background shape, no
> rectangular cream patch. Preserve the original illustration style very closely.
> This will be displayed about 120px wide in a travel app.
