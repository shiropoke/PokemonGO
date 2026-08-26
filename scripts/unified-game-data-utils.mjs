const CANONICAL_TYPES = new Set([
  'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost',
  'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon',
  'dark', 'fairy',
]);

const TEMP_FORM_IDS = new Map([
  ['mega', 1],
  ['megax', 2],
  ['megay', 3],
  ['primal', 4],
]);

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function integer(value) {
  const parsed = number(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
}

function string(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function normalizeIdentifier(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replaceAll('alolan', 'alola')
    .replaceAll('galarian', 'galar')
    .replaceAll('hisuian', 'hisui')
    .replaceAll('paldean', 'paldea')
    .replaceAll('forme', 'form')
    .replace(/\b(?:form|breed)\b/gu, '')
    .replace(/[^a-z0-9]+/gu, '')
    .trim();
}

function normalizeType(value) {
  const normalized = String(value ?? '')
    .replace(/^POKEMON_TYPE_/u, '')
    .toLowerCase();
  return CANONICAL_TYPES.has(normalized) ? normalized : undefined;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null))];
}

function translationMap(value) {
  if (Array.isArray(value)) {
    return new Map(value.flatMap((entry) => {
      const key = isRecord(entry) ? string(entry.key) : undefined;
      const translated = isRecord(entry) ? string(entry.value) : undefined;
      return key && translated ? [[key, translated]] : [];
    }));
  }
  return new Map(
    isRecord(value)
      ? Object.entries(value).filter(([, translated]) => typeof translated === 'string')
      : [],
  );
}

function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function recordConflict(conflicts, entity, key, field, selectedSource, values) {
  const present = Object.entries(values).filter(([, value]) => value !== undefined);
  if (present.length < 2) return;
  const distinct = new Set(present.map(([, value]) => JSON.stringify(value)));
  if (distinct.size < 2) return;
  conflicts.push({ entity, key, field, selectedSource, sourceValues: Object.fromEntries(present) });
}

function mergeMetrics(primary, ...fallbacks) {
  const result = { ...(primary ?? {}) };
  for (const fallback of fallbacks) {
    if (!isRecord(fallback)) continue;
    for (const [key, value] of Object.entries(fallback)) {
      if (number(value) !== undefined && result[key] === undefined) result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function gameMoveEnglishName(id) {
  return id
    .replace(/_FAST$/u, '')
    .split('_')
    .filter(Boolean)
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(' ');
}

function watBuffs(move) {
  const raw = move?.pvpBuffs;
  if (!isRecord(raw)) return undefined;
  const result = {
    activationChance: number(raw.buffActivationChance),
    attackerAttack: number(raw.attackerAttackStatStageChange),
    attackerDefense: number(raw.attackerDefenseStatStageChange),
    targetAttack: number(raw.targetAttackStatStageChange),
    targetDefense: number(raw.targetDefenseStatStageChange),
  };
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
}

function pogoBuffs(move) {
  const raw = move?.buffs;
  if (!isRecord(raw)) return undefined;
  const result = {
    activationChance: number(raw.activation_chance),
    attackerAttack: number(raw.attacker_attack_stat_stage_change),
    attackerDefense: number(raw.attacker_defense_stat_stage_change),
    targetAttack: number(raw.target_attack_stat_stage_change),
    targetDefense: number(raw.target_defense_stat_stage_change),
  };
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
}

function buildUnifiedMoves({ gameData, wat, pogo }, conflicts) {
  const typeById = new Map((wat.types ?? []).flatMap((entry) => {
    const id = integer(entry.typeId);
    const type = normalizeType(entry.typeName);
    return id !== undefined && type ? [[id, type]] : [];
  }));
  const jaMoves = translationMap(wat.translationsMoves);
  const watById = new Map((wat.moves ?? []).map((move) => [move.moveId, move]));
  const watByProto = new Map((wat.moves ?? []).flatMap((move) => {
    const proto = string(move.proto);
    return proto ? [[proto, move]] : [];
  }));
  const pogoPveById = new Map(
    [...(pogo.fastMoves ?? []), ...(pogo.chargedMoves ?? [])]
      .map((move) => [move.move_id, move]),
  );
  const pogoPvpById = new Map(
    [...(pogo.pvpFastMoves ?? []), ...(pogo.pvpChargedMoves ?? [])]
      .map((move) => [move.move_id, move]),
  );
  const gameMoves = isRecord(gameData.moves) ? gameData.moves : {};
  const numericIds = new Set([
    ...watById.keys(),
    ...pogoPveById.keys(),
    ...pogoPvpById.keys(),
  ]);
  const moves = [];
  const gameIdToKey = new Map();

  for (const moveId of [...numericIds].sort((a, b) => a - b)) {
    const watMove = watById.get(moveId);
    const pveMove = pogoPveById.get(moveId);
    const pvpMove = pogoPvpById.get(moveId);
    const gameId = string(watMove?.proto);
    const gameMove = gameId ? gameMoves[gameId] : undefined;
    const key = String(moveId);
    const kind = gameMove?.kind
      ?? (watMove?.fast === true || pveMove?.turn_duration !== undefined ? 'fast' : 'charged');
    const gameType = normalizeType(gameMove?.type);
    const watType = typeById.get(watMove?.type);
    const pogoType = normalizeType(pveMove?.type ?? pvpMove?.type);
    const selectedType = gameType ?? watType ?? pogoType ?? 'normal';
    const pve = mergeMetrics(
      gameMove?.pve,
      watMove && {
        power: watMove.power,
        durationMs: watMove.durationMs,
        energyDelta: watMove.energyDelta,
        criticalChance: watMove.criticalChance,
      },
      pveMove && {
        power: pveMove.power,
        durationMs: pveMove.duration,
        energyDelta: pveMove.energy_delta,
        criticalChance: pveMove.critical_chance,
      },
    );
    const pvp = mergeMetrics(
      gameMove?.pvp,
      watMove && {
        power: watMove.pvpPower,
        energyDelta: watMove.pvpEnergyDelta,
        turns: watMove.pvpDurationTurns,
      },
      pvpMove && {
        power: pvpMove.power,
        energyDelta: pvpMove.energy_delta,
        turns: pvpMove.turn_duration,
      },
    );
    const buffs = watBuffs(watMove) ?? pogoBuffs(pvpMove);
    const englishName = string(watMove?.moveName)
      ?? string(pveMove?.name)
      ?? string(pvpMove?.name)
      ?? (gameId ? gameMoveEnglishName(gameId) : `Move ${moveId}`);
    const japaneseName = jaMoves.get(`move_${moveId}`)
      ?? string(gameMove?.name)
      ?? englishName;
    const sources = unique([
      watMove && 'watwowmap',
      (pveMove || pvpMove) && 'pogoapi',
      gameMove && 'pokeminers',
    ]);
    recordConflict(conflicts, 'move', key, 'type', gameType ? 'pokeminers' : watType ? 'watwowmap' : 'pogoapi', {
      pokeminers: gameType,
      watwowmap: watType,
      pogoapi: pogoType,
    });
    if (gameId) gameIdToKey.set(gameId, key);
    moves.push({
      key,
      moveId,
      ...(gameId ? { gameMasterId: gameId } : {}),
      names: { ja: japaneseName, en: englishName },
      type: selectedType,
      kind,
      ...(pve ? { pve } : {}),
      ...(pvp ? { pvp } : {}),
      ...(buffs && Object.keys(buffs).length > 0 ? { buffs } : {}),
      sources,
      fieldSources: {
        names: jaMoves.has(`move_${moveId}`) ? 'watwowmap' : gameMove ? 'pokeminers' : 'pogoapi',
        type: gameType ? 'pokeminers' : watType ? 'watwowmap' : 'pogoapi',
        kind: gameMove ? 'pokeminers' : watMove ? 'watwowmap' : 'pogoapi',
        ...(pve ? { pve: gameMove?.pve ? 'pokeminers' : watMove ? 'watwowmap' : 'pogoapi' } : {}),
        ...(pvp ? { pvp: gameMove?.pvp ? 'pokeminers' : watMove ? 'watwowmap' : 'pogoapi' } : {}),
        ...(buffs ? { buffs: watBuffs(watMove) ? 'watwowmap' : 'pogoapi' } : {}),
      },
    });
  }

  for (const [gameId, gameMove] of Object.entries(gameMoves)) {
    if (gameIdToKey.has(gameId) || watByProto.has(gameId)) continue;
    const key = `gm:${gameId}`;
    const kind = gameMove.kind === 'fast' ? 'fast' : 'charged';
    const type = normalizeType(gameMove.type) ?? 'normal';
    gameIdToKey.set(gameId, key);
    moves.push({
      key,
      gameMasterId: gameId,
      names: { ja: string(gameMove.name) ?? gameMoveEnglishName(gameId), en: gameMoveEnglishName(gameId) },
      type,
      kind,
      ...(isRecord(gameMove.pve) ? { pve: gameMove.pve } : {}),
      ...(isRecord(gameMove.pvp) ? { pvp: gameMove.pvp } : {}),
      sources: ['pokeminers'],
      fieldSources: { names: 'pokeminers', type: 'pokeminers', kind: 'pokeminers' },
    });
  }

  const nameCandidates = new Map();
  for (const move of moves) {
    const nameKey = `${move.kind}:${normalizeIdentifier(move.names.en)}`;
    const entries = nameCandidates.get(nameKey) ?? [];
    entries.push(move.key);
    nameCandidates.set(nameKey, entries);
  }
  const resolveMoveName = (name, kind) => {
    const matches = nameCandidates.get(`${kind}:${normalizeIdentifier(name)}`) ?? [];
    return matches.length === 1 ? matches[0] : undefined;
  };
  return {
    moves: moves.sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true })),
    gameIdToKey,
    resolveMoveName,
  };
}

function pokemonFormCandidates(wat) {
  const formsById = new Map((wat.forms ?? []).map((form) => [form.formId, form]));
  const result = [];
  for (const pokemon of wat.pokemon ?? []) {
    for (const formId of pokemon.forms ?? []) {
      const form = formsById.get(formId);
      if (!form) continue;
      result.push({
        pokedexId: pokemon.pokedexId,
        formId,
        key: `${pokemon.pokedexId}:${formId}`,
        formName: form.formName,
        proto: form.proto,
        pokemon,
        form,
      });
    }
    // Costume forms can repeat the base form's temporary evolutions. A temp
    // evolution belongs to the canonical default form unless the default form
    // has no such definition; never create duplicate dex + temp IDs.
    const defaultForm = formsById.get(pokemon.defaultFormId);
    const tempSource = defaultForm?.tempEvolutions?.length
      ? defaultForm
      : (pokemon.forms ?? []).map((id) => formsById.get(id)).find((form) => form?.tempEvolutions?.length);
    for (const temp of tempSource?.tempEvolutions ?? []) {
      result.push({
        pokedexId: pokemon.pokedexId,
        formId: null,
        key: `temp:${pokemon.pokedexId}:${temp.tempEvoId}`,
        formName: temp.tempEvoId === 2 ? 'Mega X' : temp.tempEvoId === 3 ? 'Mega Y' : temp.tempEvoId === 4 ? 'Primal' : 'Mega',
        proto: `${tempSource.proto}_TEMP_${temp.tempEvoId}`,
        temporaryEvolutionId: temp.tempEvoId,
        pokemon,
        form: tempSource,
        temp,
      });
    }
  }
  return result;
}

function extractExistingForm(record) {
  const speciesId = string(record.speciesId) ?? '';
  const speciesName = string(record.speciesName) ?? '';
  const explicit = [
    ['_mega_x', 'megax'], ['_mega_y', 'megay'], ['_mega', 'mega'],
    ['_primal', 'primal'], ['_alolan', 'alola'], ['_galarian', 'galar'],
    ['_hisuian', 'hisui'], ['_paldean', 'paldea'],
  ].find(([suffix]) => speciesId.endsWith(suffix));
  if (explicit) return explicit[1];
  const parentheses = [...speciesName.matchAll(/\(([^()]+)\)/gu)]
    .map((match) => normalizeIdentifier(match[1]))
    .filter((value) => value && value !== 'shadow');
  return parentheses.length === 1 ? parentheses[0] : 'normal';
}

function matchExistingForm(record, candidates) {
  const token = extractExistingForm(record);
  const tempId = TEMP_FORM_IDS.get(token);
  if (tempId !== undefined) {
    const matches = candidates.filter((candidate) => candidate.temporaryEvolutionId === tempId);
    return matches.length === 1 ? matches[0] : undefined;
  }
  const matches = candidates.filter((candidate) =>
    candidate.temporaryEvolutionId === undefined
    && (normalizeIdentifier(candidate.formName) === token
      || normalizeIdentifier(candidate.proto.split('_').slice(1).join('_')) === token),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function matchPogoForm(pokedexId, formName, candidatesByDex) {
  const token = normalizeIdentifier(formName || 'Normal');
  const tempId = TEMP_FORM_IDS.get(token);
  const candidates = candidatesByDex.get(pokedexId) ?? [];
  if (tempId !== undefined) {
    const temp = candidates.filter((candidate) => candidate.temporaryEvolutionId === tempId);
    return temp.length === 1 ? temp[0] : undefined;
  }
  const matches = candidates.filter((candidate) =>
    candidate.temporaryEvolutionId === undefined
    && normalizeIdentifier(candidate.formName) === token,
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function statsFrom(source) {
  if (!source) return undefined;
  const attack = number(source.attack ?? source.base_attack ?? source.atk);
  const defense = number(source.defense ?? source.base_defense ?? source.def);
  const stamina = number(source.stamina ?? source.base_stamina ?? source.hp);
  return attack !== undefined && defense !== undefined && stamina !== undefined
    ? { attack, defense, stamina }
    : undefined;
}

function addEvolution(map, evolution) {
  const edgeKey = evolution.targetKey
    ?? `${evolution.targetPokedexId}:${evolution.targetFormId ?? 'unknown'}`;
  const existing = map.get(edgeKey);
  if (!existing) {
    map.set(edgeKey, evolution);
    return;
  }
  existing.conditions = { ...evolution.conditions, ...existing.conditions };
  existing.sources = unique([...existing.sources, ...evolution.sources]);
}

function shinyFlags(entry) {
  if (!entry) return undefined;
  return {
    wild: Boolean(entry.found_wild),
    raid: Boolean(entry.found_raid),
    egg: Boolean(entry.found_egg),
    evolution: Boolean(entry.found_evolution),
    research: Boolean(entry.found_research),
    photobomb: Boolean(entry.found_photobomb),
  };
}

export function buildUnifiedData(input) {
  const conflicts = [];
  const unmatched = [];
  const gameData = input.gameData ?? {};
  const wat = input.wat ?? {};
  const pogo = input.pogo ?? {};
  const existingRows = Array.isArray(input.existingPokemon?.pokemon)
    ? input.existingPokemon.pokemon
    : [];
  const nonShadowRows = existingRows.filter((entry) => !String(entry.speciesId ?? '').endsWith('_shadow'));
  const shadowSpeciesIds = new Set(
    existingRows
      .filter((entry) => String(entry.speciesId ?? '').endsWith('_shadow'))
      .map((entry) => String(entry.speciesId).replace(/_shadow$/u, '')),
  );
  const moveResult = buildUnifiedMoves({ gameData, wat, pogo }, conflicts);
  const candidates = pokemonFormCandidates(wat);
  const candidatesByDex = new Map();
  for (const candidate of candidates) {
    const entries = candidatesByDex.get(candidate.pokedexId) ?? [];
    entries.push(candidate);
    candidatesByDex.set(candidate.pokedexId, entries);
  }
  const seedByKey = new Map(candidates.map((candidate) => [candidate.key, { candidate }]));
  const existingKeyBySpeciesId = new Map();

  for (const record of nonShadowRows) {
    const dexCandidates = candidatesByDex.get(record.dex) ?? [];
    const candidate = matchExistingForm(record, dexCandidates);
    const key = candidate?.key ?? `existing:${record.dex}:${record.speciesId}`;
    if (!candidate) unmatched.push({ source: 'existing', pokedexId: record.dex, form: extractExistingForm(record) });
    const seed = seedByKey.get(key) ?? {};
    seed.existing = record;
    if (!seed.candidate && candidate) seed.candidate = candidate;
    seedByKey.set(key, seed);
    existingKeyBySpeciesId.set(record.speciesId, key);
  }

  const pogoCollections = [
    ['stats', pogo.stats ?? []],
    ['types', pogo.types ?? []],
    ['currentMoves', pogo.currentMoves ?? []],
    ['maxCp', pogo.maxCp ?? []],
    ['evolutions', pogo.evolutions ?? []],
  ];
  for (const [field, rows] of pogoCollections) {
    for (const record of rows) {
      const candidate = matchPogoForm(record.pokemon_id, record.form, candidatesByDex);
      const key = candidate?.key ?? `pogo:${record.pokemon_id}:${normalizeIdentifier(record.form || 'normal')}`;
      if (!candidate && field === 'stats') {
        unmatched.push({ source: 'pogoapi', pokedexId: record.pokemon_id, form: record.form });
      }
      const seed = seedByKey.get(key) ?? {};
      seed[field] = record;
      seedByKey.set(key, seed);
    }
  }

  const jaPokemon = translationMap(wat.translationsPokemon);
  const jaForms = translationMap(wat.translationsForms);
  const typeById = new Map((wat.types ?? []).flatMap((entry) => {
    const type = normalizeType(entry.typeName);
    return type ? [[entry.typeId, type]] : [];
  }));
  const shinyByDex = isRecord(pogo.shiny) ? pogo.shiny : {};
  const pokemon = [];

  for (const [key, seed] of seedByKey) {
    const candidate = seed.candidate;
    const existing = seed.existing;
    const game = existing && isRecord(gameData.pokemon) ? gameData.pokemon[existing.speciesId] : undefined;
    const watPokemon = candidate?.pokemon;
    const watForm = candidate?.form;
    const watSpecific = candidate?.temp ?? watForm;
    const dex = integer(existing?.dex ?? candidate?.pokedexId ?? seed.stats?.pokemon_id);
    if (dex === undefined || dex <= 0) continue;
    const formId = candidate?.formId ?? null;
    const formNameEn = candidate?.formName ?? string(seed.stats?.form) ?? extractExistingForm(existing ?? {});
    const baseNameJa = jaPokemon.get(`poke_${dex}`);
    const formNameJa = formId !== null ? jaForms.get(`form_${formId}`) : undefined;
    const watJapaneseName = baseNameJa
      ? normalizeIdentifier(formNameEn) === 'normal' || !formNameJa
        ? baseNameJa
        : formNameJa.includes(baseNameJa) ? formNameJa : `${baseNameJa}（${formNameJa}）`
      : undefined;
    const japaneseName = watJapaneseName ?? string(existing?.displayNameJa)
      ?? string(existing?.speciesName) ?? string(watPokemon?.pokemonName) ?? `Pokémon ${dex}`;
    const englishName = string(existing?.speciesName)
      ?? string(seed.stats?.pokemon_name)
      ?? string(watPokemon?.pokemonName)
      ?? `Pokémon ${dex}`;
    const existingStats = statsFrom(existing?.baseStats);
    const watStats = statsFrom({
      attack: watSpecific?.attack ?? watPokemon?.attack,
      defense: watSpecific?.defense ?? watPokemon?.defense,
      stamina: watSpecific?.stamina ?? watPokemon?.stamina,
    });
    const pogoStats = statsFrom(seed.stats);
    const selectedStats = existingStats ?? watStats ?? pogoStats;
    const selectedStatsSource = existingStats ? 'pokeminers' : watStats ? 'watwowmap' : 'pogoapi';
    recordConflict(conflicts, 'pokemon', key, 'stats', selectedStatsSource, {
      pokeminers: existingStats,
      watwowmap: watStats,
      pogoapi: pogoStats,
    });
    const gameTypes = Array.isArray(game?.types) ? game.types.map(normalizeType).filter(Boolean) : undefined;
    const watTypeIds = watSpecific?.types ?? watPokemon?.types;
    const watTypes = Array.isArray(watTypeIds) ? watTypeIds.map((id) => typeById.get(id)).filter(Boolean) : undefined;
    const pogoTypes = Array.isArray(seed.types?.type) ? seed.types.type.map(normalizeType).filter(Boolean) : undefined;
    const selectedTypes = gameTypes?.length ? gameTypes : watTypes?.length ? watTypes : pogoTypes?.length ? pogoTypes : [];
    const selectedTypesSource = gameTypes?.length ? 'pokeminers' : watTypes?.length ? 'watwowmap' : 'pogoapi';
    recordConflict(conflicts, 'pokemon', key, 'types', selectedTypesSource, {
      pokeminers: gameTypes,
      watwowmap: watTypes,
      pogoapi: pogoTypes,
    });
    const sourceAliases = unique([
      string(existing?.speciesName), string(watPokemon?.pokemonName), string(seed.stats?.pokemon_name),
    ]).map((name) => ({ source: name === existing?.speciesName ? 'existing' : name === watPokemon?.pokemonName ? 'watwowmap' : 'pogoapi', name }));
    const sources = unique([
      existing && 'existing', game && 'pokeminers', candidate && 'watwowmap',
      (seed.stats || seed.types || seed.currentMoves || seed.maxCp || seed.evolutions) && 'pogoapi',
    ]);
    const unresolved = [];
    const moveRefs = { fast: [], charged: [], eliteFast: [], eliteCharged: [] };
    if (seed.currentMoves) {
      for (const [inputKey, outputKey, kind] of [
        ['fast_moves', 'fast', 'fast'],
        ['charged_moves', 'charged', 'charged'],
        ['elite_fast_moves', 'eliteFast', 'fast'],
        ['elite_charged_moves', 'eliteCharged', 'charged'],
      ]) {
        for (const moveName of seed.currentMoves[inputKey] ?? []) {
          const moveKey = moveResult.resolveMoveName(moveName, kind);
          if (moveKey) moveRefs[outputKey].push(moveKey);
          else unresolved.push(moveName);
        }
      }
    } else if (game) {
      for (const [inputKey, outputKey] of [
        ['fastMoveIds', 'fast'], ['chargedMoveIds', 'charged'],
        ['eliteFastMoveIds', 'eliteFast'], ['eliteChargedMoveIds', 'eliteCharged'],
      ]) {
        for (const gameMoveId of game[inputKey] ?? []) {
          const moveKey = moveResult.gameIdToKey.get(gameMoveId);
          if (moveKey) moveRefs[outputKey].push(moveKey);
          else unresolved.push(gameMoveId);
        }
      }
    }
    for (const moveType of Object.keys(moveRefs)) moveRefs[moveType] = unique(moveRefs[moveType]);
    const evolutions = new Map();
    for (const evolution of watSpecific?.evolutions ?? []) {
      const targetKey = `${evolution.evoId}:${evolution.formId}`;
      addEvolution(evolutions, {
        ...(seedByKey.has(targetKey) ? { targetKey } : {}),
        targetPokedexId: evolution.evoId,
        targetFormId: evolution.formId,
        conditions: {
          ...(number(evolution.candyCost) !== undefined ? { candy: evolution.candyCost } : {}),
          ...(integer(evolution.itemId) !== undefined ? { itemId: evolution.itemId } : {}),
          ...(integer(evolution.lureItemId) !== undefined ? { lureItemId: evolution.lureItemId } : {}),
          ...(number(evolution.distance) !== undefined ? { buddyDistanceKm: evolution.distance } : {}),
        },
        sources: ['watwowmap'],
      });
    }
    for (const evolution of seed.evolutions?.evolutions ?? []) {
      const targetCandidate = matchPogoForm(evolution.pokemon_id, evolution.form, candidatesByDex);
      addEvolution(evolutions, {
        ...(targetCandidate ? { targetKey: targetCandidate.key } : {}),
        targetPokedexId: evolution.pokemon_id,
        targetFormId: targetCandidate?.formId ?? null,
        conditions: {
          ...(number(evolution.candy_required) !== undefined ? { candy: evolution.candy_required } : {}),
          ...(string(evolution.item_required) ? { item: evolution.item_required } : {}),
          ...(string(evolution.lure_required) ? { lure: evolution.lure_required } : {}),
          ...(number(evolution.buddy_distance_required) !== undefined ? { buddyDistanceKm: evolution.buddy_distance_required } : {}),
          ...(typeof evolution.must_be_buddy_to_evolve === 'boolean' ? { mustBeBuddy: evolution.must_be_buddy_to_evolve } : {}),
          ...(evolution.only_evolves_in_daytime ? { timeOfDay: 'day' } : evolution.only_evolves_in_nighttime ? { timeOfDay: 'night' } : {}),
          ...(string(evolution.gender_required) ? { gender: evolution.gender_required } : {}),
          ...(typeof evolution.no_candy_cost_if_traded === 'boolean' ? { noCandyCostIfTraded: evolution.no_candy_cost_if_traded } : {}),
          ...(typeof evolution.upside_down === 'boolean' ? { upsideDown: evolution.upside_down } : {}),
        },
        sources: ['pogoapi'],
      });
    }
    for (const evolution of game?.evolutions ?? []) {
      const targetKey = existingKeyBySpeciesId.get(evolution.speciesId);
      const target = nonShadowRows.find((entry) => entry.speciesId === evolution.speciesId);
      if (!target) continue;
      addEvolution(evolutions, {
        ...(targetKey ? { targetKey } : {}),
        targetPokedexId: target.dex,
        targetFormId: targetKey ? seedByKey.get(targetKey)?.candidate?.formId ?? null : null,
        conditions: number(evolution.candyCost) !== undefined ? { candy: evolution.candyCost } : {},
        sources: ['pokeminers'],
      });
    }
    const shiny = shinyByDex[String(dex)];
    const normalizedForm = normalizeIdentifier(formNameEn);
    const shinyAvailable = normalizedForm === 'normal'
      ? Boolean(shiny)
      : normalizedForm === 'alola' ? Boolean(shiny?.alolan_shiny) : undefined;
    const entity = {
      key,
      pokedexId: dex,
      ...(existing?.speciesId ? { existingSpeciesId: existing.speciesId } : {}),
      names: { ja: japaneseName, en: englishName },
      form: {
        key: candidate?.temporaryEvolutionId !== undefined
          ? `temp:${candidate.temporaryEvolutionId}`
          : formId !== null ? String(formId) : normalizeIdentifier(formNameEn),
        id: formId,
        nameEn: formNameEn,
        ...(formNameJa ? { nameJa: formNameJa } : {}),
        ...(seed.stats?.form ? { pogoApi: seed.stats.form } : {}),
        ...(candidate?.proto ? { watWowMapProto: candidate.proto } : {}),
        ...(candidate?.temporaryEvolutionId !== undefined
          ? { temporaryEvolutionId: candidate.temporaryEvolutionId }
          : {}),
      },
      ...(watPokemon?.genId || watPokemon?.generation
        ? { generation: {
            ...(integer(watPokemon.genId) !== undefined ? { id: integer(watPokemon.genId) } : {}),
            ...(string(watPokemon.generation) ? { name: watPokemon.generation } : {}),
          } }
        : {}),
      types: selectedTypes,
      ...(selectedStats ? { stats: selectedStats } : {}),
      ...(integer(seed.maxCp?.max_cp) !== undefined ? { maxCp: integer(seed.maxCp.max_cp) } : {}),
      ...((number(watSpecific?.height ?? watPokemon?.height) !== undefined
        || number(watSpecific?.weight ?? watPokemon?.weight) !== undefined
        || Array.isArray(watPokemon?.sizeSettings))
        ? { size: {
            ...(number(watSpecific?.height ?? watPokemon?.height) !== undefined ? { heightM: number(watSpecific?.height ?? watPokemon?.height) } : {}),
            ...(number(watSpecific?.weight ?? watPokemon?.weight) !== undefined ? { weightKg: number(watSpecific?.weight ?? watPokemon?.weight) } : {}),
            ...(Array.isArray(watPokemon?.sizeSettings)
              ? { settings: Object.fromEntries(watPokemon.sizeSettings.map((setting) => [setting.name, setting.value])) }
              : {}),
          } }
        : {}),
      ...((number(watPokemon?.buddyGroupNumber) !== undefined
        || number(watPokemon?.buddyDistance) !== undefined
        || number(watPokemon?.buddyMegaEnergy) !== undefined)
        ? { buddy: {
            ...(number(watPokemon?.buddyGroupNumber) !== undefined ? { group: watPokemon.buddyGroupNumber } : {}),
            ...(number(watPokemon?.buddyDistance) !== undefined ? { candyDistanceKm: watPokemon.buddyDistance } : {}),
            ...(number(watPokemon?.buddyMegaEnergy) !== undefined ? { megaEnergy: watPokemon.buddyMegaEnergy } : {}),
          } }
        : {}),
      ...((number(watPokemon?.thirdMoveStardust) !== undefined || number(watPokemon?.thirdMoveCandy) !== undefined)
        ? { secondMoveCost: {
            ...(number(watPokemon?.thirdMoveStardust) !== undefined ? { stardust: watPokemon.thirdMoveStardust } : {}),
            ...(number(watPokemon?.thirdMoveCandy) !== undefined ? { candy: watPokemon.thirdMoveCandy } : {}),
          } }
        : {}),
      ...((number(watSpecific?.purificationDust ?? watPokemon?.purificationDust) !== undefined
        || number(watSpecific?.purificationCandy ?? watPokemon?.purificationCandy) !== undefined)
        ? { purificationCost: {
            ...(number(watSpecific?.purificationDust ?? watPokemon?.purificationDust) !== undefined ? { stardust: number(watSpecific?.purificationDust ?? watPokemon?.purificationDust) } : {}),
            ...(number(watSpecific?.purificationCandy ?? watPokemon?.purificationCandy) !== undefined ? { candy: number(watSpecific?.purificationCandy ?? watPokemon?.purificationCandy) } : {}),
          } }
        : {}),
      ...(watPokemon ? { eligibility: {
        ...(typeof watPokemon.gymDefenderEligible === 'boolean' ? { gymDefender: watPokemon.gymDefenderEligible } : {}),
        ...(typeof watPokemon.tradable === 'boolean' ? { tradable: watPokemon.tradable } : {}),
        ...(typeof watPokemon.transferable === 'boolean' ? { transferable: watPokemon.transferable } : {}),
      } } : {}),
      flags: {
        ...(typeof watPokemon?.legendary === 'boolean' ? { legendary: watPokemon.legendary } : {}),
        ...(typeof watPokemon?.mythic === 'boolean' ? { mythic: watPokemon.mythic } : {}),
        ...(typeof watPokemon?.ultraBeast === 'boolean' ? { ultraBeast: watPokemon.ultraBeast } : {}),
        ...(shinyAvailable !== undefined ? { shinyAvailable } : {}),
        ...(shinyAvailable && normalizedForm === 'normal' ? { shinyMethods: shinyFlags(shiny) } : {}),
        ...(existing?.speciesId
          && shadowSpeciesIds.has(existing.speciesId)
          && isRecord(pogo.shadow)
          && isRecord(pogo.shadow[String(dex)])
          ? { shadowAvailable: true }
          : {}),
        ...(typeof watForm?.isCostume === 'boolean' ? { costume: watForm.isCostume } : {}),
      },
      moves: {
        ...moveRefs,
        ...(unresolved.length > 0 ? { unresolved: unique(unresolved) } : {}),
      },
      evolutions: [...evolutions.values()],
      sourceInfo: {
        sources,
        fieldSources: {
          names: watJapaneseName ? 'watwowmap' : existing?.displayNameJa ? 'existing' : candidate ? 'watwowmap' : 'pogoapi',
          ...(candidate ? { form: 'watwowmap' } : seed.stats ? { form: 'pogoapi' } : { form: 'existing' }),
          ...(selectedTypes.length ? { types: selectedTypesSource } : {}),
          ...(selectedStats ? { stats: selectedStatsSource } : {}),
          ...(seed.maxCp ? { maxCp: 'pogoapi' } : {}),
          ...(watPokemon ? { size: 'watwowmap', buddy: 'watwowmap', costs: 'watwowmap' } : {}),
          ...(seed.currentMoves ? { moves: 'pogoapi' } : game ? { moves: 'pokeminers' } : {}),
          ...(evolutions.size > 0 ? { evolutions: seed.evolutions ? 'pogoapi' : candidate ? 'watwowmap' : 'pokeminers' } : {}),
          flags: candidate ? 'watwowmap' : shiny ? 'pogoapi' : 'existing',
        },
        ...(sourceAliases.length > 1 ? { aliases: sourceAliases } : {}),
      },
    };
    pokemon.push(entity);
  }

  pokemon.sort((a, b) => a.pokedexId - b.pokedexId || a.key.localeCompare(b.key, 'en', { numeric: true }));
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const unresolvedMoveNames = pokemon.reduce((total, entry) => total + (entry.moves.unresolved?.length ?? 0), 0);
  const coverage = {};
  for (const source of ['pogoapi', 'watwowmap', 'pokeminers', 'existing']) {
    coverage[`pokemon.${source}`] = pokemon.filter((entry) => entry.sourceInfo.sources.includes(source)).length;
    coverage[`moves.${source}`] = moveResult.moves.filter((entry) => entry.sources.includes(source)).length;
  }
  const metadata = {
    schemaVersion: 1,
    generatedAt,
    sources: input.sources ?? {},
    counts: {
      pokemon: pokemon.length,
      moves: moveResult.moves.length,
      conflicts: conflicts.length,
      unmatchedForms: unmatched.length,
      unresolvedMoveNames,
    },
    coverage,
    unmatchedForms: unmatched.slice(0, 200),
    conflicts: conflicts.slice(0, 200),
  };
  const output = {
    pokemon: { schemaVersion: 1, generatedAt, pokemon },
    moves: { schemaVersion: 1, generatedAt, moves: moveResult.moves },
    metadata,
  };
  validateUnifiedData(output);
  return output;
}

export function validateUnifiedData({ pokemon, moves, metadata }) {
  if (pokemon?.schemaVersion !== 1 || moves?.schemaVersion !== 1 || metadata?.schemaVersion !== 1) {
    throw new Error('Unified data schemaVersion is invalid.');
  }
  if (!Array.isArray(pokemon.pokemon) || !Array.isArray(moves.moves)) {
    throw new Error('Unified data collections are missing.');
  }
  const pokemonKeys = new Set();
  const speciesIds = new Map();
  for (const entry of pokemon.pokemon) {
    if (!string(entry.key) || !Number.isInteger(entry.pokedexId) || entry.pokedexId <= 0) {
      throw new Error('Unified Pokémon identity is invalid.');
    }
    if (pokemonKeys.has(entry.key)) throw new Error(`Duplicate Pokémon key: ${entry.key}`);
    pokemonKeys.add(entry.key);
    if (!string(entry.names?.ja) || !string(entry.names?.en)) {
      throw new Error(`Unified Pokémon name is missing: ${entry.key}`);
    }
    if (!Array.isArray(entry.types) || entry.types.some((type) => !CANONICAL_TYPES.has(type))) {
      throw new Error(`Unified Pokémon types are invalid: ${entry.key}`);
    }
    if (entry.stats && Object.values(entry.stats).some((value) => number(value) === undefined || value <= 0)) {
      throw new Error(`Unified Pokémon stats are invalid: ${entry.key}`);
    }
    if (entry.existingSpeciesId) {
      const previous = speciesIds.get(entry.existingSpeciesId);
      if (previous && previous !== entry.key) throw new Error(`Duplicate speciesId mapping: ${entry.existingSpeciesId}`);
      speciesIds.set(entry.existingSpeciesId, entry.key);
    }
    const evolutionEdges = new Set();
    for (const evolution of entry.evolutions ?? []) {
      const edge = evolution.targetKey ?? `${evolution.targetPokedexId}:${evolution.targetFormId}`;
      if (evolutionEdges.has(edge)) throw new Error(`Duplicate evolution edge: ${entry.key} -> ${edge}`);
      evolutionEdges.add(edge);
    }
  }
  const moveKeys = new Set();
  const moveIds = new Set();
  for (const move of moves.moves) {
    if (!string(move.key) || moveKeys.has(move.key)) throw new Error(`Duplicate move key: ${move.key}`);
    moveKeys.add(move.key);
    if (move.moveId !== undefined) {
      if (moveIds.has(move.moveId)) throw new Error(`Duplicate move ID: ${move.moveId}`);
      moveIds.add(move.moveId);
    }
  }
  for (const entry of pokemon.pokemon) {
    for (const reference of [
      ...entry.moves.fast, ...entry.moves.charged,
      ...entry.moves.eliteFast, ...entry.moves.eliteCharged,
    ]) {
      if (!moveKeys.has(reference)) throw new Error(`Orphan move reference: ${entry.key} -> ${reference}`);
    }
    for (const evolution of entry.evolutions ?? []) {
      if (evolution.targetKey && !pokemonKeys.has(evolution.targetKey)) {
        throw new Error(`Orphan evolution reference: ${entry.key} -> ${evolution.targetKey}`);
      }
    }
  }
  if (metadata.counts.pokemon !== pokemon.pokemon.length || metadata.counts.moves !== moves.moves.length) {
    throw new Error('Unified metadata counts do not match collections.');
  }
  return true;
}
