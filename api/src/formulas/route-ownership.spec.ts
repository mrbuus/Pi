import { PATH_METADATA } from '@nestjs/common/constants';
import { ContentController } from '../content/content.controller';

// ContentController (@Controller() угтваргүй) нь FormulasModule-ээс өмнө
// бүртгэгддэг. Түүнд 'formulas' зам байвал GET /formulas-ийг бүрэн дарна.
describe('GET /formulas route ownership', () => {
  it('ContentController does not declare a formulas route', () => {
    const proto = ContentController.prototype as unknown as Record<string, unknown>;
    const paths = Object.getOwnPropertyNames(proto)
      .filter((name) => name !== 'constructor' && typeof proto[name] === 'function')
      .map((name) => Reflect.getMetadata(PATH_METADATA, proto[name] as object) as string | undefined);
    expect(paths).not.toContain('formulas');
  });
});
