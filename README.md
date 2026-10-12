# Multiverse Mayhem

Created by **Gabi** (Kratos5212).

A cartoon 3D multiplayer game about infinite versions of yourself. Build your own variant, pick who you are in this universe, and live that life, or break out of it: craft across worlds, build a portal gun and a ship, talk to strange locals, and portal-hop across dimensions with everyone else online. It runs in the browser on PC and phones, with [three.js](https://threejs.org) for graphics and a small Node server for online play.

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
| `SAVE_FILE` | `server/data/saves.json` | Where character progress is kept. On Render's free plan the disk is wiped on redeploy; attach a disk to keep saves |

## Controls

| PC | Phone | Action |
| --- | --- | --- |
| W A S D | Left stick | Move |
| Mouse (click to capture) | Drag the right side | Look |
| Click | FIRE | Shoot or hit |
| Space | JUMP | Jump (hold to fly as a Birdfolk) |
| Q | SKILL | Archetype ability |
| E | PORTAL | Portal gun, kiosk, or dimension drive |
| F | TALK / USE | Talk to locals, daily tasks at buildings, the kiosk |
| J | Journal button | Your life, your path, errands |
| B | SHIP | Board or leave your ship (Space up, Shift down) |
| 1 2 3 | GADGET | Grenade, turret, shrink ray |
| C | Build slot | Workbench |
| Enter | Chat button | Chat with the whole multiverse |
| Tab | Chart button | Leaderboard, players here, mute |
| V |  | Wave |
| Esc | Menu button | Settings and leave |

## Who you are: characters, lives and lore limits

Your look is completely free. Your **character** is your lore: it decides your stats, your everyday life, what you know how to build, and how you can break out of that life. The server enforces all of it. Each character plays the game through their own eyes:

| Character | Starts as | Daily life | Can become | Lore |
| --- | --- | --- | --- | --- |
| Genius Scientist | Garage Genius | Tinker in the garage, family dinner | Multiverse Menace | Portal gun (3 charges), knows every recipe at a third off; fragile |
| Reluctant Sidekick | Reluctant Sidekick | School, family dinner | Seasoned Adventurer | Borrowed gun (1 charge), dodges 20% of hits |
| Rebellious Teen | Regular Teen | School, family dinner | **Space Teen** | Daily tasks pay double; breaks out to her own portal gun and ship |
| Horse Surgeon | Horse Surgeon | Operate on horses, family dinner | **Space Surgeon** | Self-upgrades cost half; Field Surgery heals everyone near |
| Average Joe | Average Joe | Look for a job, watch TV | Adventure Dad | The longest road out (7 steps). Monsters ignore him |
| Birdfolk Warrior | Aerie Warrior (Featherhold) | Guard the Aerie, train with elders | Hero of Many Skies | Flies, strong talons, no gadgets; his own life in his own world |
| Cheerful Beanling | Friendly Beanling | Visit old friends, TV | Beanling of Many Worlds | Heals everyone; makes friends; killers feel guilty |
| Meat Mutant | Lurking Mutant (Meatlands) | Feed the Flesh Forge | Apex Abomination | Huge, slow, regenerates |
| Federation Trooper | Loyal Trooper (Bazaar) | Patrol reports, ship repairs | Rogue Trooper | Starts with a ship; Stun Cuffs |
| Hive Mind | Small Collective (Moon) | Refinery shifts, haggling | Planetary Hive | Assimilate turns locals into followers that fight for you |

You never have to break out: you can play a normal life and still go anywhere by kiosk or by jumping through other people's portals. Your **journal (J)** shows your daily tasks, your next step, what each step unlocks, and your errands. Progress is saved per character.

## Crafting across dimensions

Every world has its own material: **Scrap** (everywhere), **Moon Crystals** (Lowgrav Moon), **Meat Goo** (The Meatlands), **Neon Plasma** (Neon Bazaar) and **Sky Feathers** (Featherhold). Gadgets can be built anywhere; big upgrades must be built at a particular station in a particular world, from materials gathered in others.

| What | Built at | Needs |
| --- | --- | --- |
| Gravity Grenade, Auto-Turret, Shrink Ray, Portal Fluid | Anywhere | Scrap, crystals |
| Bio-Armor I–III (+80 health) | Flesh Forge, Meatlands | Goo, crystals, plasma |
| Spring Legs, Crystal Tendons (speed, jump) | Garage Lab, Suburbia / Refinery, Moon | Scrap, crystals, plasma |
| Jetpack → Feather Wings (hover → fly) | Bazaar Shipyard / Aerie Temple, Featherhold | Plasma, feathers, goo |
| Weapon Mod, Overcharged Core (+30%, +40% damage) | Black Market, Bazaar | Plasma, crystals, goo |
| **Build a Portal Gun** | Garage Lab | Material from **every** world |
| Fluid Tank, Twin Tank, Quick Mixer (portal gun) | Refinery / Black Market | Crystals, plasma, goo, feathers |
| **Ship Hull** → Turbo Engine, Ship Lasers → **Dimension Drive** | Bazaar Shipyard / Black Market | All five materials for the drive |

Your character decides which recipes you know. Breaking out of your life unlocks more.

## The ship

Press **B** to board (phone: SHIP). Fly where you look: **W** forward, **Space** up, **Shift** down. You take less damage inside, and with Ship Lasers you fire heavy lasers. With the Dimension Drive, the portal button jumps your ship straight into any world.

## Locals and random events

Every world has locals who walk around with names, faces and opinions: neighbours and students in Suburbia, flesh monks in the Meatlands, merchants and tourists in the Bazaar, miners on the moon, bird citizens in Featherhold. Walk up and press **F** to talk. Anything can happen:

* They just say something strange.
* They give you a gift, or offer a trade.
* They ask you to deliver something to someone in another world (an **errand**, paid on delivery).
* They give you a buff, shrink you by accident, or decide to follow you and fight at your side for a minute.
* They take offence and come after you, open a prank portal under your feet, or start dancing.

Everyone nearby sees the speech bubbles.

Every few minutes a **world event** hits a dimension:

| Dimension | Events |
| --- | --- |
| Suburbia | Block Party, Alien Invasion |
| Meatlands | Meat Rain, Blob Swarm |
| Bazaar | Flash Sale, Jelly Bloom |
| Moon | Meteor Shower, Crab Migration |
| Featherhold | Molting Season, Serpent Hunt |

## Dimensions

| Dimension | Feel | Locals | Material | Landmarks |
| --- | --- | --- | --- | --- |
| Suburbia Prime | Streets, houses, cars | Neighbours, students | Scrap | Family House, Garage Lab, Harmony High, Horse Hospital, Unemployment Office |
| The Meatlands | Flesh pillars, eye stalks, a giant eye in the sky | Flesh monks, meat blobs (hostile) | Meat Goo | Flesh Forge |
| Neon Bazaar | Glowing mushrooms, market stalls, a ringed planet | Merchants, tourists, sky jellies | Neon Plasma | Bazaar Shipyard, Black Market |
| Lowgrav Moon | Craters, crystals, rovers, very low gravity | Miners, moon crabs (hostile) | Moon Crystal | Crystal Refinery |
| Featherhold | Golden cliffs, giant nests, totems, floating islands | Bird citizens, sky serpents (hostile) | Sky Feather | Aerie Temple |

Every prop except the landmarks can be destroyed. Wrecking things and beating other players earns **chaos points** for the multiverse-wide leaderboard.

### Adding a dimension

1. Add an entry to `MM.DIMS` in `shared/world.js`: name, seed, gravity, colours, props, locals and monsters, material and loot.
2. Add new prop types to `MM.PROPS` and models to `MODELS` in `js/dims.js`; add locals to `MM.NPCS` and events to `MM.EVENTS`.
3. Optionally add landmarks (`MM.LANDMARKS`), daily tasks (`MM.TASKS`) and recipes (`MM.RECIPES`) in `shared/rules.js`.

The server, kiosk, portals, bots and journal pick it up automatically.

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
