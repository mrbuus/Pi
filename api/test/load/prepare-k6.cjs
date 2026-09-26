#!/usr/bin/env node
'use strict';
// Only local synthetic DB. Run npm run build first. Never prints JWTs.
const fs=require('node:fs'),path=require('node:path');
const {loadConfig}=require('./lib/env');
const {createPrisma}=require('./lib/db');
const {signHs256}=require('./lib/jwt');
async function main(){
 const config=loadConfig(); // validates before loading/creating fixtures
 const {seed,cleanup}=require('./fixture');
 const dir=path.join(__dirname,'.synthetic-k6');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const manifestPath=path.join(dir,'manifest.json'),fixturePath=path.join(dir,'fixture.json');
 const prisma=createPrisma(config.databaseUrl);
 try{
  if(process.argv.includes('--clean')){
   const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
   if(!Array.isArray(manifest.studentIds)||!manifest.studentIds.every(id=>/^ltstu_/.test(id))||!manifest.problemIds.every(id=>/^ltprob_/.test(id)))throw new Error('Refusing non-synthetic cleanup manifest');
   if(!Array.isArray(manifest.levelTests)||!manifest.levelTests.every(row=>/^lttest_/.test(row.testId))||!/^ltchap_/.test(manifest.chapterId)||!/^ltclass_/.test(manifest.classroomId)||(manifest.teacherCreatedByUs&&!/^ltteacher_/.test(manifest.teacherId)))throw new Error('Refusing non-synthetic cleanup resources');
   await cleanup({prisma,manifest});fs.rmSync(manifestPath);fs.rmSync(fixturePath,{force:true});console.log('Synthetic fixture cleaned');return;
  }
  if(fs.existsSync(manifestPath))throw new Error('Clean the previous synthetic fixture before preparing another');
  const count=Number(process.env.LOAD_VUS||2000);if(!Number.isInteger(count)||count<1||count>2000)throw new Error('LOAD_VUS must be 1..2000');
  const manifest=await seed({prisma,levels:[count]});
  fs.writeFileSync(manifestPath,JSON.stringify(manifest),{mode:0o600});
  const testId=manifest.levelTests[0].testId;
  fs.writeFileSync(fixturePath,JSON.stringify(manifest.studentIds.map(id=>({token:signHs256({sub:id,role:'STUDENT'},config.jwtSecret,3600),testId,problemIds:manifest.problemIds.slice(0,20)}))),{mode:0o600});
  console.log('Synthetic fixture ready: '+fixturePath+' (expires in one hour; never commit)');
 }finally{await prisma.$disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
