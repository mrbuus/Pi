export type ChoiceLabel =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'А'
  | 'Б'
  | 'В'
  | 'Г'
  | 'Д';

export type ChoiceExtractionIssueCode =
  | 'EMPTY_STATEMENT'
  | 'NO_OPTION_SEQUENCE'
  | 'AMBIGUOUS_OPTION_SEQUENCE'
  | 'EMPTY_STEM'
  | 'EMPTY_OPTION'
  | 'UNBALANCED_MATH'
  | 'UNBALANCED_BRACES'
  | 'UNBALANCED_LATEX_ENVIRONMENT'
  | 'UNSAFE_FRAGMENT';

export interface ChoiceExtractionIssue {
  code: ChoiceExtractionIssueCode;
  message: string;
}

export type ExtractedChoiceTuple = [string, string, string, string, string];

export interface ChoiceExtraction {
  stem: string;
  choices: ExtractedChoiceTuple | [];
  confidence: number;
  issues: ChoiceExtractionIssue[];
}

type MathDelimiter = '$' | '$$';

interface MathScan {
  balanced: boolean;
  mismatch: boolean;
  stateAt(index: number): MathDelimiter | null;
}

interface Marker {
  start: number;
  end: number;
  label: ChoiceLabel;
  ordinal: number;
}

const LATIN_LABELS: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
};

const CYRILLIC_LABELS: Record<string, number> = {
  А: 0,
  Б: 1,
  В: 2,
  Г: 3,
  Д: 4,
};

const MARKER_RE =
  /\(([A-Ea-eАБВГДабвгд])\)|([A-Ea-eАБВГДабвгд])[.)](?=$|[\s$\\])/g;
const LATEX_ENV_RE = /\\(begin|end)\{([a-zA-Z*]+)\}/g;

function issue(
  code: ChoiceExtractionIssueCode,
  message: string,
): ChoiceExtractionIssue {
  return { code, message };
}

function ordinalOf(label: string): number | null {
  const upper = label.toUpperCase();
  return LATIN_LABELS[upper] ?? CYRILLIC_LABELS[upper] ?? null;
}

function isEscaped(text: string, index: number): boolean {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i -= 1) slashes += 1;
  return slashes % 2 === 1;
}

function mathScan(text: string): MathScan {
  const delimiters: Array<{ index: number; token: MathDelimiter }> = [];
  let state: MathDelimiter | null = null;
  let mismatch = false;

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== '$' || isEscaped(text, i)) continue;
    const token: MathDelimiter = text[i + 1] === '$' ? '$$' : '$';
    if (token === '$$') i += 1;
    if (state === null) {
      state = token;
      delimiters.push({ index: i + 1 - token.length, token });
    } else if (state === token) {
      state = null;
      delimiters.push({ index: i + 1 - token.length, token });
    } else {
      mismatch = true;
      delimiters.push({ index: i + 1 - token.length, token });
    }
  }

  const balanced = state === null && !mismatch;
  return {
    balanced,
    mismatch,
    stateAt(index: number) {
      let current: MathDelimiter | null = null;
      for (const delimiter of delimiters) {
        if (delimiter.index >= index) break;
        if (current === null) current = delimiter.token;
        else if (current === delimiter.token) current = null;
        else return null;
      }
      return current;
    },
  };
}

function hasBalancedLatexEnvironments(text: string): boolean {
  const stack: string[] = [];
  LATEX_ENV_RE.lastIndex = 0;
  for (const match of text.matchAll(LATEX_ENV_RE)) {
    const [, kind, name] = match;
    if (kind === 'begin') stack.push(name);
    else if (stack.pop() !== name) return false;
  }
  return stack.length === 0;
}

function hasBalancedBraces(text: string): boolean {
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    if ((text[i] !== '{' && text[i] !== '}') || isEscaped(text, i)) continue;
    depth += text[i] === '{' ? 1 : -1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function isInsideBraces(text: string, index: number): boolean {
  let depth = 0;
  for (let i = 0; i < index; i += 1) {
    if ((text[i] !== '{' && text[i] !== '}') || isEscaped(text, i)) continue;
    depth += text[i] === '{' ? 1 : -1;
  }
  return depth > 0;
}

function trimSeparators(text: string): string {
  let result = text.trim();
  let previous = '';
  while (result !== previous) {
    previous = result;
    result = result.trimEnd();
    const commands = ['\\qquad', '\\quad', '\\enspace', '\\;', '\\,', '\\\\'];
    const command = commands.find((candidate) => result.endsWith(candidate));
    if (command) result = result.slice(0, -command.length);
    else result = result.replace(/\\hspace\{[^{}]*\}$/, '');
  }
  return result;
}

function hasBalancedMath(text: string): boolean {
  return mathScan(text).balanced;
}

function normalizeFragment(
  fragment: string,
  startState: MathDelimiter | null,
  endState: MathDelimiter | null,
): string | null {
  const value = trimSeparators(fragment);
  if (!value) return '';
  const scan = mathScan(value);
  if (scan.mismatch) return null;

  if (startState === endState) {
    if (startState === null) return scan.balanced ? value : null;
    // The source put several labeled choices inside one math span. Separate
    // each fragment into its own balanced span before returning it.
    const firstDelimiter = value.search(/(?<!\\)\$\$?/);
    if (firstDelimiter !== -1) return null;
    const wrapped = `${startState}${value}${startState}`;
    return hasBalancedMath(wrapped) ? wrapped : null;
  }

  if (startState === null && endState !== null) {
    const opening = value.startsWith(endState)
      ? value.slice(endState.length).trimStart()
      : null;
    if (opening === null || mathScan(value).mismatch) return null;
    const separated = `${endState}${opening}${endState}`;
    return hasBalancedMath(separated) ? separated : null;
  }
  if (startState !== null && endState === null) {
    const closing = value.endsWith(startState)
      ? value.slice(0, -startState.length).trimEnd()
      : null;
    if (closing === null || mathScan(value).mismatch) return null;
    const separated = `${startState}${closing}${startState}`;
    return hasBalancedMath(separated) ? separated : null;
  }
  return null;
}

function isBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  const previous = text[index - 1];
  if (/\s/.test(previous)) return true;
  const before = text.slice(0, index);
  if (
    /\\(?:qquad|quad|enspace|;|,|\\)$/.test(before) ||
    /\\hspace\{[^{}]*\}$/.test(before)
  )
    return true;
  // Inline math options may directly follow a closing math delimiter.
  if (previous !== '$') return false;
  if (mathScan(before).balanced) return true;
  // A marker may also follow the opening delimiter immediately.
  return mathScan(before.slice(0, -1)).balanced;
}

function collectMarkers(text: string): Marker[] {
  const markers: Marker[] = [];
  MARKER_RE.lastIndex = 0;
  for (const match of text.matchAll(MARKER_RE)) {
    const start = match.index ?? -1;
    if (start < 0 || isInsideBraces(text, start) || !isBoundary(text, start))
      continue;
    const raw = match[1] ?? match[2];
    if (!raw) continue;
    const end = start + match[0].length;
    markers.push({
      start,
      end,
      label: raw.toUpperCase() as ChoiceLabel,
      ordinal: ordinalOf(raw) ?? -1,
    });
  }
  return markers;
}

function optionRuns(markers: Marker[]): Marker[][] {
  const runs: Marker[][] = [];
  for (let start = 0; start < markers.length; start += 1) {
    if (markers[start].ordinal !== 0) continue;
    const run = [markers[start]];
    for (let expected = 1; expected < 5; expected += 1) {
      const next = markers[start + expected];
      if (!next || next.ordinal !== expected) break;
      run.push(next);
    }
    if (run.length === 5) runs.push(run);
  }
  return runs;
}

function failure(
  statement: string,
  issueValue: ChoiceExtractionIssue,
): ChoiceExtraction {
  return {
    stem: statement.trim(),
    choices: [],
    confidence: 0,
    issues: [issueValue],
  };
}

/**
 * Pulls a clearly labeled five-choice block out of a problem statement.
 * Ambiguous or malformed statements are returned unchanged for human review.
 */
export function extractChoices(
  statement: string | null | undefined,
): ChoiceExtraction {
  const source = typeof statement === 'string' ? statement : '';
  if (!source.trim()) {
    return failure(
      source,
      issue('EMPTY_STATEMENT', 'Бодлогын текст хоосон байна.'),
    );
  }
  if (!hasBalancedBraces(source)) {
    return failure(
      source,
      issue('UNBALANCED_BRACES', 'Текстийн `{` ба `}` тэнцвэргүй байна.'),
    );
  }

  const markers = collectMarkers(source);
  const runs = optionRuns(markers);
  if (runs.length === 0) {
    return failure(
      source,
      issue(
        'NO_OPTION_SEQUENCE',
        'A–E дарааллаар тодорхой таван сонголт олдсонгүй.',
      ),
    );
  }
  if (runs.length > 1) {
    return failure(
      source,
      issue(
        'AMBIGUOUS_OPTION_SEQUENCE',
        'Таван сонголтын дараалал нэгээс олон газар таарлаа.',
      ),
    );
  }

  const run = runs[0];
  const math = mathScan(source);
  if (!math.balanced) {
    return failure(
      source,
      issue('UNBALANCED_MATH', 'Текстийн LaTeX тэмдэглэгээ тэнцвэргүй байна.'),
    );
  }

  let rawStem = trimSeparators(source.slice(0, run[0].start));
  const stemEndState = math.stateAt(run[0].start);
  let stem = rawStem;
  if (stemEndState !== null) {
    if (rawStem.endsWith(stemEndState)) {
      // The delimiter can open one shared math span that contains all labels.
      // It belongs to the option block, so remove it from the preceding stem.
      rawStem = rawStem.slice(0, -stemEndState.length).trimEnd();
      stem = rawStem;
    } else {
      stem = `${stem}${stemEndState}`;
    }
  }
  if (!stem.trim()) {
    return failure(
      source,
      issue('EMPTY_STEM', 'Сонголтын өмнөх бодлогын хэсэг хоосон байна.'),
    );
  }

  const choices: string[] = [];
  for (let i = 0; i < run.length; i += 1) {
    const marker = run[i];
    const end = i + 1 < run.length ? run[i + 1].start : source.length;
    const raw = source.slice(marker.end, end);
    const normalized = normalizeFragment(
      raw,
      math.stateAt(marker.end),
      math.stateAt(end),
    );
    if (normalized === null) {
      return failure(
        source,
        issue(
          'UNSAFE_FRAGMENT',
          'Сонголтын зааг LaTeX-ийг аюулгүй салгах боломжгүй байна.',
        ),
      );
    }
    if (!normalized.trim()) {
      return failure(
        source,
        issue(
          'EMPTY_OPTION',
          `${String.fromCharCode(65 + i)} сонголт хоосон байна.`,
        ),
      );
    }
    choices.push(normalized);
  }

  if (
    !hasBalancedMath(stem) ||
    choices.some((choice) => !hasBalancedMath(choice))
  ) {
    return failure(
      source,
      issue(
        'UNBALANCED_MATH',
        'Салгасны дараах сонголтын LaTeX тэнцвэргүй байна.',
      ),
    );
  }
  if (
    !hasBalancedLatexEnvironments(stem) ||
    choices.some((choice) => !hasBalancedLatexEnvironments(choice))
  ) {
    return failure(
      source,
      issue(
        'UNBALANCED_LATEX_ENVIRONMENT',
        'Сонголтын зааг LaTeX орчныг (`begin`/`end`) хувааж байна.',
      ),
    );
  }

  const tuple = choices as ExtractedChoiceTuple;
  const firstIsCyrillic = run[0].label in CYRILLIC_LABELS;
  const labelsAreUniform = run.every(
    (marker) => marker.label in CYRILLIC_LABELS === firstIsCyrillic,
  );
  const confidence = labelsAreUniform ? 0.98 : 0.82;
  return { stem, choices: tuple, confidence, issues: [] };
}
