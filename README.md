# Multiverse Mayhem

Created by **Gabi** (Kratos5212).

A cartoon 3D multiplayer game about infinite versions of yourself. Build your own variant, pick who you are in this universe, then smash, fight, craft and portal-hop across dimensions with everyone else online. It runs in the browser on PC and phones, with [three.js](https://threejs.org) for graphics and a small Node server for online play.

It's an original game in the spirit of multiverse sci-fi comedies: original names, characters, dimensions and art, not affiliated with any show or studio.

## Playing

* **Offline with bots:** open `index.html` through any web server (see below) and press **Play offline with bots**. The full game runs in your browser, with 18 bots spread across the dimensions. Add `?bots=0` to `?bots=40` to the address to change how many.
* **Online:** run the server (below), open its address in a browser, and press **Play online**. Friends open the same address. Up to **64 players share each dimension**; when one fills up, a fresh copy opens automatically.

```sh
cd multiverse-mayhem/server && npm install && cd ..
npm start                      # http://localhost:8790
```

Friends on your Wi-Fi can join at `http://<your-computer's-ip>:8790`.

### Hosting it for everyone (free)

The repository's `render.yaml` has a `multiverse-mayhem` service. On [render.com](https://render.com), choose **New → Blueprint** and pick this repository. Render builds the `Dockerfile` and gives you an address like `multiverse-mayhem.onrender.com`; open it and play. On the free plan the server sleeps when nobody is playing and takes about 30 seconds to wake up. Any host that runs Docker or Node 18+ works too.

| Setting | Default | What it does |
| --- | --- | --- |
| `PORT` | 8790 | Port to listen on |
| `SERVER_NAME` | Multiverse Mayhem | Name shown to players |
| `INSTANCE_CAP` | 64 | Players per dimension copy (up to 128) |
| `MAX_PLAYERS` | 500 | Players on the whole server |
| `BOTS` | 6 | Bots that keep the world lively (0 turns them off) |
| `MAX_PER_IP` | 4 | Simultaneous connections from one address |
| `CONNECT_RATE` | 20 | New connections per minute from one address |
| `ALLOWED_ORIGINS` | any | Comma-separated web origins allowed to connect |
| `TRUST_PROXY` | off | Set to `1` behind Render, Fly or nginx so limits apply per real player |

## Controls

| PC | Phone | Action |
| --- | --- | --- |
| W A S D | Left stick | Move |
| Mouse (click to capture) | Drag the right side | Look |
| Click | FIRE | Shoot or hit |
| Space | JUMP | Jump (hold to fly as a Birdfolk) |
| Q | SKILL | Archetype ability |
| E | PORTAL | Portal gun, or the kiosk when standing at it |
| F | PORTAL | Use the kiosk |
| 1 2 3 | GADGET | Grenade, turret, shrink ray |
| C | Craft slot | Workbench |
| Enter | Chat button | Chat with the whole multiverse |
| Tab | Chart button | Leaderboard, players here, mute |
| V |  | Wave |
| Esc | Menu button | Settings and leave |

## Who you are: archetypes and lore limits

Your look is completely free. Your **archetype** is your lore, and it decides what you can do. The server enforces it.

| Archetype | Health | Portal gun | Builds | Ability | Lore |
| --- | --- | --- | --- | --- | --- |
| Genius Scientist | 80 | Yes, 3 charges | Everything, a third cheaper | Science Shield (70% less damage, 4 s) | Fragile genius |
| Reluctant Sidekick | 100 | Borrowed, 1 charge | Grenades, boots, portal fluid | Panic Sprint | Dodges 20% of hits by luck |
| Average Joe | 100 | No | Grenades only | Sob Story (can't be hurt, can't attack, 3 s) | Monsters and turrets ignore him |
| Birdfolk Warrior | 140 | No | Nothing | Dive Strike (slam from the air) | Flies; strong talons |
| Cheerful Beanling | 70 | No | Grenades, boots | Cheer Up (heals everyone nearby) | Whoever takes one down feels awful (slowed 10 s) |
| Meat Mutant | 200 | No | Nothing | Body Slam (knocks everyone back) | Slow; regenerates |

Without a portal gun, you travel by the **Portal Kiosk** in the middle of every dimension, or by jumping through someone else's portal before it closes.

## The character creator

Six species (human, alien, birdfolk, robot, beanling, blob), height, build and head size, skin colour, eyes (normal, wide, sleepy, one eye, three eyes, visor), brows (including a unibrow), mouths (including drool), eight hairstyles, seven tops (lab coat, T-shirt, polo, sweater, armour, vest, none), colours for every piece of clothing, nine accessories, and your own **portal colour**, which also tints your ray gun. Presets give quick starting points, and Randomize makes a random variant. You also pick a name and a home-dimension code (like `K-42`) that floats over your head.

## Dimensions

| Dimension | Feel | Locals | Gravity |
| --- | --- | --- | --- |
| Suburbia Prime | Streets, houses, cars, mailboxes | Nosy neighbours | Normal |
| The Meatlands | Flesh pillars, eye stalks, bone arches; a giant eye in the sky follows you | Meat blobs (hostile) | Normal |
| Neon Bazaar | Glowing mushrooms, market stalls, a ringed planet | Sky jellies | Slightly low |
| Lowgrav Moon | Craters, crystals, rovers, a planet overhead | Moon crabs (hostile) | Very low |

Every prop can be destroyed (a house takes a lot of punishment). Destroyed props drop scrap (crystals on the moon) and grow back after a minute. Monsters drop scrap and crystals. Scrap and crystals build gadgets: Gravity Grenades, Auto-Turrets, Shrink Ray shots, Jump Boots, the Mega Blaster and Portal Fluid. Wrecking things and beating other players earns **chaos points**, and a multiverse-wide leaderboard tracks the most chaotic variants.

### Adding a dimension

1. Add an entry to `MM.DIMS` in `shared/world.js`: name, seed, gravity, colours, which props, which monsters and how much loot.
2. Add any new prop types to `MM.PROPS` (size and health) and give them a model in `MODELS` in `js/dims.js`.
3. Optionally give it sky decorations in `skyDecor` and terrain colouring in `makeTerrain`.

The server, the kiosk, portals and bots pick it up automatically.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page, styles and HTML layers |
| `shared/rules.js` | Archetypes, weapons, gadgets, look options and sanitizers |
| `shared/world.js` | Dimensions, terrain, props (generated from seeds, identical everywhere) |
| `shared/protocol.js` | Every message a client may send, and the rate limits |
| `sim/host.js` | The authoritative game host (runs on the server, and in the browser when offline) |
| `sim/bot.js` | Bots that play through the same protocol as people |
| `js/` | The client: cartoon rendering, characters, dimensions, effects, sound, UI and game loop |
| `server/server.js` | Web and WebSocket server with connection limits and security headers |
| `test/` | `npm test` |
| `scripts/loadtest.js` | Connects N bots over real WebSockets to measure a server |
| `PROTOCOL.md` | The network protocol and everything that keeps the game safe |

## Credits

three.js is MIT-licensed (`vendor/three.LICENSE`). The Fredoka font loads from Google Fonts (SIL Open Font License). Everything else, including all sounds (synthesized live in the browser), is made in this repository.
