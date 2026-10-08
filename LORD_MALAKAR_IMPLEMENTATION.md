# Lord Malakar — implementation record

## Restoration point and initial state

- Date/time: 2026-10-06, approximately 19:20 local time.
- Backup: `E:\MMORPG_BACKUPS\lord-malakar-pre-implementation-20261006-1920`
- The verified snapshot contained 715 project files, excluding `.git` and `node_modules`.
- Initial repository revision: `62d3597` (`Atualiza combate e sistema de pets`).
- The HTTP server was stopped before implementation.
- Pre-existing local changes were preserved: `admins.json` and untracked `test-output.txt`.

## Files changed for this feature

- `server.js`
- `index.html`
- `skills.js`
- `style.css`
- `sistemas/lord_malakar.js`
- `classes/lord_malakar.js`
- `items/config/classes.json`
- `items/definitions/weapons.json`
- `personagem-select.js`
- `personagens-historias.js`
- `imagem/HUD/Perfil/Malakar.svg`
- `tests/lord-malakar.test.js`
- `CHANGELOG.md`
- `INFO_PROJETO.md`

## Implemented

- Canonical class ID `lord_malakar`, class selection, story, portrait, Canvas renderer, skill catalog, equipment definitions, and four HUD actions mapped to keys 1–4.
- Basic attacks are server-validated and scale using the existing Afinidade attribute path.
- The class has zero Mana; MP UI and MP potion use are disabled for it.
- Server-authoritative skull counts (2 warrior, 2 archer, 1 mage), 3% max-HP petrification per skull, temporary minion replacement, cooldowns, and the 20% minimum-HP restriction on summon/suffering.
- Summons are placed in the existing `petsAtivos` runtime registry with a class-specific tag. They are not added to saved pet profiles; the common pet AI skips them so the class updater remains authoritative.
- Skull warriors and skill-4 minions have HP, can be selected by ordinary monsters, and are removed from both runtime and class state on death. Archers and mages stay out of ordinary monster aggro. Timed minion expiry also sends a removal event.
- Mortal Bond heals from positive damage dealt by skulls and skill-4 minions to linked targets, including the Reaper area spin. Healing is 10% of dealt damage with a 1 HP minimum per positive hit, and uses the shared petrified-HP healing cap.
- Clicking a monster or boss selects it as Malakar's basic-attack target; that focus is sent to the server and shared with the skulls and temporary minion. The basic-attack range is 650 px; Mortal Bond remains at 260 px.
- The Cleric heals Malakar, nearby party members, and injured skulls whenever they have recoverable HP; it no longer waits for a target to drop below 75% HP.
- Passive damage reduction, common HP-healing caps, Suffering Eternal's critical/attack-speed bonuses for summons and same-party allies on the same map/instance, basic summon rendering, petrification meter, dialogue bubbles, and cleanup on death/logout/arena exit/map-or-instance change.
- The permanent `Carne Petrificada` passive is documented in the skill catalog and applies the configured 2%-per-3%-petrified-damage reduction up to 10%.
- Thirteen unit tests cover the class rules, including range, passive, summon expiry, cooldown values, and non-overlapping skull spawn positions.

## Provisional balance values

These values were not explicit in the specification excerpt available during implementation and should be calibrated before treating balance as final:

- Summon max HP: 100.
- Basic-attack damage: 1 per 300 ms tick while its validated target remains in range; range: 650 px; request interval: 500 ms. Mortal Bond range: 260 px.
- Summon damage: melee/reaper 2, archer/sniper 3, mage 5; reaper area strike 2. Skill-4 minions have 100 HP and a movement step of 3 versus skulls at 2.5.
- Entity melee range: 72; ranged limit: 420; reaper special range: 120.
- Skull/minion attack intervals and minion lifetimes are currently configuration defaults.

The explicit costs/caps retained from the specification are 3% max HP per skull, 10%/15% max HP per temporary minion, one temporary minion, at most five skulls, and a 20% HP floor for summoning and Suffering Eternal.

## Known follow-up work

- Extend links and summon target resolution to every supported monster/boss type; links currently acquire nearby slimes.
- Complete requested sound effects and full multiplayer/PvP validation for all summon types.
- Add integration tests for WebSocket actions, multiplayer visibility, instance transitions, all healing sources, death/respawn, and entity targeting.
- Confirm provisional balance values with the game owner and update the rules/tests before publishing a final balance.

## Validation status

- `node --check server.js`: passed.
- `node --test tests/lord-malakar.test.js`: 11 passed.
- Equipment registry JSON parsing: passed.
- The full `node --test` run completed with 134 passing and 7 failing tests. Failures include pinned cache/version assertions, a map snapshot assertion, and Pet integration timeouts/state checks. These were left untouched; the repository baseline was not re-established, so they are not claimed as pre-existing.
