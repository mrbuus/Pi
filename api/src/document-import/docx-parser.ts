import JSZip from 'jszip';
import { SaxesParser } from 'saxes';
import katex from 'katex';
import type { Readable } from 'node:stream';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const M = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
export const MAX_DOCX_BYTES = 10 * 1024 * 1024;
const MAX_EXPANDED = 40 * 1024 * 1024;
interface Node {
  name: string;
  uri: string;
  attrs: Record<string, string>;
  children: Node[];
  text: string;
  start: number;
  end: number;
}
export interface ImportWarning {
  code: string;
  message: string;
  sourceXml?: string;
}
export interface ImportBlock {
  id: string;
  kind: 'paragraph' | 'table';
  text: string;
  sourceXml: string;
  warnings: ImportWarning[];
  rows?: ImportBlock[][][];
}
export interface DocumentPreview {
  version: 1;
  filename: string;
  blocks: ImportBlock[];
  warnings: ImportWarning[];
  equationCount: number;
  canAutoImport: false;
}

function parseXml(xml: string): Node {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error('DTD болон entity зөвшөөрөхгүй.');
  const parser = new SaxesParser({ xmlns: true });
  const root: Node = {
    name: 'root',
    uri: '',
    attrs: {},
    children: [],
    text: '',
    start: 0,
    end: xml.length,
  };
  const stack = [root];
  let count = 0;
  parser.on('opentag', (tag) => {
    if (stack.length > 128 || ++count > 250000)
      throw new Error('Баримтын бүтэц хэт том эсвэл гүн байна.');
    const attrs: Record<string, string> = {};
    Object.values(tag.attributes).forEach((a) => {
      attrs[a.local] = a.value;
    });
    const node: Node = {
      name: tag.local,
      uri: tag.uri,
      attrs,
      children: [],
      text: '',
      start: xml.lastIndexOf('<', parser.position - 1),
      end: 0,
    };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });
  parser.on('text', (text) => {
    stack[stack.length - 1].text += text;
  });
  parser.on('closetag', () => {
    const node = stack.pop()!;
    node.end = parser.position;
  });
  parser.on('error', (e) => {
    throw e;
  });
  parser.write(xml).close();
  return root;
}
const child = (n: Node, name: string) =>
  n.children.find((c) => c.name === name && c.uri === M);
const descendants = (n: Node): Node[] => [
  n,
  ...n.children.flatMap(descendants),
];
const symbols: Record<string, string> = {
  π: '\\pi ',
  α: '\\alpha ',
  β: '\\beta ',
  γ: '\\gamma ',
  θ: '\\theta ',
  Δ: '\\Delta ',
  λ: '\\lambda ',
  μ: '\\mu ',
  σ: '\\sigma ',
  ω: '\\omega ',
  '∞': '\\infty ',
  '∫': '\\int ',
  '∑': '\\sum ',
  '∏': '\\prod ',
  '×': '\\times ',
  '÷': '\\div ',
  '⋅': '\\cdot ',
  '≤': '\\le ',
  '≥': '\\ge ',
  '≠': '\\ne ',
  '±': '\\pm ',
  '→': '\\to ',
  '∈': '\\in ',
  '∂': '\\partial ',
};
function mathText(s: string) {
  if (/[\\^~]/.test(s))
    throw new Error(
      'Томьёоны энгийн бичвэр дэх тусгай тэмдэгтийг гараар шалгана уу.',
    );
  const tokens: string[] = [];
  const accents: Record<string, string> = {
    '\u0302': 'hat',
    '\u0303': 'tilde',
    '\u0304': 'bar',
    '\u0305': 'overline',
    '\u0307': 'dot',
    '\u0308': 'ddot',
    '\u0332': 'underline',
    '\u20d7': 'vec',
  };
  for (const c of Array.from(s)) {
    if (accents[c]) {
      const previous = tokens.pop();
      if (!previous) throw new Error('Томьёоны өргөлтийн үндсэн тэмдэгт алга.');
      tokens.push(`\\${accents[c]}{${previous}}`);
    } else
      tokens.push(
        c >= '①' && c <= '⑳'
          ? `\\text{\\textcircled{${c.codePointAt(0)! - 9311}}}`
          : (symbols[c] ?? (/[\\{}#$%&_]/.test(c) ? `\\${c}` : c)),
      );
  }
  return tokens
    .join('')
    .replace(
      /[\u0400-\u04ff]+(?:[ ]+[\u0400-\u04ff]+)*/g,
      (t) => `\\text{${t}}`,
    );
}
function math(n: Node): string {
  const seq = () =>
    n.children
      .filter((c) => !c.name.endsWith('Pr'))
      .map(math)
      .join('') + mathText(n.text);
  const get = (key: string) => {
    const c = child(n, key);
    if (!c) throw new Error(`Томьёоны ${key} хэсэг дутуу.`);
    return math(c);
  };
  const prop = (key: string, fallback: string) =>
    child(child(n, `${n.name}Pr`) ?? n, key)?.attrs.val ?? fallback;
  if (n.uri !== M) {
    if (
      n.name.endsWith('Pr') ||
      (n.uri === W && n.name === 'lastRenderedPageBreak')
    )
      return '';
    throw new Error(`Томьёонд ${n.name} бүтэц дэмжигдэхгүй.`);
  }
  switch (n.name) {
    case 'oMath':
    case 'e':
    case 'num':
    case 'den':
    case 'deg':
    case 'sub':
    case 'sup':
    case 'lim':
    case 'fName':
    case 't':
      return seq();
    case 'r': {
      const normal = child(child(n, 'rPr') ?? n, 'nor');
      return normal ? `\\text{${seq()}}` : seq();
    }
    case 'f': {
      const type = prop('type', 'bar');
      if (type === 'bar') return `\\frac{${get('num')}}{${get('den')}}`;
      if (type === 'noBar') return `\\binom{${get('num')}}{${get('den')}}`;
      throw new Error(`Бутархайн ${type} хэлбэрийг шалгана уу.`);
    }
    case 'sSup':
      return `{${get('e')}}^{${get('sup')}}`;
    case 'sSub':
      return `{${get('e')}}_{${get('sub')}}`;
    case 'sSubSup':
      return `{${get('e')}}_{${get('sub')}}^{${get('sup')}}`;
    case 'rad': {
      const degree = child(n, 'deg');
      return prop('degHide', '0') === '1' || !degree || !math(degree)
        ? `\\sqrt{${get('e')}}`
        : `\\sqrt[${math(degree)}]{${get('e')}}`;
    }
    case 'nary': {
      const sign = prop('chr', '∫');
      if (!['∫', '∑', '∏', '∬', '∭', '∮'].includes(sign))
        throw new Error(`Оператор ${sign} дэмжигдэхгүй.`);
      const op =
        (
          { '∬': '\\iint ', '∭': '\\iiint ', '∮': '\\oint ' } as Record<
            string,
            string
          >
        )[sign] ?? symbols[sign];
      return (
        op +
        (prop('subHide', '0') === '1' ? '' : `_{${get('sub')}}`) +
        (prop('supHide', '0') === '1' ? '' : `^{${get('sup')}}`) +
        `{${get('e')}}`
      );
    }
    case 'acc': {
      const c = prop('chr', '̂');
      const command = (
        {
          '̂': 'hat',
          '̅': 'bar',
          '⃗': 'vec',
          '→': 'vec',
          '̃': 'tilde',
          '̇': 'dot',
          '̈': 'ddot',
        } as Record<string, string>
      )[c];
      if (!command) throw new Error(`Өргөлт ${c} дэмжигдэхгүй.`);
      return `\\${command}{${get('e')}}`;
    }
    case 'd': {
      const delimiter = (s: string) =>
        s === ''
          ? '.'
          : s === '{' || s === '}'
            ? `\\${s}`
            : ['(', ')', '[', ']', '|'].includes(s)
              ? s
              : (() => {
                  throw new Error('Хаалтын хэлбэрийг шалгана уу.');
                })();
      return `\\left${delimiter(prop('begChr', '('))}${n.children
        .filter((c) => c.name === 'e')
        .map(math)
        .join(' \\mid ')}\\right${delimiter(prop('endChr', ')'))}`;
    }
    case 'm':
      return `\\begin{matrix}${n.children
        .filter((c) => c.name === 'mr')
        .map((r) =>
          r.children
            .filter((c) => c.name === 'e')
            .map(math)
            .join(' & '),
        )
        .join(' \\\\ ')}\\end{matrix}`;
    case 'eqArr':
      return `\\begin{gathered}${n.children
        .filter((c) => c.name === 'e')
        .map(math)
        .join(' \\\\ ')}\\end{gathered}`;
    case 'func':
      return `${get('fName')}\\,${get('e')}`;
    case 'limLow':
      return `\\underset{${get('lim')}}{${get('e')}}`;
    case 'limUpp':
      return `\\overset{${get('lim')}}{${get('e')}}`;
    default:
      throw new Error(`Томьёоны ${n.name} бүтэц дэмжигдэхгүй.`);
  }
}

// Inspect central directory BEFORE any inflation. Reject ZIP64, encrypted entries,
// excessive entry count, advertised expansion and unsafe paths.
function validateZip(buffer: Buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--)
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error('Зөв DOCX ZIP файл биш.');
  const entries = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  let total = 0;
  if (
    entries > 2000 ||
    entries === 65535 ||
    buffer.readUInt16LE(end + 4) ||
    buffer.readUInt16LE(end + 6)
  )
    throw new Error('ZIP бүтэц дэмжигдэхгүй эсвэл хэт олон хэсэгтэй.');
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50)
      throw new Error('ZIP бүтэц гэмтсэн.');
    const size = buffer.readUInt32LE(offset + 24);
    const flags = buffer.readUInt16LE(offset + 8);
    const length = buffer.readUInt16LE(offset + 28);
    const name = buffer
      .subarray(offset + 46, offset + 46 + length)
      .toString('utf8');
    total += size;
    if (
      flags & 1 ||
      size === 0xffffffff ||
      total > MAX_EXPANDED ||
      /(^\/|(^|\/)\.\.(\/|$)|\\)/.test(name)
    )
      throw new Error('ZIP хэмжээ эсвэл зам зөвшөөрөгдөхгүй.');
    offset +=
      46 +
      length +
      buffer.readUInt16LE(offset + 30) +
      buffer.readUInt16LE(offset + 32);
  }
}
async function boundedRead(entry: JSZip.JSZipObject): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  return new Promise((resolve, reject) => {
    const stream = entry.nodeStream() as Readable;
    stream.on('data', (data: Buffer) => {
      size += data.length;
      if (size > 12 * 1024 * 1024) {
        stream.destroy();
        reject(new Error('Баримтын текст хэт том байна.'));
      } else chunks.push(data);
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}
export async function previewDocx(
  buffer: Buffer,
  filename: string,
): Promise<DocumentPreview> {
  if (!/\.docx$/i.test(filename) || filename.startsWith('~$'))
    throw new Error(
      'Зөвхөн .docx файл оруулна. .doc файлыг Word дээр .docx болгож хадгална уу.',
    );
  if (!buffer.length || buffer.length > MAX_DOCX_BYTES)
    throw new Error('Файлын хэмжээ 10 МБ-аас ихгүй байна.');
  validateZip(buffer);
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file('word/document.xml');
  if (!entry || !zip.file('[Content_Types].xml'))
    throw new Error('Word DOCX баримтын үндсэн хэсэг алга.');
  const xml = await boundedRead(entry);
  if (
    /\uFFFD/.test(xml) ||
    /encoding=["'](?!UTF-8["']|utf-8["']|UTF8["']|utf8["'])/i.test(xml)
  )
    throw new Error('Зөв UTF-8 XML баримт шаардлагатай.');
  const tree = parseXml(xml);
  const body = descendants(tree).find((n) => n.uri === W && n.name === 'body');
  if (!body) throw new Error('Word баримтын бүтэц олдсонгүй.');
  let index = 0;
  let equations = 0;
  let sourceBudget = 0;
  const source = (n: Node) => {
    sourceBudget += n.end - n.start;
    if (sourceBudget > 32 * 1024 * 1024)
      throw new Error('Урьдчилсан харагдацын нийт агуулга хэт том байна.');
    return xml.slice(n.start, n.end);
  };
  const block = (n: Node): ImportBlock => {
    const warnings: ImportWarning[] = [];
    if (n.uri !== W || !['p', 'tbl'].includes(n.name))
      warnings.push({
        code: 'REVIEW_CONTAINER',
        message: 'Тусгай агуулгын бүтэцтэй хэсгийг эх баримттай тулгана.',
        sourceXml: source(n),
      });
    const visit = (node: Node): string => {
      if (node.uri === M && node.name === 'oMath') {
        equations++;
        try {
          if (source(node).length > 20000 || equations > 10000)
            throw new Error('Томьёоны хэмжээ эсвэл тоо хязгаараас их байна.');
          const unsupportedProperty = descendants(node).find(
            (x) =>
              x.uri === M &&
              [
                'grow',
                'shp',
                'sepChr',
                'sPre',
                'phant',
                'box',
                'borderBox',
                'bar',
                'groupChr',
                'brk',
              ].includes(x.name),
          );
          if (unsupportedProperty)
            throw new Error(
              `Томьёоны ${unsupportedProperty.name} тохиргоог гараар шалгана уу.`,
            );
          const latex = math(node);
          katex.renderToString(latex, {
            throwOnError: true,
            trust: false,
            maxExpand: 1000,
            strict: 'error',
          });
          return `$${latex}$`;
        } catch (e) {
          warnings.push({
            code: 'UNSUPPORTED_MATH',
            message: (e as Error).message.startsWith('KaTeX')
              ? 'Томьёоны тэмдэгт эсвэл хөрвүүлсэн хэлбэрийг гараар шалгана уу.'
              : (e as Error).message,
            sourceXml: source(node),
          });
          return '[Томьёог гараар шалгана уу]';
        }
      }
      if (node.uri === W && ['drawing', 'pict', 'object'].includes(node.name)) {
        warnings.push({
          code: 'MANUAL_FIGURE',
          message:
            'Зураг / хуучин Equation объектыг эх баримтаас гараар хавсаргана.',
          sourceXml: source(node),
        });
        return '[Зураг / объект хавсаргах]';
      }
      if (
        node.uri === W &&
        ['numPr', 'vertAlign', 'gridSpan', 'vMerge'].includes(node.name)
      )
        warnings.push({
          code: 'REVIEW_LAYOUT',
          message:
            'Жагсаалтын дугаар, индекс эсвэл нэгтгэсэн нүдийг эх баримттай тулгана.',
          sourceXml: source(node),
        });
      if (
        node.uri === W &&
        [
          'del',
          'ins',
          'moveFrom',
          'moveTo',
          'fldSimple',
          'fldChar',
          'instrText',
          'altChunk',
          'sym',
        ].includes(node.name)
      )
        warnings.push({
          code: 'REVIEW_STRUCTURE',
          message:
            'Засварын түүх, талбар эсвэл тусгай агуулгыг эх баримттай тулгана.',
          sourceXml: source(node),
        });
      if (node.uri === W && node.name === 't') {
        if (node.text.includes('$'))
          warnings.push({
            code: 'LITERAL_DOLLAR',
            message: 'Энгийн бичвэрийн доллар тэмдэгтийг гараар шалгана.',
            sourceXml: source(node),
          });
        return node.text.replace(/\$/g, '＄');
      }
      if (node.uri === W && ['tab', 'br', 'cr'].includes(node.name))
        return node.name === 'tab' ? '\t' : '\n';
      return node.children.map(visit).join('');
    };
    if (n.name === 'tbl') {
      const rows = n.children
        .filter((c) => c.name === 'tr' && c.uri === W)
        .map((r) =>
          r.children
            .filter((c) => c.name === 'tc' && c.uri === W)
            .map((c) =>
              c.children
                .filter((x) => ['p', 'tbl'].includes(x.name) && x.uri === W)
                .map(block),
            ),
        );
      return {
        id: `block-${++index}`,
        kind: 'table',
        text: rows
          .map((r) => r.map((c) => c.map((b) => b.text).join('\n')).join('\t'))
          .join('\n'),
        sourceXml: source(n),
        warnings: [
          ...descendants(n)
            .filter(
              (x) => x.uri === W && ['gridSpan', 'vMerge'].includes(x.name),
            )
            .map((x) => ({
              code: 'MERGED_CELL',
              message: 'Нэгтгэсэн нүдний бүтэц: эх баримттай тулгана.',
              sourceXml: source(x),
            })),
          {
            code: 'TABLE_MAPPING',
            message:
              'Хүснэгтийн нүдийг асуулт, сонголт, хариутай гараар холбоно.',
          },
        ],
        rows,
      };
    }
    return {
      id: `block-${++index}`,
      kind: 'paragraph',
      text: visit(n),
      sourceXml: source(n),
      warnings,
    };
  };
  const blocks = body.children.filter((n) => n.name !== 'sectPr').map(block);
  const warnings: ImportWarning[] = [
    {
      code: 'MANUAL_MAPPING',
      message:
        'Асуулт, сонголт, зөв хариуг багш гараар холбож баталгаажуулна. Автоматаар хадгалахгүй.',
    },
  ];
  if (
    Object.keys(zip.files).some((n) =>
      /^word\/(header|footer|footnotes|endnotes)/.test(n),
    )
  )
    warnings.push({
      code: 'OTHER_PARTS',
      message:
        'Толгой, хөл, зүүлтийг энэ урьдчилсан харагдацад оруулаагүй. Эх баримттай тулгана.',
    });
  return {
    version: 1,
    filename,
    blocks,
    warnings,
    equationCount: equations,
    canAutoImport: false,
  };
}
