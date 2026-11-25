![Wilderlight key art featuring the warden, ranger and ember mage](docs/banner.jpg)

# Wilderlight · 荒野微光

**Game design and production by DynamicWang**　｜　[简体中文](README.md)

## About This Game

By the time Vela’s first bolt crosses the clearing, Lorne has his sword out. Close the distance and he can catch the front rank in a single sweep. Or lead the party around the tree line, let the pursuers bunch up, and give Eve a perfect shot with a fireball.

Wilderlight is a single-player action roguelite about leading three adventurers through two chapters of woodland, from late sunlight into moonrise. Each hero picks a target and attacks on their own. You steer the party, time each dodge, and decide who gets the next blessing.

### Into the Sunward Woods

Gold and rust-red leaves gather along the path through the Sunward Woods. Birch shadows cut across the clearing, and the light breaks over leaves and stones in thick strokes of paint. As the goblins close in, you can still pick out the pale path between them. Keep an eye on the gaps beside it. When the goblin officer flies into a rage and charges three times in succession, you’ll want to know where to dodge.

![Goblins converge on the party from both sides of a leaf-strewn clearing in the Sunward Woods](docs/forest-battle.jpg)

### Watch Night Fall on the Same Clearing

After the first boss falls, pick a stone and watch it through the change. It stays right where it was as the amber leaves around it fade to slate blue. Moonlight slips through gaps in the canopy, laying pale silver bands across the forest floor. In the darker patches, yellow-green fireflies drift just above the leaves, each brightening and fading in its own time.

[![Day turning to night in the same clearing, from golden sunlight to blue moonlight](docs/moonrise-preview.webp)](docs/moonrise.mp4)

[Watch the original day-to-night clip (MP4, 1080p, about 5 seconds)](docs/moonrise.mp4)

Once night settles, skeleton mages start casting from across the clearing. Survive five waves and the skeleton lord takes the field. At half health, he picks a fresh landing spot for each leap, then chases the party with his blade still spinning.

### Three Heroes, One Dodge

**Lorne**, the warden, can catch several enemies within reach of his sword. **Vela**, the ranger, opens fire well before they reach him. **Eve**, the ember mage, leaves enemies burning even after her fireball bursts. A few steps forward can line up a beautiful swing for Lorne and put Eve within reach of an enemy blade. Hit Space and all three dodge in the direction you choose.

### Take a Blessing. Change Your Route.

The first three blessings give you a feel for how differently a run can play. With **Whirlwind**, skim the edge of a crowd to keep enemies within Lorne’s reach for one more turn of the blade. With **Ricochet**, a pair of enemies standing close together makes a fine target for Vela. Take **Blazing Circle** and it pays to double back, drawing pursuers through Eve’s fire a second time.

![The first three woodland blessings: Whirlwind, Blazing Circle, and Ricochet](docs/woodland-blessings.jpg)

Later choices include piercing blade waves, volleys of bolts, and flames that leap between enemies. Each skill and blessing can reach level 12. Finish both chapters to put a time on your local leaderboard. On the next run, try a different build and see how much sooner you can make it home.

### Play Locally

Download and extract the repository ZIP, or clone the repository. From the game directory, run the following command with Python 3.7 or later. Use a browser with WebGL 2 support.

```sh
python3 start.py
```

On Windows, run `py -3 start.py`. On macOS, you can also double-click `启动游戏.command`. The launcher opens [the local game](http://127.0.0.1:8000/). If that port is busy, use `python3 start.py --port 8001`. The repository includes the game’s dependencies and demo assets, so you can play offline after downloading.

| Action | Keyboard and mouse | Touch |
| --- | --- | --- |
| Move the party | WASD, arrow keys, or click the ground | Drag the left stick or tap the ground |
| Dodge | Space | Tap the boot while steering |
| Pause or resume | Esc or the pause button | Tap pause, then Resume |
| Switch between Chinese and English | Language button in the main menu | Same |

### Inside the Project

- `app.js` handles menus, input and local rankings. The leaderboard keeps the fastest 100 completed runs in this browser and displays the top ten.
- `src/simulation.js`, `src/combat-rules.js` and `src/boss-rules.js` handle combat. Skill progression lives in `src/progression.js`.
- The forest renderer lives in `src/original-world.js`, with scene coordination in `src/scene.js`. Run `node tools/render-music.mjs` to regenerate the public build’s day and night demo tracks.
- The Chinese interface uses Xianglifang Heiti when installed and falls back to a system font.

### Credits and Licenses

**DynamicWang** designed and produced Wilderlight. The game code is available under the [MIT License](LICENSE). The banner, screenshots and gameplay clip are supplied by the author. AWPlanet / DynamicWang reserve the rights to their original artwork and brand marks shown here.

The public build includes CC0 character, skeleton and weapon models by Kay Lousberg (KayKit), and CC0 mossy rock models by Kless Gyzen via Poly Haven. The daytime enemies use knight and ranger models to demonstrate the goblin encounters. Rendering, audio, font and asset credits are listed in the [third-party notices](THIRD_PARTY.md).
