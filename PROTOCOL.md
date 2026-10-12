# Multiverse Mayhem: network protocol and safety

This covers how the game talks over the network and what keeps it safe for players and for the server.

## The big picture

```
 Browser / phone                         Server (server/server.js)
 ┌──────────────────┐   WebSocket /ws    ┌────────────────────────────────────┐
 │ js/game.js       │ ─ intentions ───▶  │ protocol check  (shared/protocol.js)│
 │ (draws, predicts │                    │ rate limits     (per message type)  │
 │  your movement)  │ ◀─ world state ─── │ host            (sim/host.js)       │
 └──────────────────┘   JSON text        │  - dimensions, copies of 64 players │
                                         │  - health, damage, items, portals   │
                                         └────────────────────────────────────┘
```

* **The server is the authority.** Clients send *what they want to do* ("fire in this direction", "craft a turret", "open a portal to the moon"). The server decides whether it happens and what the result is. Health, damage, kills, inventory, crafting, cooldowns, portal charges, pickups and who is in which dimension live only on the server.
* **Movement is client-predicted, server-checked.** Your own client moves you instantly, so the game feels responsive on any connection. It reports its position 15 times a second, and the server checks every report against your archetype's top speed, jump height and the dimension's gravity. A position that is too far, too fast or too high is refused, and the client is snapped back.
* **One code base, two transports.** `sim/host.js` has no networking of its own. Online, `server/server.js` plugs it into WebSockets. Offline, the browser runs the very same host in memory with bots. Both modes run identical rules.
* **Dimensions and copies.** Each dimension holds up to **64 players** (`INSTANCE_CAP`, up to 128). When a dimension is full, the server opens a fresh copy, and players are put into the first copy with room. Chat and the leaderboard span the whole server, so everyone online can talk to everyone.

## Timing

| What | Rate |
| --- | --- |
| Server simulation | 30 ticks per second |
| World snapshots to each player | 15 per second (one shared, pre-serialized message per dimension copy) |
| Events (shots, hits, explosions, joins…) | Batched once per tick |
| Your position to the server | 15 per second |
| Population and leaderboard | Every 5 seconds |

Clients draw other players 120 ms in the past and interpolate between snapshots, which hides network jitter.

## Messages: client → server

Every message is a JSON object with a `t` (type) field. Anything that is not on this list, has a wrong type, is out of range or is larger than **2 KB** is dropped (`shared/protocol.js`).

| `t` | Fields | Meaning |
| --- | --- | --- |
| `hello` | `v`, `name`, `home`, `look`, `arch`, `dim` | First message: protocol version, name, home dimension code, appearance, archetype, starting dimension |
| `st` | `x`, `y`, `z`, `r`, `a`, `ep` | Where I am, which way I face, my animation, and my travel epoch |
| `f` | `dx`, `dy`, `dz` | Fire my weapon along this unit vector |
| `ab` | | Use my archetype ability |
| `po` | `d` | Open a portal to dimension `d` (needs a portal gun charge or a borrowed charge; outside the Curve needs a gold gun) |
| `ki` | `d` | Use the portal station to go to `d` (must be standing at it; only the Citadel and the Federation have one; the fee is paid in materials) |
| `cr` | `g` | Craft gadget `g` |
| `g` | `g`, `dx`, `dy`, `dz` | Use gadget `g` (grenade, turret, shrink ray) |
| `c` | `text` | Chat (sent to everyone on the server) |
| `em` | `e` | Emote |
| `rs` | | Respawn (after the timer) |
| `pi` | `c` | Ping |
| `use` | `l`, `task` | Do a daily task at landmark `l` (must be standing there; cooldown) |
| `talk` | `n` | Talk to local `n` (must be within 5 m) |
| `ans` | `a` | Accept (1) or refuse (0) a local's trade offer |
| `ship` | `on` | Board or leave your ship (must own one) |
| `drive` | `d` | Fly your ship to `d` (Moon from Earth: any ship; other planets in the universe: Turbo Engine; other dimensions: Dimension Drive; 15 s cooldown) |
| `pvp` | `on` | Turn fights with other players on or off (on by default; both players must have them on; `hello` carries the starting value) |

`hello` also carries `tok`, the random save token this browser was given (see **Saved progress**).

**The travel epoch (`ep`).** Every time the server moves you (portal, station, door, respawn, snap-back), it increments your epoch. Position reports carrying an old epoch are ignored. This avoids the classic bug where a late packet from your old position pulls you back after a teleport.

## Messages: server → client

| `t` | Meaning |
| --- | --- |
| `hi` | Your player id, the server name, and your cleaned-up name |
| `w` | Welcome to a dimension: everyone there, damaged props, pickups, monsters, portals, turrets, your position and epoch |
| `s` | Snapshot: `p` players `[id,x,y,z,yaw,anim,hp%,effects]`, `n` monsters, `u` turret aim |
| `ev` | A batch of events for this dimension copy: `join`, `leave`, `shot`, `hit`, `boom`, `mel`, `dmg`, `kill`, `prop`, `pk+`/`pk-` (pickups), `npc+`/`npc-`, `po+`/`po-` (portals), `tu+`/`tu-` (turrets), `ab`, `em`, `dodge`, `kiosk`, `bite`, `shrunk`, `say` (a local speaks), `world` (an event starts or ends), `title` (someone broke out of their life), `gear`, `ship`, `warp`, `nfree` |
| `pv` | Private events: `tp` (you were moved), `kb` (knockback), `toast`, `built`, `task` (a daily task paid out), `step` (a path step completed), `offer` (a local's trade) |
| `y` | Your private state: health, materials and gadgets, portal charges and borrowed charges (`bor`), cooldowns, score, death timer, ship |
| `pg` | Your life: upgrades, path step, unlocks, counters, errands, daily-task cooldowns, title, and resulting stats |
| `c` | A chat line: id, name, home code, dimension, text |
| `pop` | Players per dimension and the top-10 chaos leaderboard |
| `pong` | Reply to `pi` |
| `err` | Why you were disconnected |

Projectiles are sent once as a `shot` (start point, velocity, gravity, lifetime), and every client flies them itself. The server flies the same projectile and announces the `hit`. That keeps snapshots small even in a 64-player firefight.

## What keeps it safe

### Cheating
* **Server-side game rules.** A client cannot give itself health, items, scrap, kills or portal charges, because none of those are client-controlled values.
* **Consent for fights.** Fights are on by default, and the server only lets a player hurt another player when both still have them on. This covers shots, melee, grenades, turrets, pets and the shrink ray. Shots pass through anyone who isn't fighting, so nobody can grief a player who opted out.
* **Lore limits are enforced on the server.** An Average Joe's `po` is ignored, a Birdfolk's `cr` is ignored, and only Birdfolk get the flying allowance in the movement check.
* **Movement checks.** Horizontal distance must fit your speed (with sprint, shrink and guilt effects, plus slack for lag). Rising must fit your jump or wings. You can never rise above jump height plus the tallest prop. Knockback grants a short allowance. Every failed check snaps you back; 25 recent failures disconnect you. With 64 bots fighting, knocking each other around and flying on the moon, no false kicks occurred.
* **Cooldowns and ammo on the server.** Fire rate, ability cooldowns, station cooldown and fee, travel rules (`MM.travelWhy`: portal gun or borrowed charges, gold portals for outside the Curve, ship range), turret limits and gadget counts are all tracked server-side.
* **Aim cannot cheat range.** A shot always starts from your server-side position, and the server flies it.

### Saved progress
* **No accounts.** The first time you play, the server makes a random 128-bit token and sends it to your browser, which keeps it. When you come back, the browser shows the token and gets your characters back. The token is a secret: anyone who has it is you, so it is never displayed or sent anywhere else.
* **One session per token.** Joining from a second tab or device disconnects the first, so progress can't be duplicated.
* **The server keeps the progress, not the browser.** A browser can't edit its upgrades or materials online. Saves are written atomically (temporary file, then rename) every 20 s and on shutdown, and the least recently played tokens are dropped beyond `MAX_SAVES`.
* **Saves are cleaned on load.** Only known recipes, dimensions, tasks and materials are kept; numbers are clamped; anything else (including `__proto__` tricks) is dropped. The tests load a tampered save to check this.
* **Offline play** keeps progress in the browser's own storage, through the same cleaning. It's your own single-player world there, so editing it only cheats yourself.
* **Life rules on the server.** Recipe knowledge (character plus path unlocks), station location, costs, daily-task cooldowns (wall-clock time), step goals, errands and trades are all checked server-side. Talking to the same local twice counts once toward "talk to N locals".

### Abuse and flooding
* **Per-type rate limits** (token buckets): 3 chat lines then 1 every 2 s, 12 shots burst, 40 position updates, 90 messages a second overall. Sustained flooding or 40 malformed messages disconnects you.
* **Message size cap** of 2 KB, enforced by the WebSocket server before parsing. Binary frames are refused.
* **Connection limits:** 4 sockets per address (`MAX_PER_IP`), 20 new connections per minute per address (`CONNECT_RATE`), a total player cap (`MAX_PLAYERS`), and a 10-second deadline to say `hello`.
* **Dead connections** are pinged every 15 s and dropped if they don't answer. A client that can't keep up (more than 1 MB queued) has messages skipped instead of growing server memory.

### Players' safety
* **No accounts, passwords, emails or payments.** Nothing personal is collected. Your name and look stay in your own browser's storage.
* **Names** are limited to 2–16 letters, digits, spaces and a little punctuation. **Looks** are rebuilt from a fixed list of options and `#rrggbb` colours, so nobody can send anything that isn't a valid outfit.
* **Chat** is 140 characters, stripped of control and text-direction tricks, with a word filter. Every player can **mute** anyone (Tab → Mute) and hide bot chat.
* **No HTML injection.** Everything another player typed is drawn with `textContent` or on a canvas, never as HTML. The automated tests send `<img onerror=…>` through chat and check it shows up as plain text.
* **Version check:** a client and server on different protocol versions refuse each other cleanly.

### The web server
* Serves only the game's own folders (`index.html`, `js/`, `shared/`, `sim/`, `vendor/`). There is no directory listing, no dot-files and no path traversal; server code and `node_modules` are never served.
* Strict headers: a Content-Security-Policy that only allows the game's own scripts (plus Google Fonts), `nosniff`, no referrer, a locked-down Permissions-Policy, no framing by other sites, and HSTS behind HTTPS proxies.
* `/info` reports only counts (players, bots, per dimension), never names or addresses.
* The Docker image runs as the unprivileged `node` user.
* Hosted on Render (or any HTTPS host), traffic is encrypted end to end (`wss://`).

### Known limits
* The word filter is basic. On a public server, plan on someone moderating, or add a reporting tool.
* The movement check allows about 1.5× normal speed to absorb lag. A careful cheater could move slightly faster than everyone else, but cannot teleport, fly without wings, or alter health or items.
* JSON is easy to debug but not the smallest format. Each player receives about 45 KB/s before compression (about a quarter of that after) in a full 64-player dimension. A binary format and distance-based updates would be the next step for much larger servers.

## Measured

* `npm test`: 18 tests. They cover the protocol, sanitizers, speed-hack rejection, rate limits, lore limits, portals and instance overflow, plus 64 bots fighting for a simulated minute (about 3.5 s of CPU) with no false kicks. They also cover station-only crafting, a teen's full path to Space Teen, an Average Joe locked out of ships, ship speed and the dimension drive, locals and cross-dimension errands, saved progress (including a tampered save), world events, the garage doors, the Meeseeks Box, and that every world generates its props.
* `scripts/loadtest.js` over real WebSockets: 64 players in one dimension used about 0.7 of one CPU core and 100 MB of memory. 130 players split themselves into copies of 64, 64 and 2, and nobody was kicked.
