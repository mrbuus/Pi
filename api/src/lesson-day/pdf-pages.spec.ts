import { deflateSync } from 'zlib';
import { pdfPageCount } from './pdf-pages';

// @cantoo/pdf-lib-ээр (вэб дээрх photosToPdf-тэй ижил сан) үүсгэсэн жишээ файлууд
const OBJECT_STREAMS_3 = 'JVBERi0xLjcKJYGBgYEKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNCAwIFIgNSAwIFIgNiAwIFIgXQovQ291bnQgMwo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagoKNCAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDEgMCBSCi9SZXNvdXJjZXMgPDwKPj4KL01lZGlhQm94IFsgMCAwIDMwMCA0MDAgXQo+PgplbmRvYmoKCjUgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAxIDAgUgovUmVzb3VyY2VzIDw8Cj4+Ci9NZWRpYUJveCBbIDAgMCAzMDAgNDAwIF0KPj4KZW5kb2JqCgo2IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyA8PAo+PgovTWVkaWFCb3ggWyAwIDAgMzAwIDQwMCBdCj4+CmVuZG9iagoKNyAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovVHlwZSAvT2JqU3RtCi9OIDEKL0ZpcnN0IDQKL0xlbmd0aCAxNjEKPj4Kc3RyZWFtCnic1U+7DoIwFN37FR114rSFAoaQGB6bibMbkQ4uNmnw/z23cXDRneHktudxH05Dd50qrimur3tIupuneQZqAL4kPGBH1oFoCcs/NdvwTdT0ZJCrHeDO1JgXeJKSET17q09+YqXXi4e9xVtKv++5Mkt8JET/u0/bq+IS13HZgj6MJwvrDUxjDCpX3Y6qGFJYtrjf4/L+j/j8eWHfqzc/FWKZCmVuZHN0cmVhbQplbmRvYmoKCjggMCBvYmoKPDwKL1NpemUgOQovUm9vdCAyIDAgUgovSW5mbyAzIDAgUgovRmlsdGVyIC9GbGF0ZURlY29kZQovVHlwZSAvWFJlZgovTGVuZ3RoIDQ0Ci9XIFsgMSAyIDIgXQovSW5kZXggWyAwIDkgXQo+PgpzdHJlYW0KeJxjYGD4/5+RQYCBgZEhgoGBiYEdxOoCEU+BBKMDiJgNJJgWMjAAAIjCBWYKZW5kc3RyZWFtCmVuZG9iagoKc3RhcnR4cmVmCjY3MwolJUVPRg==';
const PLAIN_2 = 'JVBERi0xLjcKJYGBgYEKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNCAwIFIgNSAwIFIgXQovQ291bnQgMgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagoKMyAwIG9iago8PAovUHJvZHVjZXIgPEZFRkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyMDAwMjgwMDY4MDA3NDAwNzQwMDcwMDA3MzAwM0EwMDJGMDAyRjAwNjcwMDY5MDA3NDAwNjgwMDc1MDA2MjAwMkUwMDYzMDA2RjAwNkQwMDJGMDA0ODAwNkYwMDcwMDA2NDAwNjkwMDZFMDA2NzAwMkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyOT4KL01vZERhdGUgKEQ6MjAyNjEwMTgxMTA1MzVaKQovQ3JlYXRvciA8RkVGRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDIwMDAyODAwNjgwMDc0MDA3NDAwNzAwMDczMDAzQTAwMkYwMDJGMDA2NzAwNjkwMDc0MDA2ODAwNzUwMDYyMDAyRTAwNjMwMDZGMDA2RDAwMkYwMDQ4MDA2RjAwNzAwMDY0MDA2OTAwNkUwMDY3MDAyRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDI5PgovQ3JlYXRpb25EYXRlIChEOjIwMjYxMDE4MTEwNTM1WikKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyA8PAo+PgovTWVkaWFCb3ggWyAwIDAgMzAwIDQwMCBdCj4+CmVuZG9iagoKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDEgMCBSCi9SZXNvdXJjZXMgPDwKPj4KL01lZGlhQm94IFsgMCAwIDMwMCA0MDAgXQo+PgplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNiAwMDAwMCBuIAowMDAwMDAwMDgyIDAwMDAwIG4gCjAwMDAwMDAxMzIgMDAwMDAgbiAKMDAwMDAwMDYwMiAwMDAwMCBuIAowMDAwMDAwNjkzIDAwMDAwIG4gCgp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMiAwIFIKL0luZm8gMyAwIFIKPj4KCnN0YXJ0eHJlZgo3ODQKJSVFT0Y=';

describe('PDF хуудасны тоо (D13)', () => {
  it('шахсан объектын урсгалтай (useObjectStreams) PDF', () => {
    expect(pdfPageCount(Buffer.from(OBJECT_STREAMS_3, 'base64'))).toBe(3);
  });
  it('энгийн PDF', () => {
    expect(pdfPageCount(Buffer.from(PLAIN_2, 'base64'))).toBe(2);
  });
  it('гараар шахсан урсгал дахь хуудасны мод', () => {
    const body = deflateSync(Buffer.from('<< /Type /Pages /Kids [ 3 0 R ] /Count 7 >>'));
    const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n1 0 obj << /Length 9 >> stream\n'), body, Buffer.from('\nendstream endobj')]);
    expect(pdfPageCount(pdf)).toBe(7);
  });
  it('PDF биш бол null', () => {
    expect(pdfPageCount(Buffer.from('\xff\xd8\xff jpeg'))).toBeNull();
  });
});
