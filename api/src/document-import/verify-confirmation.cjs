// Explicit localhost-only persistence verification. Never loads .env or defaults DATABASE_URL.
// DOCX_TEST_DATABASE_URL=postgresql://...@localhost:PORT/pi_mnv2... node src/document-import/verify-confirmation.cjs
const requested = process.env.DOCX_TEST_DATABASE_URL;
if (!requested) throw new Error('Set DOCX_TEST_DATABASE_URL explicitly to an isolated localhost v2 test database.');
const parsed = new URL(requested);
if (!['localhost','127.0.0.1','[::1]'].includes(parsed.hostname) || !/v2/i.test(parsed.pathname)) throw new Error('Only a localhost database with v2 in its name is allowed.');
process.env.DATABASE_URL = requested;
require('ts-node').register({ transpileOnly: true, experimentalResolver: true });
const assert = require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
const JSZip=require('jszip');
const {PrismaService}=require('../prisma/prisma.service');
const {DocumentImportService}=require('./document-import.service');
const {Role}=require('../generated/prisma/enums');
const prisma=new PrismaService();
const id=`docx-verify-${randomUUID()}`;
let user,chapter;
async function document(prompt='Which value?') {
  const zip=new JSZip();zip.file('[Content_Types].xml','<Types/>');
  zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+[prompt,'One','Two'].map(s=>`<w:p><w:r><w:t>${s}</w:t></w:r></w:p>`).join('')+'</w:body></w:document>');
  return zip.generateAsync({type:'nodebuffer'});
}
const mapping={promptId:'block-1',choiceIds:['block-2','block-3'],correctChoiceId:'block-2'};
(async()=>{
  try {
    await prisma.$connect();
    user=await prisma.user.create({data:{username:id,firstName:'DOCX',lastName:'Local verification',passwordHash:randomBytes(32).toString('hex'),role:Role.TEACHER_PLUS}});
    chapter=await prisma.chapter.create({data:{title:id,order:1,grade:10}});
    const service=new DocumentImportService(prisma);const bytes=await document();
    const preview=await service.preview(bytes,'generated.docx',user.id,Role.TEACHER_PLUS);
    const dto={previewToken:preview.previewToken,chapterId:chapter.id,confirmed:true,warningsAcknowledged:true,mapping};
    const responses=await Promise.all([service.confirm(dto,user.id,Role.TEACHER_PLUS),service.confirm(dto,user.id,Role.TEACHER_PLUS)]);
    assert.equal(responses[0].problemId,responses[1].problemId);
    for(const response of responses) assert.deepEqual(Object.keys(response).sort(),['duplicate','problemId']);
    assert.deepEqual(responses.map(r=>r.duplicate).sort(),[false,true]);
    const saved=await prisma.problem.findUnique({where:{id:responses[0].problemId},include:{choiceOptions:true}});
    assert.equal(saved.statementText,'Which value?');assert.equal(saved.choiceOptions.length,2);assert.equal(saved.choiceOptions.filter(c=>c.isCorrect).length,1);
    assert.equal(await prisma.auditLog.count({where:{entity:'Problem',entityId:saved.id,action:'DOCX_IMPORT'}}),1);
    await assert.rejects(service.confirm(dto,user.id,Role.STUDENT));
    await assert.rejects(service.confirm({...dto,mapping:{...mapping,correctChoiceId:'block-1'}},user.id,Role.TEACHER_PLUS));
    assert.equal(await prisma.problem.count({where:{chapterId:chapter.id}}),1);
    // Force audit failure inside the actual database transaction; nested problem/choices must roll back.
    const failing = new DocumentImportService({problem:prisma.problem,$transaction:callback=>prisma.$transaction(tx=>callback(new Proxy(tx,{get(target,key){if(key==='auditLog')return {create:()=>Promise.reject(new Error('intentional audit rollback probe'))};return Reflect.get(target,key);}})))});
    const rollbackPreview=await failing.preview(await document('Rollback probe'),'rollback.docx',user.id,Role.TEACHER_PLUS);
    await assert.rejects(failing.confirm({...dto,previewToken:rollbackPreview.previewToken},user.id,Role.TEACHER_PLUS),/intentional audit rollback probe/);
    assert.equal(await prisma.problem.count({where:{chapterId:chapter.id}}),1);
    console.log(JSON.stringify({localhostOnly:true,createdQuestions:1,choiceCount:2,correctChoices:1,concurrentRetryIdempotent:true,auditAtomic:true,rollbackVerified:true,studentDenied:true,malformedMappingDenied:true,answerKeysInConfirmationResponse:false}));
  } finally {
    if(chapter){const problems=await prisma.problem.findMany({where:{chapterId:chapter.id},select:{id:true}});await prisma.auditLog.deleteMany({where:{entity:'Problem',entityId:{in:problems.map(p=>p.id)}}});await prisma.problem.deleteMany({where:{chapterId:chapter.id}});await prisma.chapter.delete({where:{id:chapter.id}});}
    if(user)await prisma.user.delete({where:{id:user.id}});
    await prisma.$disconnect();
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
