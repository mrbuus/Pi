const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');process.chdir(path.join(root,'api'));
require(path.join(root,'api/node_modules/dotenv')).config({path:path.join(root,'api/.env'),quiet:true});
const u=new URL(process.env.DATABASE_URL);if(u.hostname!=='127.0.0.1'||u.port!=='5544'||u.pathname!=='/pimn_v2')throw Error('Only isolated v2 DB');
require(path.join(root,'api/node_modules/ts-node')).register({project:path.join(root,'api/tsconfig.json'),transpileOnly:true,experimentalResolver:true});
const {PrismaService}=require(path.join(root,'api/src/prisma/prisma.service'));const bcrypt=require(path.join(root,'api/node_modules/bcryptjs'));const db=new PrismaService();
(async()=>{try{
const previous=fs.existsSync(path.join(root,'.runtime/accounts.json'))?JSON.parse(fs.readFileSync(path.join(root,'.runtime/accounts.json'),'utf8')):null; const password=previous?.ADMIN?.password??'V2demo-'+crypto.randomBytes(12).toString('hex');const hash=await bcrypt.hash(password,10),accounts={};
for(const [i,role] of ['ADMIN','TEACHER_PLUS','TEACHER','STUDENT','BUYER','PARENT'].entries()){
const username='v2_'+role.toLowerCase(),id='v2-demo-'+role.toLowerCase();
await db.user.upsert({where:{id},create:{id,username,firstName:role==='STUDENT'?'Туршилтын сурагч':role==='BUYER'?'Бие даагч':role==='PARENT'?'Туршилтын эцэг эх':'Туршилтын ажилтан',lastName:'Жишээ',passwordHash:hash,role,termsAcceptedAt:new Date(),privacyVersion:'2026-09-26-draft',guardianConsentAt:new Date()},update:{passwordHash:hash,privacyVersion:'2026-09-26-draft',termsAcceptedAt:new Date(),guardianConsentAt:new Date()}});
accounts[role]={id,username,password};
if(role==='STUDENT'||role==='BUYER')await db.studentProfile.upsert({where:{userId:id},create:{userId:id,type:role==='STUDENT'?'CLASSROOM':'ONLINE',grade:12,school:'Туршилтын сургууль',activatedAt:new Date(),approvedAt:new Date()},update:{}});
if(role==='TEACHER'||role==='TEACHER_PLUS')await db.teacherProfile.upsert({where:{userId:id},create:{userId:id,canManageStudents:role==='TEACHER_PLUS'},update:{}});
}
await db.classroom.upsert({where:{id:'v2-demo-class'},create:{id:'v2-demo-class',name:'12 — Туршилтын анги',type:'IN_PERSON',grade:12,teacherId:accounts.TEACHER_PLUS.id},update:{}});
await db.classroom.upsert({where:{id:'v2-demo-other-class'},create:{id:'v2-demo-other-class',name:'Өөр багшийн туршилтын анги',type:'IN_PERSON',grade:12,teacherId:accounts.TEACHER.id},update:{}});
await db.classroom.upsert({where:{id:'v2-demo-online-class'},create:{id:'v2-demo-online-class',name:'Онлайн — Туршилтын анги',type:'ONLINE',grade:12,teacherId:accounts.TEACHER_PLUS.id},update:{}});
const onlineEnrollment=await db.enrollment.findFirst({where:{studentId:accounts.STUDENT.id,classroomId:'v2-demo-online-class',leftAt:null}});if(!onlineEnrollment)await db.enrollment.create({data:{studentId:accounts.STUDENT.id,classroomId:'v2-demo-online-class',joinedAt:new Date('2026-09-01T00:00:00Z')}});
await db.assignment.upsert({where:{id:'v2-demo-online-homework'},create:{id:'v2-demo-online-homework',classroomId:'v2-demo-online-class',title:'Онлайн · Тест 5-А · Бодолт',description:'Зөвхөн зохиомол туршилтын даалгавар. Анхны бодолт, багшийн буцаалт, засварыг хадгална.',imageKeys:[],createdById:accounts.TEACHER_PLUS.id,dueDate:new Date(Date.now()+86400000)},update:{}});
const enroll=await db.enrollment.findFirst({where:{studentId:accounts.STUDENT.id,classroomId:'v2-demo-class',leftAt:null}});if(!enroll)await db.enrollment.create({data:{studentId:accounts.STUDENT.id,classroomId:'v2-demo-class',joinedAt:new Date('2026-09-01T00:00:00Z')}});
await db.parentLink.upsert({where:{parentId_studentId:{parentId:accounts.PARENT.id,studentId:accounts.STUDENT.id}},create:{parentId:accounts.PARENT.id,studentId:accounts.STUDENT.id,verifiedAt:new Date(),verifiedById:accounts.ADMIN.id},update:{}});
await db.book.upsert({where:{id:'v2-demo-book'},create:{id:'v2-demo-book',code:'100-V3-LAB',title:'100×100 V3 · Баталгаажуулсан туршилтын хэсэг',sourceLabel:'50 verified book problems; isolated local fixture'},update:{}});
for(const [order,n,title] of [[1,5,'Квадрат тэгшитгэл'],[2,9,'Өндөр зэргийн тэгшитгэл']])await db.chapter.upsert({where:{id:'v2-demo-chapter-'+n},create:{id:'v2-demo-chapter-'+n,bookId:'v2-demo-book',title,order,grade:12,freePreview:true},update:{}});
// Synthetic attachment only, no real photos, personal or financial data.
const imageKey='v2-demo-theory.png',bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=','base64');
await db.storedFile.upsert({where:{key:imageKey},create:{key:imageKey,mime:'image/png',size:bytes.length,bytes,ownerId:accounts.TEACHER_PLUS.id},update:{}});
await db.theoryBlock.upsert({where:{id:'v2-demo-theory'},create:{id:'v2-demo-theory',chapterId:'v2-demo-chapter-5',title:'Квадрат тэгшитгэлийн бодит шийд',content:'$ax^2+bx+c=0$, $a\\ne0$. $D=b^2-4ac$. $D\\ge0$ үед $x=\\frac{-b\\pm\\sqrt D}{2a}$. Анхны хариугаа ном дээр тэмдэглээд гэртээ бөглөнө.',imageKeys:[imageKey],order:1,freePreview:true,createdById:accounts.TEACHER_PLUS.id},update:{}});
const input=fs.readFileSync(path.join(root,'docs/research/PI-QUADRATIC-LAB-DATA.json'));
const audit=JSON.parse(fs.readFileSync(path.join(root,'docs/research/PI-QUADRATIC-LAB-MATH-QA.json'),'utf8'));
if(crypto.createHash('sha256').update(input).digest('hex')!==audit.inputSha256||!audit.overallPassed||audit.bookFailedIds.length)throw Error('Verified source fingerprint changed: review before seeding');
const data=JSON.parse(input);
for(const q of data.questions.filter(q=>q.kind==='book')){
const id='v2-book-'+q.id,choices=Object.entries(q.choices||{}).map(([label,text],order)=>({label,text:/(шийд|тоо)/.test(text)?text:'$'+text+'$',order,isCorrect:label===q.answerChoice}));
await db.problem.upsert({where:{id},create:{id,token:q.sourceId,chapterId:'v2-demo-chapter-'+q.testNumber,page:q.bookPage,number:q.number,format:choices.length?'CHOICE':'FILL_NUMBER',statementText:q.statement,correctAnswer:choices.length?{choice:q.answerChoice}:q.blanks?q.blanks:q.requestedAnswer,createdById:accounts.TEACHER_PLUS.id,choices:choices.length?choices.map(c=>({label:c.label,text:c.text})):undefined,choiceOptions:choices.length?{create:choices}:undefined},update:{correctAnswer:choices.length?{choice:q.answerChoice}:q.blanks?q.blanks:q.requestedAnswer}});
await db.problemAnalysis.upsert({where:{problemId:id},create:{problemId:id,status:'AUTO_DRAFT',answerKeyStatus:'VERIFIED',confidence:1,sourcePath:'docs/research/PI-QUADRATIC-LAB-DATA.json',sourceVariant:q.variant,topic:q.testNumber===5?'Квадрат тэгшитгэл':'Өндөр зэргийн тэгшитгэл',skills:q.skills??[],methods:[],formulas:[],domainNotes:[],signRules:[],commonMistakes:q.pitfall?[q.pitfall]:[],solutionOutline:q.solutionLatex,auditNotes:['Exact source fingerprint matches independent 50-book-question audit. Answer keys mathematically checked; teacher content approval remains AUTO_DRAFT.']},update:{}});
const testId='v2-book-test-'+q.test;await db.test.upsert({where:{id:testId},create:{id:testId,title:'Тест '+q.test,type:'DAILY',chapterId:'v2-demo-chapter-'+q.testNumber,timeLimitMin:q.timeLimitMin,groupKey:'v2-test-'+q.testNumber,variantLabel:q.variant,createdById:accounts.TEACHER_PLUS.id},update:{}});await db.testProblem.upsert({where:{testId_problemId:{testId,problemId:id}},create:{testId,problemId:id,order:q.number},update:{}});
}
const date=new Date(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T00:00:00Z');
await db.attendance.upsert({where:{classroomId_studentId_date:{classroomId:'v2-demo-class',studentId:accounts.STUDENT.id,date}},create:{classroomId:'v2-demo-class',studentId:accounts.STUDENT.id,date,status:'PRESENT',markedById:accounts.TEACHER_PLUS.id},update:{}});
await db.classTestSession.upsert({where:{classroomId_testId_date:{classroomId:'v2-demo-class',testId:'v2-book-test-5-A',date}},create:{classroomId:'v2-demo-class',testId:'v2-book-test-5-A',date,createdById:accounts.TEACHER_PLUS.id},update:{}});
await db.assignment.upsert({where:{id:'v2-demo-homework'},create:{id:'v2-demo-homework',classroomId:'v2-demo-class',title:'Тест 5-А · Гэрийн бодолт',description:'Ном дээр бодсон бодолтын зургаа илгээнэ. Эхний хариу ба засварласан хариуг ялгана.',imageKeys:[],createdById:accounts.TEACHER_PLUS.id,dueDate:new Date(Date.now()+86400000)},update:{}});
await db.dailyHomeworkMark.upsert({where:{classroomId_studentId_date:{classroomId:'v2-demo-class',studentId:accounts.STUDENT.id,date}},create:{classroomId:'v2-demo-class',studentId:accounts.STUDENT.id,date,status:'PARTIAL',comment:'Зөвхөн туршилтын тэмдэглэгээ',markedById:accounts.TEACHER_PLUS.id},update:{}});
fs.writeFileSync(path.join(root,'.runtime/accounts.json'),JSON.stringify(accounts,null,2),{mode:0o600});
console.log(JSON.stringify({syntheticRoles:Object.keys(accounts),isolatedDatabase:true,verifiedBookProblems:50,realPersonalRecords:0,fixturesReady:true}));
}finally{await db.$disconnect()}})().catch(e=>{console.error(e.message);process.exitCode=1});
