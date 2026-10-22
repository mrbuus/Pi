/**
 * Нэвтрэлттэй холбоотой имэйлийн бичвэр (эзэн 2026-10-22). Цэвэр функц — I/O-гүй,
 * шууд тестлэгдэнэ. Spam шүүлтүүрт өртөхгүйн тулд энгийн текст + маш энгийн HTML,
 * ганц холбоос, зураггүй (email.service.ts-ийн дүрэм).
 */

export interface AuthEmail {
  subject: string;
  text: string;
  html: string;
}

const SIGNATURE = 'Шинэ Ирээдүйн Эзэд сургалтын төв — pimath.mn';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function greeting(firstName: string | null | undefined): string {
  const name = firstName?.trim();
  return name ? `Сайн байна уу, ${name}.` : 'Сайн байна уу.';
}

function render(paragraphs: string[], link: string, linkLabel: string): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`)
    .join('');
  const button = `<p style="margin:0 0 18px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">${escapeHtml(linkLabel)}</a></p>`;
  return `<!doctype html><html lang="mn"><head><meta charset="utf-8"></head><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111827">${body}${button}<p style="margin:0;color:#6b7280;font-size:13px">${escapeHtml(SIGNATURE)}</p></body></html>`;
}

/** «Нууц үгээ мартсан» — нэг удаагийн сэргээх холбоос */
export function resetLinkEmail(p: {
  firstName?: string | null;
  link: string;
  minutes: number;
}): AuthEmail {
  const lines = [
    greeting(p.firstName),
    'pimath.mn дээрх бүртгэлийнхээ нууц үгийг сэргээх хүсэлт ирлээ.',
    `Доорх холбоосоор ${p.minutes} минутын дотор шинэ нууц үгээ тохируулна уу. Холбоос нэг л удаа ажиллана.`,
    'Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тоомсорлоно уу — нууц үг тань өөрчлөгдөхгүй.',
  ];
  return {
    subject: 'Нууц үг сэргээх — pimath.mn',
    text: [...lines.slice(0, 3), '', p.link, '', lines[3], '', SIGNATURE].join('\n'),
    html: render(lines, p.link, 'Шинэ нууц үг тохируулах'),
  };
}

/** 3 удаа буруу нууц үг оролдсон мэдэгдэл (эзний бичвэр) + сэргээх холбоос */
export function loginAlertEmail(p: {
  firstName?: string | null;
  link: string;
  minutes: number;
}): AuthEmail {
  const lines = [
    greeting(p.firstName),
    'Таны pimath.mn бүртгэлд 3 удаа буруу нууц үг оролдлоо, хэрэв та биш бол нууц үгээ солино уу.',
    `Доорх холбоосоор ${p.minutes} минутын дотор шинэ нууц үг тохируулж болно. Холбоос нэг л удаа ажиллана.`,
    'Хэрэв та өөрөө оролдсон бол энэ имэйлийг үл тоомсорлож болно.',
  ];
  return {
    subject: 'Нууц үг буруу оролдлого — pimath.mn',
    text: [...lines.slice(0, 3), '', p.link, '', lines[3], '', SIGNATURE].join('\n'),
    html: render(lines, p.link, 'Нууц үгээ солих'),
  };
}
