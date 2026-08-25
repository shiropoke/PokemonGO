import { load } from 'cheerio';

export function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeDialogue(value) {
  const document = load(`<body>${String(value ?? '')}</body>`);
  document('script, style, template').remove();
  return normalizeWhitespace(document('body').text());
}

export function dedupeDialogues(values) {
  return [...new Set(values.map(normalizeDialogue).filter(Boolean))];
}

function normalizeIdentityPart(value) {
  return normalizeWhitespace(value).normalize('NFKC').toLocaleLowerCase('en-US');
}

export function createRocketDialogueIdentity({ title, trainerName, type }) {
  return [title, trainerName, type ?? ''].map(normalizeIdentityPart).join('::');
}

function readProfileType(profile, trainerName) {
  const typeAlt = normalizeWhitespace(profile.find('.type img[alt]').first().attr('alt'));
  const altMatch = typeAlt.match(/^(.+?)\s+type$/i);
  if (altMatch?.[1]) return normalizeWhitespace(altMatch[1]).toLowerCase();

  const nameMatch = trainerName.match(/^([a-z]+)-type\b/i);
  return nameMatch?.[1]?.toLowerCase() ?? null;
}

function readProfileDialogues(document, profile) {
  const quoteTexts = profile.find('.quote-text, blockquote, q')
    .toArray()
    .map((element) => document(element).html() ?? '');
  if (quoteTexts.length > 0) return dedupeDialogues(quoteTexts);

  const quote = normalizeDialogue(profile.find('.quote').first().html() ?? '');
  return dedupeDialogues([quote.replace(/^[“"]\s*|\s*[”"]$/g, '')]);
}

function findLeekProfileElements(document) {
  const directProfiles = document('.rocket-profile').toArray();
  if (directProfiles.length > 0) return directProfiles;

  const relatedContainers = [];
  for (const nameElement of document('.name').toArray()) {
    let candidate = document(nameElement).parent();
    for (let depth = 0; depth < 7 && candidate.length > 0; depth += 1) {
      const hasTitle = candidate.find('.title').length > 0;
      const hasQuote = candidate.find('.quote-text, .quote, blockquote, q').length > 0;
      if (hasTitle && hasQuote) {
        relatedContainers.push(candidate[0]);
        break;
      }
      candidate = candidate.parent();
    }
  }
  return [...new Set(relatedContainers.filter(Boolean))];
}

export function extractLeekDuckEntries(html) {
  const document = load(html);
  return findLeekProfileElements(document)
    .flatMap((element) => {
      const profile = document(element);
      const trainerName = normalizeWhitespace(profile.find('.name').first().text());
      const title = normalizeWhitespace(profile.find('.title').first().text());
      const type = readProfileType(profile, trainerName);
      const dialogues = readProfileDialogues(document, profile);
      if (!trainerName || !title || dialogues.length === 0) return [];

      return [{
        identity: createRocketDialogueIdentity({ title, trainerName, type }),
        trainerName,
        title,
        type,
        dialogues,
      }];
    });
}

function splitCellByBreaks(document, cell) {
  const clone = cell.clone();
  clone.find('br').replaceWith('\n');
  return dedupeDialogues(clone.text().split(/\r?\n/));
}

export function extractSerebiiMixedDialogues(html) {
  const document = load(html);
  for (const row of document('table tr').toArray()) {
    const cells = document(row).find('td');
    if (cells.length < 2) continue;
    if (normalizeWhitespace(cells.eq(0).text()).toLowerCase() !== 'mixed') continue;
    return splitCellByBreaks(document, cells.eq(1));
  }
  return [];
}

export function mergeMixedGruntDialogues(entries, mixedDialogues) {
  const supplemental = dedupeDialogues(mixedDialogues);
  return entries.map((entry) => {
    const isMixedGrunt = entry.title === 'Team GO Rocket Grunt'
      && entry.type === null
      && (entry.trainerName === 'Male Grunt' || entry.trainerName === 'Female Grunt');
    return isMixedGrunt
      ? { ...entry, dialogues: dedupeDialogues([...entry.dialogues, ...supplemental]) }
      : entry;
  });
}
