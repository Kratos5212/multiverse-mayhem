# Multiverse Mayhem

Created by **Gabi** (Kratos5212).

An unofficial, free, non-commercial **Rick and Morty fan game** in cartoon 3D: be any Rick, Morty or anyone else, from any universe. Build your own variant, pick who you are in this universe, and live that life, or break out of it: craft across worlds, build a portal gun and a ship, talk to strange locals, and portal-hop across dimensions with everyone else online. It runs in the browser on PC and phones, with [three.js](https://threejs.org) for graphics and a small Node server for online play.

Rick and Morty and its characters belong to their creators and Adult Swim. This is a fan project, not affiliated with or endorsed by them, and it must stay free. All models are made in code in this repository (no ripped assets), in the show's style.

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
| 1 2 3 4 | GADGET | Grenade, turret, shrink ray, Meeseeks Box |
| C | Build slot | Workbench |
| Enter | Chat button | Chat with the whole multiverse |
| Tab | Chart button | Leaderboard, players here, mute |
| V or mouse wheel | Eye button | Switch between first and third person |
| G |  | Wave |
| Esc | Menu button | Settings and leave |

**First person:** press **V**, scroll all the way in, tap the eye button, or pick it in the menu's settings. You see through your character's eyes, with your own arm, sleeve and gun (or fist) in front of you. In a ship you look out over the saucer's rim. When you die, the camera pulls back so you can see what happened. The choice is remembered.

## Who you are: characters, lives and lore limits

Your look is completely free. Your **character** is your lore: it decides your stats, your everyday life, what you know how to build, and how you can break out of that life. The server enforces all of it. Each character plays the game through their own eyes:

| Character | Starts as | Daily life | Can become | Lore |
| --- | --- | --- | --- | --- |
| Rick | Grandpa Rick | Tinker in the garage, family dinner | Rickest Rick | Portal gun (3 charges), knows every recipe at a third off; fragile |
| Morty | Regular Morty | School, family dinner | Adventure Morty | Borrowed gun (1 charge), dodges 20% of hits |
| Summer | Regular Summer | School, family dinner | **Space Summer** | Daily tasks pay double; breaks out to her own portal gun and ship |
| Beth | Horse Surgeon Beth | Operate on horses, family dinner | **Space Beth** | Self-upgrades cost half; Field Surgery heals everyone near |
| Jerry | Unemployed Jerry | Look for a job, watch TV | Adventure Jerry | The longest road out (7 steps). Monsters ignore him |
| Birdperson | Bird World warrior | Guard the Aerie, train with elders | Hero of Many Skies | Flies, strong talons, no gadgets; his own life on Bird World |
| Mr. Poopybutthole | Family Friend | Visit old friends, TV | Mr. Poopybutthole of Many Worlds | Heals everyone; killers feel guilty |
| Cronenberg | Lurking Cronenberg | Feed the Flesh Forge | Apex Cronenberg | Huge, slow, regenerates |
| Federation Officer | Loyal Officer | Patrol reports, ship repairs | Rogue Officer | Bug-headed officer; starts with a ship; Stun Cuffs |
| Unity | Small Unity | Refinery shifts, haggling | Planetary Unity | Assimilate turns locals into followers |
| Mr. Meeseeks | Task Meeseeks | Chores, TV | Meeseeks Who Stayed | "Look at me!" summons two more Meeseeks to fight for you |
| Squanchy | Party Squanchy | Throw parties, haggle | Freedom Fighter | Squanch Out: huge and tough for 5 s |
| Evil Morty | Quiet Morty | School, haggling | President Morty | Starts with a portal gun; Vanish hides him from monsters and turrets |
| Pickle Rick | Pickle on the Floor | Tinker | Pickle Rick! | Starts tiny and weak; builds a third cheaper; rat-part upgrades |

Picking a character puts them in their **canon look**. **Other universe** rolls an alternate version of the same character (different colours, outfit or accessories), and every option in the creator is still yours to change. Bots are alternate-universe Ricks, Mortys and the rest of the cast, each from their own home dimension.

You never have to break out: you can play a normal life and still go anywhere by kiosk or by jumping through other people's portals. Your **journal (J)** shows your daily tasks, your next step, what each step unlocks, and your errands. Progress is saved per character.

## Crafting across dimensions

Every world has its own material: **Scrap** (everywhere), **Moon Crystals** (Lowgrav Moon), **Meat Goo** (Cronenberg World), **Neon Plasma** (Alien Bazaar), **Sky Feathers** (Bird World), **Schmeckles** (Citadel of Ricks) and **Mega Seeds** (Mega Seed World, rare). Gadgets can be built anywhere; big upgrades must be built at a particular station in a particular world, from materials gathered in others.

| What | Built at | Needs |
| --- | --- | --- |
| Gravity Grenade, Auto-Turret, Shrink Ray, Portal Fluid | Anywhere | Scrap, crystals |
| Bio-Armor I–III (+80 health) | Flesh Forge, Cronenberg World | Goo, crystals, plasma |
| Spring Legs, Crystal Tendons (speed, jump) | Rick's Garage, Earth / Refinery, Moon | Scrap, crystals, plasma |
| Jetpack → Feather Wings (hover → fly) | Bazaar Shipyard / Aerie Temple, Bird World | Plasma, feathers, goo |
| Weapon Mod, Overcharged Core (+30%, +40% damage) | Black Market, Bazaar | Plasma, crystals, goo |
| **Build a Portal Gun** | Rick's Garage | Material from **every** world |
| Fluid Tank, Twin Tank, Quick Mixer (portal gun) | Refinery / Black Market | Crystals, plasma, goo, feathers |
| **Ship Hull** → Turbo Engine, Ship Lasers → **Dimension Drive** | Bazaar Shipyard / Black Market | All five materials for the drive |

Your character decides which recipes you know. Breaking out of your life unlocks more.

## The ship

Press **B** to board (phone: SHIP). Fly where you look: **W** forward, **Space** up, **Shift** down. You take less damage inside, and with Ship Lasers you fire heavy lasers. With the Dimension Drive, the portal button jumps your ship straight into any world.

## Locals and random events

Every world has locals who walk around with names, faces and opinions: neighbours and students on Earth C-137, flesh monks in Cronenberg World, merchants and tourists in the Bazaar, miners on the moon, bird citizens in Bird World. Walk up and press **F** to talk. Anything can happen:

* They just say something strange.
* They give you a gift, or offer a trade.
* They ask you to deliver something to someone in another world (an **errand**, paid on delivery).
* They give you a buff, shrink you by accident, or decide to follow you and fight at your side for a minute.
* They take offence and come after you, open a prank portal under your feet, or start dancing.

Everyone nearby sees the speech bubbles.

Every few minutes a **world event** hits a dimension:

| Dimension | Events |
| --- | --- |
| Earth C-137 | Block Party, Alien Invasion |
| Cronenberg World | Meat Rain, Blob Swarm |
| Bazaar | Flash Sale, Jelly Bloom |
| Moon | Meteor Shower, Crab Migration |
| Bird World | Molting Season, Serpent Hunt |
| Every other world | Jackpot, The Purge, Harvest Day, Squanch Party, Federation Patrol, Brute Stampede, Sugar Rush, Outbreak, Rush Hour, Raider Convoy, Power Surge, Unity Parade, Lockdown, The Big Grind |

## Dimensions

| Dimension | Feel | Locals | Material | Landmarks |
| --- | --- | --- | --- | --- |
| Earth C-137 | Streets, houses, cars | Neighbours, students | Scrap | Smith House, Rick's Garage, Harry Herpson High, Horse Hospital, Unemployment Office |
| Cronenberg World | Flesh pillars, eye stalks, a giant eye in the sky | Flesh monks, meat blobs (hostile) | Meat Goo | Flesh Forge |
| Alien Bazaar | Glowing mushrooms, market stalls, a ringed planet | Merchants, tourists, sky jellies | Neon Plasma | Bazaar Shipyard, Black Market |
| Lowgrav Moon | Craters, crystals, rovers, very low gravity | Miners, moon crabs (hostile) | Moon Crystal | Crystal Refinery |
| Bird World | Golden cliffs, giant nests, totems, floating islands | Bird citizens, sky serpents (hostile) | Sky Feather | Aerie Temple |

| Citadel of Ricks | A space city of infinite Ricks and Mortys | Ricks, Mortys, Citadel guards | Schmeckles | Council of Ricks, Morty Daycare |
| Snowball's Dog World | Dogs in mech suits rule; humans are pets | Talking dogs, pet humans, mech dogs (hostile) | Neon Plasma, scrap | Snowball's Palace |
| Mega Seed World | A dangerous jungle where Mega Seeds grow | Seed beasts (hostile) | **Mega Seeds** (rare) | Mega Seed Tree |
| Blips and Chitz | The galaxy's best arcade (indoors) | Gamers | Schmeckles | Roy: A Life Well Lived |
| Purge Planet | A calm farming world with barns and wheat | Farmers, purgers (hostile, during the Purge) | Scrap | |
| Planet Squanch | A purple party planet of huts and lights | Squanchians | Neon Plasma | |
| Gazorpazorp | Red mesas, bones, angry brutes | Gazorpians (hostile) | Meat Goo | |
| Froopyland | Cotton-candy trees, lollipops, solid rainbows | Froopies | Sky Feather | |
| Anatomy Park | A theme park inside a man: blood cells, bones, arteries | Diseases (hostile) | Meat Goo | Pirates of the Pancreas |
| Pizza-Phone-Chair Dimension | Giant chairs, phones and pizza boxes; *outside the Central Finite Curve* | Pizza, phone and chair people | Scrap | |
| Post-Apocalyptic Earth | Desert wrecks, scrap towers, cacti | Raiders (hostile) | Scrap | |
| The Microverse | A tiny, hopeful civilisation inside Rick's car battery | Microversians | Moon Crystal | Gooble Box Power Plant |
| Unity's Planet | Tidy towers, everyone one mind | Unity | Moon Crystal | |
| Galactic Federation HQ | White towers, ships and a prison block | Federation guards (hostile), clerks | Schmeckles | |
| Planet Gear | Giant gears, pipes and brass houses | Gearpeople | Scrap | |

Every prop except the landmarks can be destroyed. Wrecking things and beating other players earns **chaos points** for the multiverse-wide leaderboard.

The **portal gun, kiosk and Dimension Drive** open a map of the **Central Finite Curve**: every world inside the curve, the odd one outside it, and how many players are in each. Tap a world to see it and go.


### Rick's garage (and what's under it)

Walk up to the garage on Earth C-137 and press **F** to go inside. It's a real room you can walk around, with:

* **Rick's workbench**, with the portal gun on it. It counts as the garage station, so you can build there.
* The **Space Cruiser** parked inside, shelves of glowing jars, a weapon rack, beakers and a toolchest.
* A **Plumbus**: anyone can make one.
* The **Meeseeks Box**: press it and a Mr. Meeseeks pops out to help you.
* The **microverse battery**, charging the car.
* The **Butter Robot**. It talks.
* A **trapdoor** down to the **secret underground lab**: clone tanks, a giant computer, a machine, and the **Mind Blowers** cabinet.
* A **door to Rick's wine cellar**, a pocket dimension with barrels, bottle racks and his private stash.

Kiosks, portals and ships can't take you into these rooms; you have to use the doors.

**New things to build and use:**
* **Meeseeks Box** gadget (Schmeckles, key 4): a Meeseeks fights for you for 30 s. Everyone knows how.
* **Mega Seed Smarts** (4 Mega Seeds, at the garage): abilities recharge 30% faster and you hit 10% harder.
* **Citadel Cloak** (Schmeckles and plasma, at the Council of Ricks): monsters and turrets lose track of you when you stop fighting.

Rick, Morty and Evil Morty's daily lives now include Council meetings and Morty Daycare at the Citadel.

### Adding a dimension

1. Add an entry to `MM.DIMS` in `shared/world.js`: name, seed, gravity, colours, props, locals and monsters, material and loot.
2. Add new prop types to `MM.PROPS` and models to `MODELS` in `js/dims.js`; add locals to `MM.NPCS` and events to `MM.EVENTS`.
3. Optionally add landmarks (`MM.LANDMARKS`), daily tasks (`MM.TASKS`) and recipes (`MM.RECIPES`) in `shared/rules.js`.

The server, kiosk, portals, bots and journal pick it up automatically.

## Virtual reality

Play through a VR headset in a browser that supports WebXR: the **Meta Quest browser**, or Edge/Chrome on a PC with a headset connected (Quest Link, SteamVR or Windows Mixed Reality, which also covers the Windows launcher). When a headset is available, a goggles button appears in the top bar. Tap it to go in. You stand where your character stands, at your own height, and you see through their eyes.

| Controller | Action |
| --- | --- |
| Left stick | Walk where you look (real steps move you too) |
| Right stick left/right | Turn 30° |
| Right trigger | Fire (aim with the controller; a faint beam shows where) |
| Right grip | Talk to locals, do a daily task, go through doors, use the kiosk |
| A | Jump (hold to fly); respawn after dying |
| B | Ability |
| Right stick click | Grenade |
| X / Y | Choose a world for your portal gun |
| Left trigger | Open a portal there (or take the kiosk) |
| Left grip | Board or leave your ship |

Your gun is in your right hand. A panel on your left wrist shows the world you're in, your health, your materials, where your portal gun is set to, and any messages. The game needs a secure (https) address for VR: the online server on Render, or the `play/` folder of the releases repository served with GitHub Pages. The Android app is for phones; Android's in-app browser has no VR.

## Android app and Windows launcher (with automatic updates)

* **Android:** install `MultiverseMayhem.apk`. Allow installs from unknown sources the first time.
* **Windows:** run `MultiverseMayhem.exe`. It needs no installer and opens the game in its own window through Microsoft Edge, which every Windows 10 and 11 PC has. Windows SmartScreen may warn about an unknown publisher; choose **More info → Run anyway**.

Both download from the public releases repository, **Kratos5212/multiverse-mayhem-releases**. Every time they open, they read its `latest.json`:

* **A newer game build:** downloaded file by file, each checked against its SHA-256, and switched to straight away. Nothing to install, and your characters and progress are kept.
* **A newer Android app:** downloaded, and Android's installer opens (you confirm with one tap).
* **A newer Windows launcher:** downloaded in the background, and it takes over from the next start.
* **No connection:** you play the version you already have. Both apps carry a full copy of the game, so they work offline from the first start.

**Publishing an update** (with the releases repository cloned next to this one):

```
node scripts/release.js --push              # a new game build: most updates
node scripts/release.js --android --push    # also a new APK (when android/ changed)
node scripts/release.js --windows --push    # also a new launcher (when desktop/launcher changed)
```

Version numbers live in `version.json`. The APK is signed with the project key in `android/keystore/`. Keep that key: Android only installs an update over the app if it is signed with the same key. Building needs Node 18+, JDK 21 and the Android SDK for the APK, and Go for the launcher.

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
