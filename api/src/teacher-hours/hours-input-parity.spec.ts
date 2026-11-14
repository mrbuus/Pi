// Вэбийн нүдний шалгалт (web/src/lib/hoursInput.ts) сервертэй ЯГ ижил үр дүн
// өгч байгааг шалгана — нэг нь «зөв» гэхэд нөгөө нь «буруу» гэвэл хэрэглэгч
// хадгалж чадахгүй нүдтэй үлдэнэ.
import * as server from './work-sheet.logic';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const web = require('../../../web/src/lib/hoursInput') as typeof import('../../../web/src/lib/hoursInput');

const INPUTS = [
  '', ' ', '0', '7', '7.5', '7,5', ' 9,5 ', '.5', ',5', '7.', '24', '24.0', '24.00', '24.01', '25',
  '7.555', '7,25', '0,05', 'abc', '-1', '+5', '1e1', '.', ',', '7.5.1', '100', '07', '7 5',
];

describe('Вэб ба серверийн цагийн уншилт ижил', () => {
  it.each(INPUTS)('«%s»', (raw) => {
    expect(web.parseHoursInput(raw)).toEqual(server.parseHoursInput(raw));
  });

  it('бичих хэлбэр ижил', () => {
    for (let h = 0; h <= 2400; h++) expect(web.formatHundredths(h)).toBe(server.formatHundredths(h));
    expect(web.formatHundredths(null)).toBe(server.formatHundredths(null));
  });
});
