import { PLACEMENT_TESTS, gradePlacement, parseProblems, publicTest } from './placement-tests';
import { isImageBytes, sanitizeAnswers } from './placement.service';

const t = PLACEMENT_TESTS['math-v1'];

describe('Түвшин тогтоох шалгалт', () => {
  it('нийтийн хувилбарт хариу байхгүй', () => {
    const pub = publicTest(t);
    expect(JSON.stringify(pub)).not.toContain('"answer"');
    expect(pub.problems).toHaveLength(10);
  });

  it('PDF-ийн хариугаар бүрэн оноо авна', () => {
    const answers = { 1: 'E', 2: 'C', 3: 'D', 4: 'A', 5: 'E', 6: 'D', 7: 'C', 8: 'D', 9: 'E', 10: { a: '6', b: '2', c: '2', de: '12', fg: '28' } };
    const g = gradePlacement(t, answers);
    expect(g.score).toBe(11);
    expect(g.max).toBe(11);
  });

  it('хоосон хариу ба нэг нүд буруу бол оноогүй', () => {
    const g = gradePlacement(t, { 10: { a: '6', b: '2', c: '2', de: '12', fg: '27' } });
    expect(g.score).toBe(0);
    expect(g.perProblem['1']).toBe(false);
    expect(g.perProblem['10']).toBe(false);
  });

  it('хариуг цэвэрлэнэ: байхгүй бодлого, буруу сонголт хасагдана', () => {
    const clean = sanitizeAnswers(t, { 1: 'E', 2: 'Z', 99: 'A', 10: { a: '6x', de: '12', hack: '1' } });
    expect(clean).toEqual({ 1: 'E', 10: { a: '6', de: '12' } });
  });

  it('удирдлагаас ирсэн бодлогыг шалгана', () => {
    expect(parseProblems([])).toMatch(/нэг бодлого/);
    expect(parseProblems([{ kind: 'choice', statement: '$x=1$', choices: { A: '1', B: '2' }, answer: 'C' }])).toMatch(/зөв хариу/);
    const ok = parseProblems([
      { kind: 'choice', statement: '  $x+1=2$  ', choices: { A: '$1$', B: '$2$' }, answer: 'A', points: 2 },
      { kind: 'boxes', statement: '$[a]$', boxes: [{ key: 'A', digits: 1 }], answer: { a: '5' } },
    ]);
    expect(Array.isArray(ok) && ok.map((p) => [p.n, p.statement, p.points])).toEqual([[1, '$x+1=2$', 2], [2, '$[a]$', 1]]);
  });

  it('зургийг агуулгаар нь таньна, HTML-ийг татгалзана', () => {
    expect(isImageBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('jpg');
    expect(isImageBytes(Buffer.from('<html><script>x</script>'))).toBeNull();
  });
});
