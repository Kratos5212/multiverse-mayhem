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
| E | PORTAL | Travel: portal gun (own or borrowed), portal station, or your ship |
| F | TALK / USE | Talk to locals, daily tasks at buildings, doors, portal stations |
| J | Journal button | Your life, your path, errands |
| B | SHIP | Board or leave your ship (Space up, Shift down) |
| 1 2 3 4 5 | GADGET | Grenade, turret, shrink ray, Meeseeks Box, Time Crystal (Ricks and Evil Morty) |
| C | Build slot | Workbench |
| Enter | Chat button | Chat with the whole multiverse |
| Tab | Chart button | Leaderboard, players here, invite to your team, mute |
| V or mouse wheel | Eye button | Switch between first and third person |
| G |  | Wave |
| Esc | Menu button | Settings and leave |

**First person:** press **V**, scroll all the way in, tap the eye button, or pick it in the menu's settings. You see through your character's eyes, with your own arm, sleeve and gun (or fist) in front of you. In a ship you look out over the saucer's rim. When you die, the camera pulls back so you can see what happened. The choice is remembered.

## Free roam, not a battle royale

This is an open-world chaos game: wreck things, cause trouble, explore. **Fights are on by default**: players can hurt each other unless one of them turns **Fights** off in the settings (shots then pass straight through them). Bots and locals act by their lore: Gromflomite troopers hunt Ricks, bird people and Squanchies; Evil Morty hunts Ricks; Cronenbergs and Pickle Rick pick fights; Jerrys, Beanlings and Unity never start one. Peaceful characters run when hit; everyone else hits back. Monsters only go for you if you come within about 9 m or hit them, and they give up when you leave their patch. You start in your own world (Ricks and Mortys on Earth or at the Citadel, bird people in Featherhold, troopers at the Federation, and so on).

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

You never have to break out: you can play a normal life and still travel the way people do in the show (below). Your **journal (J)** shows your daily tasks, your next step, what each step unlocks, and your errands. Progress is saved per character.

## Crafting across dimensions

Every world has its own material: **Scrap** (everywhere), **Moon Crystals** (Lowgrav Moon), **Meat Goo** (Cronenberged Earth), **Neon Plasma** (Alien Bazaar), **Sky Feathers** (Bird World), **Schmeckles** (Citadel of Ricks) and **Mega Seeds** (Mega Seed World, rare). Gadgets can be built anywhere; big upgrades must be built at a particular station in a particular world, from materials gathered in others.

| What | Built at | Needs |
| --- | --- | --- |
| Gravity Grenade, Auto-Turret, Shrink Ray, Portal Fluid | Anywhere | Scrap, crystals |
| Bio-Armor I–III (+80 health) | Flesh Forge, Cronenberged Earth | Goo, crystals, plasma |
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

Every world has locals who walk around with names, faces and opinions: neighbours and students on Earth C-137, flesh monks in Cronenberged Earth, merchants and tourists in the Bazaar, miners on the moon, bird citizens in Bird World. Walk up and press **F** to talk. Anything can happen:

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
| Cronenberged Earth | Meat Rain, Blob Swarm |
| Bazaar | Flash Sale, Jelly Bloom |
| Moon | Meteor Shower, Crab Migration |
| Bird World | Molting Season, Serpent Hunt |
| Every other world | Jackpot, The Purge, Harvest Day, Squanch Party, Federation Patrol, Brute Stampede, Sugar Rush, Outbreak, Rush Hour, Raider Convoy, Power Surge, Unity Parade, Lockdown, The Big Grind |

## Dimensions

Every world is laid out like a real place (`shared/layouts.js`): roads and squares first, buildings lining the streets with their fronts to the road, lamps and benches along the sidewalks, fields and villages where they belong, and wild things only out in the countryside. Cronenberged Earth is the Smith neighbourhood after the love potion; the Bazaar is a ring of market streets; the Citadel is a white city of towers around a central square; Snowball's palace sits at the end of an avenue of dog statues.


| Dimension | Feel | Locals | Material | Landmarks |
| --- | --- | --- | --- | --- |
| Earth C-137 | Streets, houses, cars | Neighbours, students | Scrap | Smith House, Rick's Garage, Harry Herpson High, Horse Hospital, Unemployment Office, Ruben's tent (Anatomy Park), the chalk door (Froopyland) |
| Earth: Downtown | A city grid of towers, apartments and shops | Neighbours, police | Scrap | Merpal's Mall, Shoney's, Needful Things, Dr. Wong's office, the electronics store |
| Earth: Washington, D.C. | The National Mall with cherry trees and federal buildings | President Curtis, Secret Service, Marines | Schmeckles | The White House (and the Kennedy tunnels), Washington Monument, the Capitol, the Pentagon |
| Earth: Area 51 | Desert base with hangars, radar dishes and watchtowers | Marines, base scientists | Moon Crystal | The Sonic Stage (Get Schwifty), Hangar 18 |
| Fascist Earth | The Smith street under a regime: grey skies, banners, watchtowers | Fascist troopers (hostile), neighbours | Neon Plasma | Same buildings as home |
| Shrimp Earth | The Smith street, everyone evolved from shrimp | Shrimp people | Meat Goo | Same buildings as home |
| Teddy Earth | The Smith street, everyone a teddy bear | Teddy people | Sky Feather | Same buildings as home |
| Earth C-500A | Beth and Jerry never married; Jerry is a movie star | Neighbours, paparazzi | Schmeckles | Same buildings as home |
| Cronenberged Earth (Prime) | Flesh pillars, eye stalks, a giant eye in the sky | Flesh monks, meat blobs (hostile) | Meat Goo | Flesh Forge |
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
| **Beyond the Curve** | Golden paths through the void past the Curve's wall, universe orbs, the golden helix in the sky; *outside the Curve* | Free Mortys | Moon Crystal (and Mega Seeds) | Edge of the Curve |
| **Interdimensional Cable** | A commercial strip of stores and giant TVs; *outside the Curve* | Pitchmen from the ads | Schmeckles | Real Fake Doors, Ants in my Eyes Johnson's |
| **Hamster-in-Butt World** | A village of seated people who are also houses; *outside the Curve* | Hamsters | Sky Feather | |
| **Plumbubo Prime 51b** | The plumbus works: factory halls, production lines, fleeb vats; *outside the Curve* | Blamphs, plumbus workers | Meat Goo | Plumbus Production Line |

**One Earth, several places.** The Smith neighbourhood, Downtown, Washington, D.C. and Area 51 are the same planet: drive between them on the highways along the north edge of each (your team comes too), or hop between them in a ship. **The same Earth in other dimensions** (Fascist, Shrimp, Teddy, C-500A and the Cronenberged Prime Earth) has the same street plan and buildings with its own people; reach those by portal.

**TVs.** Earth TVs show normal Earth TV. Rick's own TV in the Smith house always has interdimensional cable, and a Rick can "fix" the TVs in the Downtown electronics store so they pick up every channel in the multiverse for a while.

**The Time Cops.** Ricks and Evil Morty can make a **Time Crystal** (key 5): it freezes everyone around you for 4 seconds. Third-dimensional beings aren't allowed to mess with time, so **Shleemypants**, a fourth-dimensional Time Cop, shows up a moment later to arrest you.

**Guards.** Police, the Secret Service and Marines protect people: hurt someone near them and they all come for you.

Every prop except the landmarks can be destroyed. Wrecking things and beating other players earns **chaos points** for the multiverse-wide leaderboard.

### Teams

Open the **Multiverse** board and press **Invite** next to anyone in your dimension (up to 8 per team). Teammates show a green ★ in their name tags and can't hurt each other. When one of you takes a door, a portal station or a ship, every teammate standing within about 14 m comes along (ship passengers ride with the pilot). Anyone can follow through an open portal anyway.

### Travel, the way the show does it

There is no public portal on Earth. To get around you need one of these:

* **A portal gun.** Ricks own one; Morty has a borrowed one with one charge; Evil Morty's is gold. Anyone else can borrow (steal) Rick's from the workbench in his garage (two jumps, no recharge), grab a charge from a gun owner they knock out, or build their own when their life path allows it.
* **Somebody else's portal.** Portals stay open for a while and anyone can walk through, so a team can follow whoever has the gun.
* **A portal station.** The Citadel's portal station (free for Ricks and Mortys, 3 Schmeckles for everyone else) and Interdimensional Customs at the Federation (free for troopers).
* **A ship.** Earth to the Moon is a short hop. Other planets in the same universe (Bird World, Gazorpazorp, Squanch, the Purge Planet, Unity's planet, Gear World, Blips and Chitz, the Bazaar, the Federation) need the Turbo Engine. Other dimensions need the Dimension Drive.
* **Doors.** The Microverse is inside the car battery in Rick's garage; Anatomy Park is inside Ruben, in a tent on Earth; Froopyland is behind Rick's chalk door. Only the doors go there.

Worlds **outside the Central Finite Curve** can only be reached with a gold portal: Evil Morty's gun, or a gun upgraded with **Golden Portal Fluid** at the garage.

The **portal gun, portal stations and ships** open a map of the **Central Finite Curve**: every world inside the curve, the odd one outside it, and how many players are in each. Tap a world to see it and go.


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

Portals, stations and ships can't take you into these rooms; you have to use the doors.

**New things to build and use:**
* **Meeseeks Box** gadget (Schmeckles, key 4): a Meeseeks fights for you for 30 s. Everyone knows how.
* **Mega Seed Smarts** (4 Mega Seeds, at the garage): abilities recharge 30% faster and you hit 10% harder.
* **Citadel Cloak** (Schmeckles and plasma, at the Council of Ricks): monsters and turrets lose track of you when you stop fighting.

Rick, Morty and Evil Morty's daily lives now include Council meetings and Morty Daycare at the Citadel.

### Inside the Smith house (built with Mojulo)

Walk up to the Smith House and press **F**, then **Go to Smith House**. The ground floor has the front hall, the living room (sit on the couch to watch interdimensional cable), the dining room (family dinner) and the kitchen. The rooms were laid out and furnished with [Mojulo](https://mojulo.com) from a floor plan, exported as glTF, and converted for the game:

```
node scripts/glb2mm.js model.glb assets/interiors/smith.mmg --scale 1.4 --origin 7.254,-5.547 --floor0
```

`scripts/glb2mm.js` merges a glTF into one compact mesh (quantised positions, normals and colours, about 600 KB here) that `js/mmg.js` loads and draws with the game's own cel shading. The Mojulo recipe is kept next to it (`assets/interiors/smith.recipe.json`), so the house can be rebuilt or changed with Mojulo and re-exported (use the unshaded `lit` export). Inside walls for collision are listed as segments on the dimension (`walls` in `shared/world.js`).

### Adding a dimension

1. Add an entry to `MM.DIMS` in `shared/world.js`: name, seed, gravity, colours, props, locals and monsters, material and loot.
2. Add new prop types to `MM.PROPS` and models to `MODELS` in `js/dims.js`; add locals to `MM.NPCS` and events to `MM.EVENTS`.
3. Optionally add landmarks (`MM.LANDMARKS`), daily tasks (`MM.TASKS`) and recipes (`MM.RECIPES`) in `shared/rules.js`.

The server, portals, bots and journal pick it up automatically.

## Virtual reality

Play through a VR headset in a browser that supports WebXR: the **Meta Quest browser**, or Edge/Chrome on a PC with a headset connected (Quest Link, SteamVR or Windows Mixed Reality, which also covers the Windows launcher). When a headset is available, a goggles button appears in the top bar. Tap it to go in. You stand where your character stands, at your own height, and you see through their eyes.

| Controller | Action |
| --- | --- |
| Left stick | Walk where you look (real steps move you too) |
| Right stick left/right | Turn 30° |
| Right trigger | Fire (aim with the controller; a faint beam shows where) |
| Right grip | Talk to locals, do a daily task, go through doors, use a portal station |
| A | Jump (hold to fly); respawn after dying |
| B | Ability |
| Right stick click | Grenade |
| X / Y | Choose a world for your portal gun |
| Left trigger | Travel there (portal gun, station or ship) |
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
