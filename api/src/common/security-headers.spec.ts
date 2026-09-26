import type { Request, Response, NextFunction } from 'express';
import { securityHeaders } from './security-headers';

describe('securityHeaders', () => {
  it.each([false, true])('sets compatible headers (production=%s)', (production) => {
    const headers: Record<string, string> = {};
    const res = { setHeader: (key: string, value: string) => { headers[key] = value; } };
    const next = jest.fn();
    securityHeaders(production)({} as Request, res as Response, next as NextFunction);
    expect(headers).toMatchObject({
      'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
    });
    expect(headers['Strict-Transport-Security']).toBe(production ? 'max-age=15552000; includeSubDomains' : undefined);
    expect(headers['Cross-Origin-Resource-Policy']).toBeUndefined();
    expect(headers['Content-Security-Policy']).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
