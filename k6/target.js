// No remote imports. Only loopback, or explicitly selected private IPv4 staging.
export function safeTarget(raw, explicit = false) {
 const value = raw || 'http://127.0.0.1:3000/api';
 const match = /^(https?):\/\/(localhost|\[::1\]|[0-9.]+)(?::([0-9]+))?\/api\/?$/.exec(value);
 if (!match) throw new Error('Load target must be a literal local/private address ending in /api; public/production hosts are prohibited');
 const host = match[2];
 const octets = host.split('.').map(Number);
 const validIp = octets.length === 4 && octets.every((n,i) => Number.isInteger(n) && n>=0 && n<=255 && String(n)===host.split('.')[i]);
 const local = host==='localhost'||host==='[::1]'||(validIp&&host==='127.0.0.1');
 const privateIp = validIp && (octets[0]===10 || (octets[0]===172&&octets[1]>=16&&octets[1]<=31) || (octets[0]===192&&octets[1]===168));
 if (!local && !(explicit && privateIp)) throw new Error('Production/public targets are prohibited');
 if(match[3]&&(Number(match[3])<1||Number(match[3])>65535))throw new Error('Invalid load target port');
 return value.replace(/\/$/,'');
}
