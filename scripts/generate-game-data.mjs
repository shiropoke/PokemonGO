import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const GAME_MASTER_URL =
  'https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json';
const JAPANESE_TEXT_URL =
  'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_japanese.json';
const POKEMON_PATH = resolve('public/data/pokemon.json');
const OUTPUT_PATH = resolve('public/data/game-data.json');

// attackScalar follows the PokemonType protobuf enum order used by the Game Master.
const TYPE_ORDER = [
  'normal',
  'fighting',
  'flying',
  'poison',
  'ground',
  'rock',
  'bug',
  'ghost',
  'steel',
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'ice',
  'dragon',
  'dark',
  'fairy',
];

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJson(pathOrUrl) {
  if (/^https:\/\//u.test(pathOrUrl)) {
    const response = await fetch(pathOrUrl, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}): ${pathOrUrl}`);
    }
    return response.json();
  }
  return JSON.parse(await readFile(resolve(pathOrUrl), 'utf8'));
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function positiveNumber(value) {
  const number = finiteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function normalizeType(value) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/^POKEMON_TYPE_/u, '').toLowerCase();
  return TYPE_ORDER.includes(normalized) ? normalized : undefined;
}

function normalizeId(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function withoutShadow(speciesId) {
  return speciesId.replace(/_shadow$/u, '');
}

function templatePokemonInfo(template) {
  const match = /^V(\d{4})_POKEMON_(.+)$/u.exec(template.templateId ?? '');
  const settings = template.data?.pokemonSettings;
  const stats = settings?.stats;
  if (!match || !isRecord(settings) || !isRecord(stats)) return null;

  const dex = Number(match[1]);
  const atk = positiveNumber(stats.baseAttack);
  const def = positiveNumber(stats.baseDefense);
  const hp = positiveNumber(stats.baseStamina);
  if (!Number.isInteger(dex) || !atk || !def || !hp) return null;

  return {
    dex,
    templateSuffix: match[2].toLowerCase(),
    settings,
    stats: { atk, def, hp },
  };
}

function temporaryEvolutionKey(pokemonId, temporaryEvolutionId) {
  return `${pokemonId}|${temporaryEvolutionId}`;
}

function buildTemporaryEvolutionCandidates(gameMaster, regularCandidates) {
  // temporaryEvolutionSettings is the authoritative link between a species and
  // a temporary form. The combat overrides themselves live on pokemonSettings.
  const available = new Set();
  for (const template of gameMaster) {
    const settings = template.data?.temporaryEvolutionSettings;
    if (
      !isRecord(settings) ||
      typeof settings.pokemonId !== 'string' ||
      !Array.isArray(settings.temporaryEvolutions)
    ) continue;
    for (const evolution of settings.temporaryEvolutions) {
      if (!isRecord(evolution) || typeof evolution.temporaryEvolutionId !== 'string') {
        continue;
      }
      available.add(
        temporaryEvolutionKey(settings.pokemonId, evolution.temporaryEvolutionId),
      );
    }
  }

  const candidates = new Map();
  for (const base of regularCandidates) {
    const settings = base.settings;
    // The Game Master contains both an unqualified and a _NORMAL copy. Reading
    // either is valid; the key below deliberately collapses those duplicates.
    if (typeof settings.form === 'string' && !/_NORMAL$/u.test(settings.form)) {
      continue;
    }
    if (
      typeof settings.pokemonId !== 'string' ||
      !Array.isArray(settings.tempEvoOverrides)
    ) continue;

    for (const override of settings.tempEvoOverrides) {
      if (
        !isRecord(override) ||
        typeof override.tempEvoId !== 'string' ||
        !available.has(temporaryEvolutionKey(settings.pokemonId, override.tempEvoId)) ||
        !isRecord(override.stats)
      ) continue;
      const atk = positiveNumber(override.stats.baseAttack);
      const def = positiveNumber(override.stats.baseDefense);
      const hp = positiveNumber(override.stats.baseStamina);
      const type = normalizeType(override.typeOverride1);
      if (!atk || !def || !hp || !type) continue;

      const key = [
        base.dex,
        settings.pokemonId,
        override.tempEvoId,
        atk,
        def,
        hp,
      ].join('|');
      const temporarySettings = {
        ...settings,
        stats: override.stats,
        type: override.typeOverride1,
        // An absent second override means that the temporary form is monotype;
        // retaining the base form's second type would be incorrect (e.g. Aggron).
        type2: override.typeOverride2,
      };
      const candidate = {
        dex: base.dex,
        // PvPoke naming is not inferred here. selectGameMasterPokemon accepts
        // this candidate only when dex and all three GM stats match uniquely.
        templateSuffix: `temporary:${normalizeId(settings.pokemonId)}:${normalizeId(override.tempEvoId)}`,
        settings: temporarySettings,
        stats: { atk, def, hp },
      };
      const existing = candidates.get(key);
      if (!existing || typeof settings.form !== 'string') candidates.set(key, candidate);
    }
  }
  return [...candidates.values()];
}

function statsMatch(left, right) {
  return (
    left?.atk === right?.atk &&
    left?.def === right?.def &&
    left?.hp === right?.hp
  );
}

function templateAliases(speciesId) {
  return new Set([
    speciesId,
    speciesId.replace(/_alolan$/u, '_alola'),
    speciesId.replace(/_galarian$/u, '_galarian'),
    speciesId.replace(/_hisuian$/u, '_hisui'),
    speciesId.replace(/_paldean$/u, '_paldea'),
  ]);
}

function selectGameMasterPokemon(pokemon, candidates) {
  const speciesId = withoutShadow(pokemon.speciesId);
  const statMatches = candidates.filter(
    (candidate) =>
      candidate.dex === pokemon.dex &&
      statsMatch(candidate.stats, pokemon.baseStats),
  );
  const aliases = templateAliases(speciesId);
  const exact = statMatches.filter((candidate) =>
    aliases.has(candidate.templateSuffix),
  );
  if (exact.length === 1) return exact[0];
  if (statMatches.length === 1) return statMatches[0];
  return null;
}

function moveNameFromTemplate(templateId, japaneseText) {
  const match = /(?:^|_)V?(\d{4})_MOVE_/u.exec(templateId);
  if (!match) return undefined;
  return japaneseText.get(`move_name_${match[1]}`);
}

function fallbackMoveName(id) {
  return id
    .replace(/_FAST$/u, '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function roundMetric(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function buildMoveData(gameMaster, japaneseText) {
  const pveById = new Map();
  const pvpById = new Map();
  const nameById = new Map();

  for (const template of gameMaster) {
    const pve = template.data?.moveSettings;
    if (isRecord(pve) && typeof pve.movementId === 'string') {
      pveById.set(pve.movementId, pve);
      const name = moveNameFromTemplate(template.templateId ?? '', japaneseText);
      if (name) nameById.set(pve.movementId, name);
    }

    const pvp = template.data?.combatMove;
    if (isRecord(pvp) && typeof pvp.uniqueId === 'string') {
      pvpById.set(pvp.uniqueId, pvp);
      const name = moveNameFromTemplate(template.templateId ?? '', japaneseText);
      if (name && !nameById.has(pvp.uniqueId)) nameById.set(pvp.uniqueId, name);
    }
  }

  const allMoveIds = new Set([...pveById.keys(), ...pvpById.keys()]);
  const moves = {};
  for (const id of [...allMoveIds].sort()) {
    const pve = pveById.get(id);
    const pvp = pvpById.get(id);
    const type = normalizeType(pve?.pokemonType) ?? normalizeType(pvp?.type);
    if (!type) continue;

    const kind = id.endsWith('_FAST') ? 'fast' : 'charged';
    const entry = {
      id,
      name: nameById.get(id) ?? fallbackMoveName(id),
      type,
      kind,
    };

    const pvePower = finiteNumber(pve?.power);
    const durationMs = positiveNumber(pve?.durationMs);
    const pveEnergyDelta = finiteNumber(pve?.energyDelta);
    if (
      pvePower !== undefined ||
      durationMs !== undefined ||
      pveEnergyDelta !== undefined
    ) {
      entry.pve = {
        ...(pvePower !== undefined ? { power: pvePower } : {}),
        ...(durationMs !== undefined ? { durationMs } : {}),
        ...(pveEnergyDelta !== undefined ? { energyDelta: pveEnergyDelta } : {}),
        ...(pvePower !== undefined && durationMs
          ? { dps: roundMetric(pvePower / (durationMs / 1000)) }
          : {}),
        ...(pveEnergyDelta !== undefined && durationMs
          ? { eps: roundMetric(pveEnergyDelta / (durationMs / 1000)) }
          : {}),
      };
    }

    const pvpPower = finiteNumber(pvp?.power);
    const pvpEnergyDelta = finiteNumber(pvp?.energyDelta);
    const durationTurns = finiteNumber(pvp?.durationTurns);
    // The Game Master stores durationTurns zero-based; the displayed turn count is +1.
    const turns = kind === 'fast' && durationTurns !== undefined
      ? durationTurns + 1
      : undefined;
    if (
      pvpPower !== undefined ||
      pvpEnergyDelta !== undefined ||
      turns !== undefined
    ) {
      entry.pvp = {
        ...(pvpPower !== undefined ? { power: pvpPower } : {}),
        ...(pvpEnergyDelta !== undefined ? { energyDelta: pvpEnergyDelta } : {}),
        ...(turns !== undefined ? { turns } : {}),
        ...(pvpPower !== undefined && turns
          ? { dpt: roundMetric(pvpPower / turns) }
          : {}),
        ...(pvpEnergyDelta !== undefined && turns
          ? { ept: roundMetric(pvpEnergyDelta / turns) }
          : {}),
        ...(kind === 'charged' && pvpPower !== undefined && pvpEnergyDelta
          ? { dpe: roundMetric(pvpPower / Math.abs(pvpEnergyDelta)) }
          : {}),
      };
    }

    moves[id] = entry;
  }
  return moves;
}

function buildTypeEffectiveness(gameMaster) {
  const result = {};
  for (const template of gameMaster) {
    const settings = template.data?.typeEffective;
    const attackType = normalizeType(settings?.attackType);
    if (!attackType || !Array.isArray(settings?.attackScalar)) continue;
    if (settings.attackScalar.length !== TYPE_ORDER.length) continue;

    const byDefender = {};
    for (let index = 0; index < TYPE_ORDER.length; index += 1) {
      const scalar = finiteNumber(settings.attackScalar[index]);
      const defenderType = TYPE_ORDER[index];
      if (scalar !== undefined && defenderType) byDefender[defenderType] = scalar;
    }
    if (Object.keys(byDefender).length === TYPE_ORDER.length) {
      result[attackType] = byDefender;
    }
  }
  return result;
}

function buildPowerUpCosts(gameMaster, pokemonList) {
  const settings = gameMaster.find(
    (template) => template.templateId === 'POKEMON_UPGRADE_SETTINGS',
  )?.data?.pokemonUpgrades;
  const lucky = gameMaster.find(
    (template) => template.templateId === 'LUCKY_POKEMON_SETTINGS',
  )?.data?.luckyPokemonSettings;
  if (
    !isRecord(settings) ||
    !Array.isArray(settings.stardustCost) ||
    !Array.isArray(settings.candyCost) ||
    !Array.isArray(settings.xlCandyCost)
  ) {
    throw new Error('POKEMON_UPGRADE_SETTINGS is missing or malformed.');
  }

  const overrides = {};
  for (const template of gameMaster) {
    const match = /V(\d{4})_POKEMON_(.+)$/u.exec(template.templateId ?? '');
    const override = template.data?.pokemonUpgrades;
    if (
      !match ||
      !String(template.templateId).startsWith('POKEMON_UPGRADE_OVERRIDE_SETTINGS_') ||
      !isRecord(override) ||
      !Array.isArray(override.stardustCost) ||
      !Array.isArray(override.candyCost) ||
      !Array.isArray(override.xlCandyCost)
    ) continue;
    const dex = Number(match[1]);
    const suffix = match[2].toLowerCase();
    const pokemon = pokemonList.find(
      (entry) =>
        entry.dex === dex &&
        !entry.speciesId.endsWith('_shadow') &&
        templateAliases(entry.speciesId).has(suffix),
    );
    if (!pokemon) continue;
    overrides[pokemon.speciesId] = {
      maxLevel: positiveNumber(override.maxNormalUpgradeLevel) ?? 50,
      stardustCostByLevel: override.stardustCost,
      candyCostByLevel: override.candyCost,
      xlCandyCostFromLevel40: override.xlCandyCost,
    };
  }

  return {
    upgradesPerLevel: positiveNumber(settings.upgradesPerLevel) ?? 2,
    maxLevel: positiveNumber(settings.maxNormalUpgradeLevel) ?? 50,
    stardustCostByLevel: settings.stardustCost,
    candyCostByLevel: settings.candyCost,
    xlCandyCostFromLevel40: settings.xlCandyCost,
    modifiers: {
      luckyStardust: finiteNumber(lucky?.powerUpStardustDiscountPercent) ?? 0.5,
      shadowStardust: finiteNumber(settings.shadowStardustMultiplier) ?? 1,
      shadowCandy: finiteNumber(settings.shadowCandyMultiplier) ?? 1,
      purifiedStardust: finiteNumber(settings.purifiedStardustMultiplier) ?? 1,
      purifiedCandy: finiteNumber(settings.purifiedCandyMultiplier) ?? 1,
    },
    overrides,
  };
}

function buildPokemonData(gameMaster, pokemonList) {
  const regularCandidates = gameMaster.map(templatePokemonInfo).filter(Boolean);
  const candidates = [
    ...regularCandidates,
    ...buildTemporaryEvolutionCandidates(gameMaster, regularCandidates),
  ];
  const mapped = new Map();
  const gameMasterToSpeciesId = new Map();

  for (const pokemon of pokemonList) {
    const candidate = selectGameMasterPokemon(pokemon, candidates);
    if (!candidate) continue;
    mapped.set(pokemon.speciesId, candidate);
    if (!pokemon.speciesId.endsWith('_shadow')) {
      gameMasterToSpeciesId.set(candidate, pokemon.speciesId);
    }
  }

  const pokemonById = new Map(pokemonList.map((entry) => [entry.speciesId, entry]));
  const result = {};
  for (const pokemon of pokemonList) {
    const candidate = mapped.get(pokemon.speciesId);
    if (!candidate) continue;
    const settings = candidate.settings;
    const isShadow = pokemon.speciesId.endsWith('_shadow');
    const types = [normalizeType(settings.type), normalizeType(settings.type2)].filter(Boolean);
    if (types.length === 0) continue;

    const fastMoveIds = Array.isArray(settings.quickMoves)
      ? settings.quickMoves.filter((value) => typeof value === 'string')
      : [];
    const chargedMoveIds = Array.isArray(settings.cinematicMoves)
      ? settings.cinematicMoves.filter((value) => typeof value === 'string')
      : [];
    if (isShadow && typeof settings.shadow?.shadowChargeMove === 'string') {
      chargedMoveIds.push(settings.shadow.shadowChargeMove);
    }

    const eliteFastMoveIds = Array.isArray(settings.eliteQuickMove)
      ? settings.eliteQuickMove.filter((value) => typeof value === 'string')
      : [];
    const eliteChargedMoveIds = Array.isArray(settings.eliteCinematicMove)
      ? settings.eliteCinematicMove.filter((value) => typeof value === 'string')
      : [];

    const evolutions = [];
    const branches = Array.isArray(settings.evolutionBranch)
      ? settings.evolutionBranch
      : [];
    for (const branch of branches) {
      if (!isRecord(branch) || typeof branch.evolution !== 'string') continue;
      const branchForm = typeof branch.form === 'string' ? branch.form : undefined;
      const targetCandidate = candidates.find((possible) => {
        if (possible.settings.pokemonId !== branch.evolution) return false;
        if (branchForm) return possible.settings.form === branchForm;
        return !possible.settings.form || /_NORMAL$/u.test(possible.settings.form);
      });
      let targetSpeciesId = targetCandidate
        ? gameMasterToSpeciesId.get(targetCandidate)
        : undefined;
      if (!targetSpeciesId) {
        const normalizedEvolution = normalizeId(branch.evolution);
        if (pokemonById.has(normalizedEvolution)) targetSpeciesId = normalizedEvolution;
      }
      if (isShadow && targetSpeciesId && pokemonById.has(`${targetSpeciesId}_shadow`)) {
        targetSpeciesId = `${targetSpeciesId}_shadow`;
      }
      if (!targetSpeciesId || !pokemonById.has(targetSpeciesId)) continue;
      if (evolutions.some((entry) => entry.speciesId === targetSpeciesId)) continue;
      evolutions.push({
        speciesId: targetSpeciesId,
        ...(positiveNumber(branch.candyCost) !== undefined
          ? { candyCost: branch.candyCost }
          : {}),
      });
    }

    result[pokemon.speciesId] = {
      speciesId: pokemon.speciesId,
      types,
      fastMoveIds: [...new Set(fastMoveIds)],
      chargedMoveIds: [...new Set(chargedMoveIds)],
      eliteFastMoveIds: [...new Set(eliteFastMoveIds)],
      eliteChargedMoveIds: [...new Set(eliteChargedMoveIds)],
      evolutions,
    };
  }
  return result;
}

const gameMasterPath = process.env.POKEMINERS_GAME_MASTER_PATH ?? GAME_MASTER_URL;
const japaneseTextPath = process.env.POKEMINERS_JAPANESE_TEXT_PATH ?? JAPANESE_TEXT_URL;
const [gameMaster, japanesePayload, pokemonPayload] = await Promise.all([
  readJson(gameMasterPath),
  readJson(japaneseTextPath),
  readJson(POKEMON_PATH),
]);

if (!Array.isArray(gameMaster)) throw new Error('Game Master root must be an array.');
if (!Array.isArray(japanesePayload?.data)) {
  throw new Error('PokeMiners Japanese text payload is malformed.');
}
if (!Array.isArray(pokemonPayload?.pokemon)) {
  throw new Error('Existing lightweight Pokémon data is malformed.');
}

const japaneseText = new Map();
for (let index = 0; index + 1 < japanesePayload.data.length; index += 2) {
  const key = japanesePayload.data[index];
  const value = japanesePayload.data[index + 1];
  if (typeof key === 'string' && typeof value === 'string') japaneseText.set(key, value);
}

const output = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sources: {
    gameMaster: GAME_MASTER_URL,
    japaneseText: JAPANESE_TEXT_URL,
    pokemonBaseData: 'public/data/pokemon.json',
  },
  types: TYPE_ORDER,
  typeEffectiveness: buildTypeEffectiveness(gameMaster),
  powerUp: buildPowerUpCosts(gameMaster, pokemonPayload.pokemon),
  moves: buildMoveData(gameMaster, japaneseText),
  pokemon: buildPokemonData(gameMaster, pokemonPayload.pokemon),
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(output)}\n`, 'utf8');
console.log(
  `Generated ${OUTPUT_PATH}: ${Object.keys(output.pokemon).length} Pokémon, ` +
    `${Object.keys(output.moves).length} moves.`,
);
