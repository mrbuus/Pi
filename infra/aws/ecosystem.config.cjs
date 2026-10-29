// pm2 тохиргооны САНАЛ (2026-10-29) — серверт ХЭРЭГЖҮҮЛЭЭГҮЙ. infra/aws/README.md «Санах ой»-г үз.
//
// EC2 t4g.small = 2 GB RAM (+2 GB swap), API ба вэб нэг машин дээр. Зорилго: аль нэг процесс
// санах ой алдвал (leak, оргил ачаалал) нөгөөгөө OOM-killer-ээр дагуулж унагахгүй байх.
//   - NODE_OPTIONS --max-old-space-size: V8 heap-ийн дээд хэмжээ (GC эрт ажиллана)
//   - max_memory_restart: RSS (heap + Buffer + native) энэ хэмжээнээс давбал pm2 зөөлөн дахин асаана
// Нийт ≈ 750M + 650M = 1.4 GB → OS, nginx, pm2-д ~500 MB үлдэнэ.
//
// Хэрэглэх (эзэн өөрөө, deploy-ийн дараа):
//   cp infra/aws/ecosystem.config.cjs ~/pimath/ecosystem.config.cjs
//   pm2 delete pimath-api pimath-web && pm2 start ~/pimath/ecosystem.config.cjs && pm2 save
// Build үед (npm run build) энэ хязгаар хамаарахгүй — README-ийн NODE_OPTIONS=3072 хэвээр.
module.exports = {
  apps: [
    {
      name: 'pimath-api',
      cwd: '/home/ubuntu/pimath/api',
      script: 'dist/src/main.js',
      instances: 1, // cluster болговол DB_POOL_MAX-ийг instance тоонд хуваа (README)
      exec_mode: 'fork',
      max_memory_restart: '750M',
      kill_timeout: 10000, // хүсэлтүүдээ дуусгах хугацаа
      env: {
        NODE_ENV: 'production',
        PORT: '3380',
        NODE_OPTIONS: '--max-old-space-size=512',
      },
    },
    {
      name: 'pimath-web',
      cwd: '/home/ubuntu/pimath/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3381',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '650M',
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=448',
      },
    },
  ],
};
