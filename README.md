# Multiverse Mayhem

Created by **Gabi** (Kratos5212).

An unofficial, free, non-commercial **Rick and Morty fan game** in 3D: be any Rick, Morty or anyone else, from any universe. Build your own variant, pick who you are in this universe, and live that life, or break out of it: craft across worlds, build a portal gun and a ship, talk to strange locals, and portal-hop across dimensions with everyone else online. It runs in the browser on PC and phones, with [three.js](https://threejs.org) for graphics and a small Node server for online play.

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
| Shift (hold) | Drag past the stick's edge | Sprint (faster; more with leg upgrades). In the ship: the afterburner |
| R or right click | PORTALS | Portal pair: shoot one end, then the other (portal gun owners) |
| I | Items | Inventory: curios, gadgets, collection |
| Mouse (click to capture) | Drag the right side | Look |
| Click | FIRE | Shoot or hit |
| Space | JUMP | Jump (hold to fly as a Birdfolk) |
| Q | SKILL | Archetype ability |
| E | PORTAL | Travel: portal gun (own or borrowed), portal station, or your ship |
| F | TALK / USE | Talk to locals, daily tasks at buildings, doors, portal stations |
| J | Journal button | Your life, your path, errands |
| B | SHIP | Board or leave your ship (Space up, Ctrl down, Shift boost; keep climbing for space) |
| L | LIGHT | Lightspeed, out in space: to another world, dimension or timeline |
| 1 2 3 4 5 6 7 | GADGET | Grenade, turret, shrink ray, Meeseeks Box, Time Crystal, freeze ray, Magic Chalk (the last two kinds: Ricks and Evil Morty) |
| 8 | Fist button | The Five-Step Death Punch (once Liu Sin in Downtown has taught you) |
| C | Build slot | Workbench |
| H | Garage console | Rick: "House, ..." (the defences of your own house, from anywhere near it) |
| Enter | Chat button | Chat with the whole multiverse |
| Tab | Chart button | Leaderboard, players here, invite to your team, mute |
| V or mouse wheel | Eye button | Switch between first and third person |
| G | EMOTE | Emotes: wave, dance, laugh, point, cheer, facepalm (then 1-6), or sit down (7) on the spot |
| Esc | Menu button | Settings and leave |

**Ctrl and the browser:** Ctrl is "down" in the ship. While you play, the game keeps Ctrl shortcuts (Ctrl+R, Ctrl+S, Ctrl+F...) from the browser; Ctrl+W asks before closing, and in **Full screen** (Esc menu) it is caught too. After you close a menu the mouse goes straight back to the game. **F** uses what you are looking at, so in the garage you get the workbench in front of you, not the garage.

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
| King Tommy | King of Froopyland | The Big Froopy Slide | Free at last | Lives in Froopyland and can only leave through a magic chalk door |
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

**Everyone flies their own ship**, and you sit at its controls:

| Character | Ship | Seats |
| --- | --- | --- |
| Rick, Pickle Rick | Rick's Space Cruiser (open-top, tail fins, beakers in the back) | 4 |
| Space Beth | Her dark-green gunship | 2 |
| Federation officer | A Federation cruiser | 4 |
| Evil Morty | A black ship with gold trim | 2 |
| Jerry | A beige minivan with two rockets bolted on | 6 |
| Summer | A pink hover-coupe | 2 |
| Morty | A small yellow pod, patched with tape | 2 |
| Beth | A flying horse ambulance | 3 |
| Everyone else | A flying saucer in your portal colour | 3 |

- **Passengers.** Walk up to someone's ship and press **F** to ask for a ride. A teammate just gets in; anyone else, the owner says yes or no. Passengers sit in their seats and go wherever the ship goes, other dimensions included. **B** or **F** hops out.
- **Parking.** Press **B** in the ship to get out: it stays parked where you left it, with whoever is still in it. **B** next to it gets you back in. From anywhere else, **B** calls it and it flies over to you.

**Keep Summer Safe** ("Mortynight Run"). It only happens when a Summer rides along in a Rick's ship and he parks and walks off. Offline, a Rick can take his Earth's Summer along: talk to her with the ship right there. Online, a Summer player gets in. Once Rick is about 12 m away, the ship guards her: it blasts monsters, and anyone with fights on who gets too close. A Summer player can tell it how:
- **Keep me safe:** any way it can.
- **Don't kill anyone:** it paralyses them instead.
- **Don't hurt anyone:** it gets creative.

It stands down when Rick comes back or Summer gets out.

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

Every world is laid out like a real place (`shared/layouts.js`): roads and squares first, buildings lining the streets with their fronts to the road, lamps and benches along the sidewalks, fields and villages where they belong, and wild things only out in the countryside. Cronenberged Earth is the whole of Earth after the love potion (the suburb, Downtown, D.C. and Area 51, in meat, its people Cronenbergs, the barbarian Summer, Beth and Jerry at the Smith house); the Bazaar is a ring of market streets; the Citadel is a white city of towers around a central square; Snowball's palace sits at the end of an avenue of dog statues.


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
| Anatomy Park | A big theme park inside Ruben, the naked Santa-looking giant floating over Earth | Park guests, staff, Dr. Xenon Bloom, Annie, Hepatitis C, Poncho | Meat Goo | Eleven rides, two shooting galleries, Liver Lake (boats and fishing), the Lung Trampolines, the Brain Zone, the Funny Bone comedy club, the Taste Bud food court, the Tapeworm Petting Zoo, the gift shop, the Uvula Bandstand |
| Pizza-Phone-Chair Dimension | Giant chairs, phones and pizza boxes; *outside the Central Finite Curve* | Pizza, phone and chair people | Scrap | |
| Post-Apocalyptic Earth | Desert wrecks, scrap towers, cacti, the Death Stalker camp | Raiders and Death Stalker cars (hostile), Death Stalkers, Hemorrhage, Strong-arm Morty, Post-Apocalyptic Summer | Scrap | The Ring of Death, Death Stalker cars |
| The Microverse | A tiny, hopeful civilisation inside Rick's car battery | Microversians | Moon Crystal | Gooble Box Power Plant |
| Unity's Planet | Tidy towers, everyone one mind | Unity | Moon Crystal | |
| Galactic Federation HQ | White towers, ships and a prison block | Federation guards (hostile), clerks | Schmeckles | |
| Planet Gear | Giant gears, pipes and brass houses | Gearpeople | Scrap | |
| Snake Planet | Jungle of snake huts, ferns and palms | Snakes; Snake Terminators from the future (hostile, during the war) | Meat Goo | The Snake Jazz Club |
| Giant World | A floor of cloud, giant mugs, boots and forks, beanstalks | Giants (three times your size) | Scrap | The Giants' Castle (court is in session) |
| Atlantis | Mr. Nimbus's sunken city: columns, coral, kelp, low gravity | Atlanteans, sea beasts (hostile) | Moon Crystal | Mr. Nimbus's Palace |
| The Dream World | Floating doors, melting clocks, stairs to nowhere | Dream figures, **Scary Terry** (hostile) | Neon Plasma | Dream High School |
| Earth C-137, split timeline | *Another time*: the Smith street after "A Rickle in Time"; the world stutters | Neighbours, Time Cops | Moon Crystal | The Time Rift |
| Earth, 65 million years ago | *Another time*: ferns, volcanoes, dinosaur eggs | Dinosaurs (kind, huge), raptors (hostile) | Meat Goo (and Mega Seeds) | The Dinosaur Council |
| Earth J19ζ7 | Doofus Rick's street: perfect lawns, flowers, everyone is nice | Neighbours | Schmeckles | Same buildings as home |
| The Story Train | A train of anthology stories run by the Story Lord ("Never Ricking Morty") | Passengers, the Story Lord (hostile) | Neon Plasma | The Story Engine |
| The Toxic Dimension | Where Rick and Morty's detox waste went: green sludge, barrels; *the air hurts* | Toxic Rick (hostile), raiders | Meat Goo | Rick's Detox Machine |
| Zigerion Simulation | A not-quite-convincing fake Earth inside a Zigerion scam ship | Simulated neighbours, Zigerions | Moon Crystal | Same buildings as home |
| **Beyond the Curve** | Golden paths through the void past the Curve's wall, universe orbs, the golden helix in the sky; *outside the Curve* | Free Mortys | Moon Crystal (and Mega Seeds) | Edge of the Curve |
| **Interdimensional Cable** | A commercial strip of stores and giant TVs; *outside the Curve* | Pitchmen from the ads | Schmeckles | Real Fake Doors, Ants in my Eyes Johnson's |
| **Hamster-in-Butt World** | A village of seated people who are also houses; *outside the Curve* | Hamsters | Sky Feather | |
| **Plumbubo Prime 51b** | The plumbus works: factory halls, production lines, fleeb vats; *outside the Curve* | Blamphs, plumbus workers | Meat Goo | Plumbus Production Line |

**One Earth.** The Smith neighbourhood, Downtown, Washington, D.C. and Area 51 are one 1.2 km world: the suburb in the middle, Downtown to the east, D.C. to the west and Area 51 to the north, joined by roads across rolling countryside. **Every Earth** (Fascist, Shrimp, Teddy, C-500A, the split timeline, Doofus Rick's, the Zigerion simulation and everyone's home Earth) is the whole planet too, with its own people and twist, and the same doors into the same insides.

**World rules.** Some worlds play differently: you swim in Atlantis, bounce in Froopyland (where nothing hurts much), fly in lucid moments in the Dream World, slowly heal standing on Cronenberged Earth's living flesh, and slowly get hurt by the Toxic Dimension's air unless your shield is up.

**Post-Apocalyptic Earth** ("Rickmancing the Stone"). In the middle of the Death Stalker camp is the **Ring of Death**: walk in through a gate, press **F** and fight three rounds on foot (two fighters, then three, then the champion) while the Death Stalkers cheer from the stands. Leave the Ring or go down and you lose; win and you get scrap, crystals and Schmeckles. One fighter at a time; everyone else watches. **Strong-arm Morty**, the Ring's own Morty with the giant arm he sewed on, hangs around the Ring, and **Post-Apocalyptic Summer** of the Death Stalkers by their garage (Hemorrhage, her husband, is there too). By the garage are **Death Stalker cars** with the keys in: press **F** to take one. **W/S** drive, **A/D** steer, **Shift** is the nitro, the guns on the hood fire where you aim, and running into people, monsters and junk at speed hurts them and throws them. In a car you take half damage; if it goes, it blows up with you. **B** or **F** gets you out; the car stays in that world when you travel. Raider gangs in their own cars roam the tracks: they spot another car from far off (someone on foot only up close), chase it, shoot and ram.

**Become Strong-arm Morty.** Play a Morty and talk to any Rick (in his garage, or wherever he is): he offers you the **Muscle Memory Serum**, a dead warrior's arm in a syringe. Take it and your right arm becomes hers, huge and with a mind of her own, and it stays that way until she is done with you. She does the punching (no gun: a big jab that knocks people back), drags you towards anyone hostile close by and swings at them on her own, and pulls you towards her bounty as you walk. Everyone sees the arm. In Post-Apocalyptic Earth she takes **bounties**, one at a time, far out in the sand (Tetanus Tom, Lady Lugnut, Scab Malone; a red BOUNTY tag over them, and the tracker shows how far and which way). Each one pays. The last is the man she wants dead, **Gorgut the Arm-Taker**, who cut her off the man she belonged to and killed his family. Only your kill counts. Once he's dead she goes quiet and shrinks back: it is just your arm again, and your gun is back. (In the show, Rick gives Morty a muscle-memory arm from a dead warrior, and it drags him off after its owner's killer; the names here are the game's own.)

**Something to do everywhere.** Every world has a landmark with something to do: the Festival Stage on Purge Planet, Squanchy's Party Hut, the Gazorpian Throne, the Big Froopy Slide, the Pizza-Phone-Chair Exchange, the Raiders' Garage, Unity's Hive Core, the Federation's Bureau of Forms, the Temple of the Great Gear, the Hamster Tubes, and more.

**Bigger worlds.** Open worlds run to 200 m from the middle in every direction, with more out in the wild to find.

**Curios and your inventory (I).** 44 odd things from the show lie around the worlds they belong to, each glowing in a column of light: Szechuan Sauce, Eyeholes, a plumbus, Death Crystals, Kalaxian Crystals, a love potion, Snake Jazz, Scary Terry's hat and more. Walk into one to pick it up. Many can be used from the inventory (healing, speed, a shield, a free portal charge, a vision of another life...), the rest are keepsakes. The collection log shows what you have found and hints where the rest are. The inventory also lists your gadgets, including the new **Freeze Ray Shot** (key 6), which freezes whoever it hits.

**TVs.** Earth TVs show normal Earth TV. Rick's own TV in the Smith house always has interdimensional cable, and a Rick can "fix" the TVs in the Downtown electronics store so they pick up every channel in the multiverse for a while.

**The Time Cops.** Ricks and Evil Morty can make a **Time Crystal** (key 5): it freezes everyone around you for 4 seconds. Third-dimensional beings aren't allowed to mess with time, so **Shleemypants**, a fourth-dimensional Time Cop, shows up a moment later to arrest you.

**Guards.** Police, the Secret Service and Marines protect people: hurt someone near them and they all come for you.

Every prop except the landmarks can be destroyed. Wrecking things and beating other players earns **chaos points** for the multiverse-wide leaderboard.

### Your home dimension

The **home dimension** you type on the character screen (Y-231, J-19...) is a real place. Every code is its own alternate Earth with the Smith street plan and its own twist from the show: a fascist one, shrimp or teddy or cat people, robots, aliens keeping humans as pets, candy, jungle, an Earth where the sun went out, the pizza-and-furniture one, a wasteland, or a dog-ruled one. The same code is always the same place, for everyone. Ricks, Mortys, Summers, Beths, Jerrys and Evil Mortys start in their own Earth; **C-137** is the show's Earth.  Home dimensions show up in the travel menu under Earth's dimensions: yours (marked ★), and those of everyone online.

### Between players: trading, gifts, using things on each other

Walk up to another player and press **F**: trade, give, invite them to your team, or use something on them.

- **Trade:** both of you put things in (materials, Schmeckles, gadgets, curios) and both press OK. Nothing changes hands until then, and changing your side takes both OKs back. Walking apart calls it off.
- **Give:** it's theirs straight away.
- **Use something on them:**
  - A snack or a shield for a friend just happens.
  - Something nasty (Kalaxian crystals) needs both of you to have fights on.
  - A transformation needs them to say yes. That includes a Rick giving a Morty the **Muscle Memory Serum**, which Ricks now make at their workbench.

**Tiny.** Build a **Miniaturizer** at Rick's workbench (anyone can) and use it to shrink to the size of a bug. Everything is huge, and you are slow and hit softly. Use it again to grow back, or use it on a friend who lets you.

Tiny, you fit into the **Mega Gargantuans'** land: a whole civilisation on a mossy rock in the woods east of the suburb, on every Earth ("The Rickchurian Mortydate"). Inside you're their size. There's a proud little city with domes and towers, giant leaves, pebbles and mushrooms, ants the size of cars, and the Great Hall, where you can sign a peace treaty. Walk out and you're tiny again.

### From the episodes (batch 2)

- **Giant Baby!** An event out in space: a baby the size of a skyscraper floats in among the planets and goes after the ships, swatting them. Take it down with your ship lasers and everyone there is paid (20 Schmeckles, 2 Mega Seeds, 6 crystals).
- **The house gets hacked** ("A Ricker Runs Through It"). A world event on every Earth: the Smith house's lawn turrets and drones turn on everyone, family included. Smash them all and everyone there gets paid. Or a Rick who may use the house console reboots it.
- **Love Potion Outbreak** ("Rick Potion #9"). One player is Patient Zero and every lovestruck local comes for them. Their hugs don't hurt, but they hold on. A minute later the cure turns them into mantis people, who go for everyone. A minute after that, Cronenbergs.
- **Tiny Rick** ("Big Trouble in Little Sanchez"). A Rick climbs into the teenage clone vat in the secret lab and comes out Tiny Rick: smaller, faster and bouncier. Now and then the old Rick whispers *let me out* from inside. Talk to the gym coach at Harry Herpson High as Tiny Rick and **Coach Feratu** shows what he is. Use the vat again to go back.
- **The Immortality Field Resort** ("The Whirly Dirly Conspiracy"). A holiday world under a glassy dome where nothing can die: you just pop back together. Outside the dome, death works normally. The **Whirly Dirly** coaster loops out past the edge for a few seconds. Out there you're mortal, and sometimes a bolt comes loose. The hotel has a spa and a roof to jump off.
- **Space Beth** is playable ("Star Mort Rickturn of the Jerri"). She's a freedom fighter from the Alien Bazaar with her own ship from the start, a rifle and a war with the Federation: smuggling, sabotage at the Bureau of Forms, and Federation Guards to take down. Her Grapple Strike slams down on everyone around her.
- **The Five-Step Death Punch** ("Rick Fu Hustle"). Liu Sin, in Downtown, teaches it for 25 Schmeckles. Press **8** (or the fist button) right next to someone. Five steps **forward** and they drop. Walking backwards (or sideways) is safe: the punched player keeps facing ahead, so **S** walks them backwards. It lasts until a Rick reverses it. Talk to a local Rick, or a Rick player picks "Reverse their death punch" from your player menu. A Rick can also walk back to his own garage and fix himself. It works on locals too (they walk forwards, so they drop), and on players when you both have fights on.

### Teams

Open the **Multiverse** board and press **Invite** next to anyone in your dimension (up to 8 per team). Teammates show a green ★ in their name tags and can't hurt each other. When one of you takes a door, a portal station or a ship, every teammate standing within about 14 m comes along (ship passengers ride with the pilot). Anyone can follow through an open portal anyway.

### The cast: everyone exists once

Every dimension has its own people (`shared/cast.js`): each Earth its own Rick, Morty, Summer, Beth and Jerry (Earth C-137 also Mr. Poopybutthole), in that Earth's look (shrimp Smiths on Shrimp Earth, barbarians on Cronenberged Earth, where only Summer, Beth and Jerry are left); Bird World its Birdperson, Planet Squanch its Squanchy, the Federation its officer, Unity's planet Unity, the Citadel Evil Morty, and Froopyland King Tommy. Until someone plays them, they live their lives as locals with their own name tags and lines, and the ones who can travel do: Ricks and Evil Morty open portals in their own colours (green; Evil Morty's gold) and step through, Morty tagging along with his Rick, and anyone can follow them; Federation officers take off in their ships, and Birdperson flies.

**You take one over.** Pick a character and a home code and you are that dimension's one: Rick C-137, Beth SH-1, the Birdperson of Bird World. Someone already playing them? You play one of their **clones** (a little weaker, out of the lab under that Earth's garage), or, if you set **If taken: Another dimension** on the start screen, the same character from another dimension. When you leave, your character carries on without you.

**King Tommy** (Beth's childhood friend, lost in Froopyland) cannot leave Froopyland: no portal or door lets him out, except a **magic chalk** door. Only Ricks and Evil Morty know how to make Magic Chalk (key 7): draw a door anywhere into Froopyland, or there, back out; anyone can go through it. Evil Morty can build anything a Rick can (not a Rick's own body upgrades); everyone else only what their life teaches them.

### The vat of acid

In Downtown, the crime lords' warehouse has the vat of acid from "The Vat of Acid Episode". Hide in it (it is not acid; Rick throws fake bones in after you) and nobody can find you for a while.

### Beaches and Atlantis

South of every Earth's towns there is a sandy **beach** and the sea. Swim out and dive, and you are in that Earth's own **Atlantis** (C-137's, Shrimp Earth's, your home Earth's...), each with its own **Mr. Nimbus** at his palace. Swim up to the surface to get back to the same beach.

### Worlds, dimensions and timelines

The multiverse has three layers, and they are different things:

* **Worlds** are places: Earth, the Moon, Bird World, Gazorpazorp, Planet Squanch, the Citadel, Snake Planet, Atlantis, the Dream World, the planets of the solar system and the rest (33 of them).
* **Dimensions** are parallel versions of a world. Earth's include Earth C-137, Fascist Earth, Shrimp Earth, Teddy Earth, C-500A (Beth and Jerry never married, so there is no Morty or Summer: Beth is a heart surgeon, Jerry a movie star), Doofus Rick's Earth, Cronenberged Earth, the wasteland, Snowball's dog world, the pizza-and-furniture one, the Zigerion simulation, and everyone's home Earth. Every other world has **three** parallel dimensions, picked for that world from eleven kinds: mirror, ice age, dark, jungle, cat, toy, neon, Wild West, pickle, gold and fungus (Bird World in neon, the Moon in the Wild West or made of gold, Gazorpazorp full of pickle people, Unity's planet under giant mushrooms...). Each kind has its own look, locals and a place with something to do: the Great Mirror, ice fishing on the Frozen Lake, relighting the Last Lighthouse, the Overgrown Temple, a nap at the Great Scratching Post, winding up the Giant Toy Box, neon pinball at the Neon Arcade, the Saloon, a dip in the Giant Pickle Jar, diving into the Golden Vault, the Spore Ring.
* **Cronenbergs happened once.** Cronenberged Earth is the only Cronenberg dimension: the one from "Rick Potion #9". It has one other timeline, the **cured timeline**, where Rick's cure worked backwards: the planet is still flesh, teeth and eyeballs, but every Cronenberg turned back into a perfectly normal person, mowing lawns of meat.
* **One of a kind:** the Citadel, Blips and Chitz, the Dream World, the Story Train, Interdimensional Cable and Beyond the Curve exist once in the whole multiverse, so they have no parallels.
* **Timelines** are other times of one dimension: Earth C-137 65 million years ago, the split timeline from "A Rickle in Time", and Earth under the Federation; the Citadel under President Morty; Bird World after the wedding.

### Travel, the way the show does it

There is no public portal on Earth. To get around you need one of these:

* **A portal gun.** Ricks own one; Morty has a borrowed one with one charge; Evil Morty's is gold. Anyone else can borrow (steal) Rick's from the workbench in his garage (two jumps, no recharge), grab a charge from a gun owner they knock out, or build their own when their life path allows it. A portal goes to any world, dimension or timeline.
* **Somebody else's portal.** Portals stay open for a while and anyone can walk through, so a team can follow whoever has the gun.
* **A portal station.** The Citadel's portal station (free for Ricks and Mortys, 3 Schmeckles for everyone else) and Interdimensional Customs at the Federation (free for troopers).
* **Your ship.** Fly anywhere on a world (Earth is one big world: the suburb, Downtown, D.C. and Area 51). To leave it, fly **straight up**: at 250 m you leave the atmosphere and are in space, with your planet below and the other worlds of your universe all around it. Above every Earth: the Moon, the **solar system** (the Sun far off, then Mercury, Venus, Mars, Jupiter, Saturn with its rings and its moon Titan, Uranus, Neptune and Pluto) and, further across the galaxy, Bird World, Gazorpazorp, Squanch, the Purge Planet, Unity's planet, Planet Gear, the Bazaar, the Federation, Snake Planet and the rest. Each kind of parallel dimension is a universe of its own (fly up from Bird World in the ice age and you see the ice-age Gazorpazorp and Planet Gear). Floating high over Earth (you can see him from the ground) is **Anatomy Park**: Ruben, a huge, round, naked old man with a white beard who looks exactly like Santa (he kept the hat), floating face down towards Earth with his eyes closed. Fly your ship into any of his holes (the mouth through his beard, the nostrils, the ears, the nipples, the belly button or the back door) to enter the park at that hole's gate. Atlantis is under the sea, not a planet: fly up from it and you are over its Earth. Realms (a dream, the Story Train, beyond the Curve) have no sky to fly out of. Fly into a planet to land on it: the Moon and the solar system need only the ship, the rest of the galaxy the Turbo Engine.
* **Lightspeed.** Out in space, press **L** (or **LIGHT** on a phone) and pick where to go: the stars streak, and you come out in space by that world, dimension or timeline with its planet dead ahead. Another dimension needs the **Dimension Drive**, another timeline the **Quantum Drive**.
* **Doors.** The Microverse is inside the car battery in Rick's garage; Anatomy Park is inside the corpse floating over Earth (see above), and its gates take you back out to your ship; Froopyland is behind Rick's chalk door. Only the doors go there.

**The portal pair** (R or right click, for anyone with a portal gun): a short-range mode like Valve's Portal, with the same portals as for other worlds (same size, swirl and colours). Shoot one end onto a floor, wall, roof or cliff, then the other, or into thin air; walk in one and come out the other at the same speed. Anyone can use anyone's pair. Both ends take your **portal colours** (green for Rick, as in the show): pick the colour, the second end's colour and the style (swirl, ring, spiral, static) in the character creator's **Portals** tab.

Worlds **outside the Central Finite Curve** can only be reached with a gold portal: Evil Morty's gun, or a gun upgraded with **Golden Portal Fluid** at the garage.

**The travel menu** (portal gun, station, ship or lightspeed) is laid out the same way: pick a **world**, see its **dimensions** as cards (in their own colours, with who is there, or why you can't go that way), and the **timelines** of each dimension as chips under its card. It shows where you are now (world › dimension › timeline). Search finds anything by name or code; **Recent** and the old **Central Finite Curve** map are a tab away.

### The solar system

From "Something Ricked This Way Comes" and "A Rick in King Mortur's Mort": **Pluto** (four billion Plutonians, yellow in front and orange behind, King Flippy Nips in his pyramid palace, his son Scroopy Noopers, the plutonium mine that is shrinking the planet), **Mars** (the one-armed Marquis of Mars in his keep), **Venus** (the Viscounts of Venus and Viscount Lithdor, under a yellow sky), **Mercury** (riders on horseback), **Jupiter** (the Jovians' cloud fort over the Great Red Spot), **Saturn** (all the rings, and Saturnians who won't stop saying so), **Titan** (the Warlord of Titan, who is not friendly), **Uranus** (nobody), **Neptune** (Neptune himself) and **the Sun** (the Knights of the Sun and their King, on a walkway over the fire; it burns you unless your shield is up). On the Moon: the Apollo site and Gordon Lunas, the man on the moon. Each has its own curios and something to do.

### Rick's garage (and what's under it)

Rick's garage stands open on the street, on every Earth, on the left of the Smith house as you face it: walk straight in under the rolled-up door (no loading, no separate room). Inside:

* **Rick's workbench**, with the portal gun on it. It counts as the garage station, so you can build there.
* The **Space Cruiser** parked inside, shelves of glowing jars, a weapon rack, beakers and a toolchest.
* A **Plumbus**: anyone can make one.
* The **Meeseeks Box**: press it and a Mr. Meeseeks pops out to help you.
* The **microverse battery**, charging the car. Go in: in the Microverse, the scientist **Zeep Xanflorp** has a battery of his own (the **Miniverse**), and in there **Kyle** has his (the **Teenyverse**, jungle and treehouses). Each battery's exit takes you back up one level.
* The **Butter Robot**. It talks.
* A **trapdoor** down to the **secret underground lab**: clone tanks, a giant computer, a machine, and the **Mind Blowers** cabinet.
* A **door to Rick's wine cellar**, a pocket dimension with barrels, bottle racks and his private stash.

Portals, stations and ships can't take you into the lab or the cellar; you have to use the doors, and coming back up you are in the same garage on the Earth you came from.

**The sublevels.** In the lab, Rick's elevator goes down: **B1** clone bodies (Operation Phoenix) and walls of weapons, **B2** the Killer Plant Lab (and the Phantom Zone), **B3** the Globaflyn Prison, **B7** the Valuables Vault with Memory Diane's ant-farm brain, **B10** the Rick Prime room, **B15** Jiro's sushi restaurant, **B17** the prison of dead prisoners and the landline portals. Each has something to do.

**Whose it is.** Every Earth's house is its own Rick's (C-137's is Rick C-137's, your home Earth's is your Rick's). Only he goes down to the lab and uses the house. Anyone else is turned away; another Rick can **hack** the hatch or the console (stand there 8 seconds) and then has ten minutes. Building at the workbench stays open to every Rick at every garage.

**House defences** (the console on the garage wall, or **H** anywhere near your own house, "House, ..."): a **forcefield** dome over the house, garage and yard; **blast doors** on every door and window; **turrets** on the roof and a laser turret over the front door; the **large energy weapon**; the garage **laser grid**; **kill bots**; **boombox drones** that shout your words at intruders; **carnivorous plants** from B2; a **hologram** of you that monsters go for; a **fungus clone** that copies your voice (destroy it within 45 seconds, or it starts eating the world); the **cloning vat** (a backup body: next time you die you wake up in the garage); the washing machine's **hidden gun stash**; the **vehicle trapdoor** (your ship rises out of the garage floor with you in it); the **retractable lab**; the **large teleporter** (Downtown, D.C., Area 51, the beach); and the **retractable wardrobe** (change what you wear). Each Earth's house answers to its own Rick only: press **F** at the console and the menu opens. Any other Rick, his own clones included, has to hack the console first (stand at it for 8 seconds: ten minutes of access).

**New things to build and use:**
* **Meeseeks Box** gadget (Schmeckles, key 4): a Meeseeks fights for you for 30 s. Everyone knows how.
* **Mega Seed Smarts** (4 Mega Seeds, at the garage): abilities recharge 30% faster and you hit 10% harder.
* **Citadel Cloak** (Schmeckles and plasma, at the Council of Ricks): monsters and turrets lose track of you when you stop fighting.

Rick, Morty and Evil Morty's daily lives now include Council meetings and Morty Daycare at the Citadel.

### The Smith house (built with Mojulo)

**Outside:** a two-storey house with cream siding, a brown roof and a porch with white columns, Rick's garage on its left, and behind both a walled **back yard**: a grey brick wall, Rick's white shed with its brown roof, a big tree, and under it the **two graves** where Rick and Morty buried the Rick and Morty of this Earth after leaving Cronenberged Earth ("Rick Potion #9"). The graves are only on Earth C-137 and the C-137s that came after it (the split timeline, the Federation's Earth, the Zigerion simulation): every other Earth still has its own Rick and Morty, and on Cronenberged Earth, its cure and 65 million years ago it never happened. There are three doors: the front door, the **back door** into the kitchen from the yard, and a **side door** into Rick's room facing the garage.

**Inside, two floors** of the same 44 × 32 ft footprint (about 19 × 14 m):
* **Downstairs:** the front hall with the stairs, the living room (the couch and interdimensional cable), the dining room (family dinner), the kitchen (raid the fridge) and **Rick's room** (look under his bed).
* **Upstairs:** **Morty's room** (do his homework), **Summer's room** (her phone), **Beth and Jerry's room** with their own **bathroom** through the door, and the **bathroom** (take a shower).
* **Off Rick's room:** the **holodeck**, a black room with a yellow grid; run a simulation.
* **In the yard:** the **swimming pool** (new this season, cleaned by Jerry's cheap Pool Bot), and the shed is **Jerry's man cave** (the couch, the TV, the Titanic poster, the Lovefinderrz desk).

You walk up and down the stairs; walls only stop you on their own floor, the camera stays on your floor, and downstairs you see the rooms with the upper floor lifted off. Spots upstairs only work upstairs. Each floor is a [Mojulo](https://mojulo.com) floor plan, exported as glTF and converted for the game; the upstairs gets its stairwell cut out:

```
node scripts/glb2mm.js down.glb assets/interiors/smith.mmg --scale 1.4 --origin 9.388,-6.828 --floor0
node scripts/glb2mm.js up.glb assets/interiors/smith2.mmg --scale 1.4 --origin 9.388,-6.828 --floor0 --no-footing --hole 0.86,-7,2.55,0.2
```

`scripts/glb2mm.js` merges a glTF into one compact mesh (quantised positions, normals and colours) that `js/mmg.js` loads and draws with the game's own cel shading. The Mojulo recipes are kept next to them (`assets/interiors/smith.recipe.json`, `smith2.recipe.json`). The plans, walls, floors and stairs are in `shared/interiors.js` and `shared/world.js` (`floors`).

### More insides (Mojulo floor plans)

Harry Herpson High, the Horse Hospital, Merpal's Mall, Shoney's, the White House and the Unemployment Office can be walked into as well (F at the building, then **Go to ...**). Each is one floor plan in `shared/interiors.js`, used twice: Mojulo builds the furnished rooms from it (the recipes are in `assets/interiors/*.recipe.json`), and the game reads the same plan for the inside walls, bounds, the way in and out, and the spots to do things. Inside: Mr. Goldenfold's classroom, the principal's office and the cafeteria; the operating theatre and the horse ward; the mall concourse, food court and mattress store; a booth and the breakfast bar at Shoney's; the Oval Office (with President Curtis), the Cabinet Room and the press room; the job counter and the waiting room.

**Every other building you can do things at has an inside too**, drawn in the game from a floor plan (no download): the Forge, the Bazaar shipyard and black market, the Moon refinery, the Aerie, the Council of Ricks chamber, Morty Daycare, Snowball's palace, Needful Things, Dr. Wong's office, the TV store, the Capitol, the Pentagon, the snake jazz club, the giants' castle, Mr. Nimbus's palace, the Squanch club, the raiders' garage, the Federation forms office, the Gear temple, Hangar 18 (with the saucer under a tarp), Real Fake Doors, Ants in my Eyes Johnson's, the plumbus factory, the dream school, the Gazorpian throne room and the dinosaur council. Each has its own look, the thing it is about (a furnace, the council's ring table, a throne, a wall of TVs...), furniture and people; what you do outside works inside too, and every room has something of its own to do.

Buildings outside collide as their real footprint (a turned box) instead of a circle, for players, locals and the camera, and Rick's open garage and the back yard collide as their walls.

### Things to do: rides, games and hanging out

Worlds are for hanging out in, so there is plenty to do besides fighting (`shared/fun.js`).

* **Rides.** Real rides with trains that leave on a timetable everyone shares, so friends ride together and others watch you go by: Anatomy Park's Pirates of the Pancreas (a boat), Spleen Mountain (a coaster), Bladder Falls (a flume), the Colon Express, the Heart Wheel, the Bronchial Tubes slide, the Cerebral Cortex Coaster, the Liver Lake Paddle Boats, the Small Intestine Rapids, the Kidney Stone Drop and the Eyeball Wheel; the Big Froopy Slide in Froopyland; the Citadel Monorail; the Great Gear Wheel on Planet Gear; and the Beach Wheel on the pier of every Earth. Walk to a ride's gate and press **F**: you take the next seat. Your first ride on each pays 3 Schmeckles.
* **Shooting galleries.** The Hepatitis A Blaster (Anatomy Park), the beach booth on Earth, the Federation's target range, Blips and Chitz Blaster and the Purge Night booth: 30 seconds, moving targets, a high score.
* **Mini-games.** Fishing off the Earth pier, on the Frozen Lake (ice age) or in the Teenyverse's river pool; dance-offs (hit the arrows to the beat, and the crowd judges you) at the Sonic Stage in Area 51 (judged by the Cromulons), Squanchy's Party Hut, the Purge festival stage, the Uvula Bandstand and the Blips and Chitz dance machine; and Roy: A Life Well Lived at Blips and Chitz.
* **Jump pads** fling you across Anatomy Park, Froopyland, the Moon and Planet Gear.
* **Emotes and sitting.** **G** opens the emote bar: wave, dance, laugh, point, cheer, facepalm, or sit down on the spot.
* **The passport.** Every dimension you visit stamps your passport (the Journal shows it). At 5, 10, 20, 40 and 80 stamps you earn a title and a reward, from Tourist to Interdimensional Legend. The Journal's fun log keeps your rides, best scores and fish.

### Easter eggs

22 things from the show are hidden around the multiverse, each worth 3 Schmeckles the first time; the Journal counts how many you have found:

* **Things to find:** Pencilvester in the Smith house, a packet of Szechuan Sauce on Earth, the "Hungry for Apples?" billboard, Ball Fondlers on a TV in Interdimensional Cable, and Morty's Mind Blowers in Rick's lab.
* **People to meet:** Krombopulos Michael, Noob-Noob, Lizard Morty, Revolio "Gearhead" Clockberg Jr., Tammy, Jessica, Glootie, Shrimply Pibbles, the Eyeholes Man and Gazorpazorpfield, each where you would expect them. Talk to them.
* **Things to say in chat:** some lines from the show do something. Try *Wubba lubba dub dub*, *Show me what you got*, *I'm Pickle Rick!*, *I'm Mr. Meeseeks, look at me!*, *Get Schwifty*, *What is a plumbus?* and *Riggity riggity wrecked, son*.

### Ring races

Glowing rings make race courses; go through the first one to start the clock, then every ring in order. The **Sky ring race** (by ship, over the suburb and Downtown), the **Street sprint** (on foot, round the block), the **Moon slalom** (by ship, in space round the Moon), the **low-gravity hop course** on the Moon and the **Froopy bounce course** in Froopyland. Finish in time for a prize (once every two minutes); your best time is kept. The Earth races run on every Earth (`shared/races.js`).

### Sculpted characters

`scripts/sculpt.js` is a small sculpting tool for characters: a model (see `scripts/models/rick.js`) is soft shapes (ellipsoids, capsules, cones, rounded boxes) blended, carved and painted, turned into a smooth mesh and simplified, one mesh per body part around the game's skeleton, so the character still walks, aims and ragdolls. Small details (eyes, brows, mouth) are their own sharp pieces. Rick is the first: about 16,000 triangles.

    node scripts/sculpt.js scripts/models/rick.js assets/characters/rick.mms

Canon-looking characters use their sculpt up close; customised looks and far-away characters keep the built model.

The rest of the cast is sculpted with [Mojulo](https://mojulo.com): Morty, Evil Morty, Summer, Beth, Jerry, Unity, Mr. Poopybutthole, Mr. Meeseeks, Squanchy, Birdperson, the Gromflomite trooper and King Tommy. Each one is a model in `scripts/models/` built from the shared parts in `scripts/models/kit.js` (head with eyes, brows, nose, ears and mouth; torso with shirt, collar and belt; sleeved arms and hands; legs and shoes). `scripts/mojulo-character.js` turns a model into a Mojulo workbench recipe (one field solid per body part and colour), and turns Mojulo's glTF export back into the game's per-part sculpt:

    node scripts/mojulo-character.js spec scripts/models/morty.js morty.json      # the recipe to mint in Mojulo
    node scripts/mojulo-character.js mms scripts/models/morty.js model.glb assets/characters/morty.mms
    node scripts/mojulo-character.js preview scripts/models/morty.js out.mms     # a quick local build, no Mojulo

Each sculpt is about 11,000 triangles. Pickle Rick and the Cronenberg mutant keep their built models.

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

## Living worlds, and the look

Birds wheel over every open world (always flying head first), fish swim in the sea (and all around you in Atlantis and on Neptune), deer, rabbits, squirrels and foxes live in the woods between Earth's towns (little critters in the thickets of other worlds), never in a town or on a road, and run when you come close, and cars drive Earth's roads, keeping right and stopping for you. The roads between Earth's towns and down to the beach wind through the hills, with lane markings and power lines along them. All of it is scenery each player's game draws for itself.

The game looks **realistic** by default: lit surfaces, filmic colour, soft sun shadows around you on high quality, and thinner ink lines. The flat **cartoon** look (cel shading, thick outlines) is a choice in the menu's settings (**Look**), and applies on the next load.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page, styles and HTML layers |
| `shared/rules.js` | Archetypes, weapons, gadgets, look options and sanitizers |
| `shared/world.js` | Worlds, dimensions and timelines, terrain, props (generated from seeds, identical everywhere) |
| `shared/interiors.js` | The insides of buildings: floor plans, walls, spots, the Smith house's two floors |
| `shared/races.js` | Ring race courses |
| `shared/cast.js` | The cast: who lives in each dimension |
| `shared/house.js` | The Smith house's defences, and whose house it is |
| `shared/fun.js` | Rides and their timetables, shooting galleries, mini-games, jump pads, the passport, easter eggs, and Anatomy Park's corpse |
| `shared/protocol.js` | Every message a client may send, and the rate limits |
| `sim/host.js` | The authoritative game host (runs on the server, and in the browser when offline) |
| `sim/bot.js` | Bots that play through the same protocol as people |
| `js/rides.js`, `js/minigames.js` | Rides (tracks, trains, wheels) and the easter eggs' models; fishing, dancing and Roy |
| `js/` | The client: rendering (realistic or cartoon), characters, dimensions, life (`js/life.js`: birds, fish, animals, traffic), effects, sound, UI and game loop |
| `server/server.js` | Web and WebSocket server with connection limits and security headers |
| `test/` | `npm test` |
| `scripts/loadtest.js` | Connects N bots over real WebSockets to measure a server |
| `PROTOCOL.md` | The network protocol and everything that keeps the game safe |

## Credits

three.js is MIT-licensed (`vendor/three.LICENSE`). The Fredoka font loads from Google Fonts (SIL Open Font License). Everything else, including all sounds (synthesized live in the browser), is made in this repository.
