import JSZip from 'jszip';
import { previewDocx } from './docx-parser';
const ns =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';
const text = (s: string) => `<m:r><m:t>${s}</m:t></m:r>`;
const equation = (s: string) => `<w:p><m:oMath>${s}</m:oMath></w:p>`;
async function doc(body: string) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file(
    'word/document.xml',
    `<w:document ${ns}><w:body>${body}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}
describe('bounded DOCX OMML preview', () => {
  it('preserves combining accents and ignores Word pagination markers', async () => {
    const preview = await previewDocx(
      await doc(
        equation(text('①̲ x̄') + '<m:r><w:lastRenderedPageBreak/></m:r>'),
      ),
      'accents.docx',
    );
    expect(preview.blocks[0].text).toBe(
      '$\\underline{\\text{\\textcircled{1}}} \\bar{x}$',
    );
    expect(preview.blocks[0].warnings).toEqual([]);
  });
  it('converts fractions, roots, scripts, integrals, vectors and matrices with valid KaTeX', async () => {
    const input = [
      `<m:f><m:num>${text('1')}</m:num><m:den>${text('2')}</m:den></m:f>`,
      `<m:rad><m:deg>${text('3')}</m:deg><m:e>${text('x')}</m:e></m:rad>`,
      `<m:sSubSup><m:e>${text('x')}</m:e><m:sub>${text('i')}</m:sub><m:sup>${text('2')}</m:sup></m:sSubSup>`,
      `<m:nary><m:naryPr><m:chr m:val="∫"/></m:naryPr><m:sub>${text('0')}</m:sub><m:sup>${text('1')}</m:sup><m:e>${text('x')}</m:e></m:nary>`,
      `<m:acc><m:accPr><m:chr m:val="⃗"/></m:accPr><m:e>${text('v')}</m:e></m:acc>`,
      `<m:m><m:mr><m:e>${text('1')}</m:e><m:e>${text('2')}</m:e></m:mr><m:mr><m:e>${text('3')}</m:e><m:e>${text('4')}</m:e></m:mr></m:m>`,
    ];
    const p = await previewDocx(
      await doc(input.map(equation).join('')),
      'math.docx',
    );
    expect(p.equationCount).toBe(6);
    expect(p.blocks.flatMap((b) => b.warnings)).toEqual([]);
    expect(p.blocks.map((b) => b.text)).toEqual([
      '$\\frac{1}{2}$',
      '$\\sqrt[3]{x}$',
      '${x}_{i}^{2}$',
      '$\\int _{0}^{1}{x}$',
      '$\\vec{v}$',
      '$\\begin{matrix}1 & 2 \\\\ 3 & 4\\end{matrix}$',
    ]);
    expect(p.blocks[0].sourceXml).toBe(equation(input[0]));
  });
  it('retains unsupported math exactly and does not emit guessed LaTeX', async () => {
    const raw =
      '<m:oMath><m:phant><m:e>' + text('x') + '</m:e></m:phant></m:oMath>';
    const p = await previewDocx(
      await doc(`<w:p>${raw}</w:p>`),
      'unsupported.docx',
    );
    expect(p.blocks[0].warnings[0].code).toBe('UNSUPPORTED_MATH');
    expect(p.blocks[0].warnings[0].sourceXml).toBe(raw);
    expect(p.blocks[0].text).not.toContain('$');
  });
  it('keeps paragraphs and table cells in source order and flags objects', async () => {
    const p = await previewDocx(
      await doc(
        '<w:p><w:r><w:t>before</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:drawing/></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:t>after</w:t></w:r></w:p>',
      ),
      'table.docx',
    );
    expect(p.blocks.map((b) => b.kind)).toEqual([
      'paragraph',
      'table',
      'paragraph',
    ]);
    expect(p.blocks[1].rows![0][0][0].text).toBe('A');
    expect(p.blocks[1].rows![0][1][0].warnings[0].code).toBe('MANUAL_FIGURE');
    expect(p.canAutoImport).toBe(false);
  });
  it('fails closed for legacy, malformed XML, DTD, excessive depth and forged expansion', async () => {
    await expect(
      previewDocx(Buffer.from('not zip'), 'x.doc'),
    ).rejects.toThrow();
    await expect(
      previewDocx(Buffer.from('not zip'), 'x.docx'),
    ).rejects.toThrow();
    await expect(previewDocx(await doc('<w:p>'), 'x.docx')).rejects.toThrow();
    await expect(
      previewDocx(await doc('<!DOCTYPE x>'), 'x.docx'),
    ).rejects.toThrow();
    await expect(
      previewDocx(
        await doc('<w:p>'.repeat(140) + '</w:p>'.repeat(140)),
        'x.docx',
      ),
    ).rejects.toThrow();
    const bomb = await doc('<w:p/>');
    const central = bomb.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    bomb.writeUInt32LE(50 * 1024 * 1024, central + 24);
    await expect(previewDocx(bomb, 'x.docx')).rejects.toThrow();
  });
  it('honors namespace URI instead of trusting prefix labels', async () => {
    const p = await previewDocx(
      await doc(equation(text('x'))).then((b) => b),
      'x.docx',
    );
    expect(p.blocks[0].text).toBe('$x$');
    const alternate = new JSZip();
    alternate.file('[Content_Types].xml', '<Types/>');
    alternate.file(
      'word/document.xml',
      `<z:document xmlns:z="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mm="http://schemas.openxmlformats.org/officeDocument/2006/math"><z:body><z:p><mm:oMath><mm:r><mm:t>x</mm:t></mm:r></mm:oMath></z:p></z:body></z:document>`,
    );
    expect(
      (
        await previewDocx(
          await alternate.generateAsync({ type: 'nodebuffer' }),
          'prefix.docx',
        )
      ).blocks[0].text,
    ).toBe('$x$');
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<Types/>');
    zip.file(
      'word/document.xml',
      '<w:document xmlns:w="wrong"><w:body/></w:document>',
    );
    await expect(
      previewDocx(await zip.generateAsync({ type: 'nodebuffer' }), 'x.docx'),
    ).rejects.toThrow();
  });
});
