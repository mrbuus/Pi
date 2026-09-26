import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { PreviewService } from './preview.service';
import { PreviewController } from './preview.controller';
import { ContentService } from './content.service';
describe('Public preview data boundary',()=>{
 const row={id:'chapter',title:'Synthetic',book:{id:'book',title:'Demo',sourceLabel:'private'},problems:[{id:'p',token:'DEMO',statementText:'$x^2=4$',correctAnswer:'SECRET',choices:{A:'SECRET'},analysis:{solution:'SECRET'},videos:['SECRET'],imageKey:'SECRET'}]};
 const prisma={chapter:{findFirst:jest.fn()},book:{findMany:jest.fn()}};
 const service=new PreviewService(prisma as unknown as PrismaService);
 beforeEach(()=>jest.clearAllMocks());
 it('strictly projects public statement fields even if a DB adapter returns extra fields',async()=>{prisma.chapter.findFirst.mockResolvedValue(row);const result=await service.chapter('chapter');expect(result).toEqual({id:'chapter',title:'Synthetic',book:{id:'book',title:'Demo'},problems:[{id:'p',token:'DEMO',statementText:'$x^2=4$'}]});expect(JSON.stringify(result)).not.toContain('SECRET');});
 it('query limits first three with deterministic ordering and no answer selection',async()=>{prisma.chapter.findFirst.mockResolvedValue(row);await service.chapter('chapter');const q=prisma.chapter.findFirst.mock.calls[0][0];expect(q.where).toEqual({id:'chapter',deletedAt:null,book:{archived:false,deletedAt:null}});expect(q.select.problems).toEqual({where:{deletedAt:null},orderBy:[{page:'asc'},{number:'asc'},{id:'asc'}],take:3,select:{id:true,token:true,statementText:true}});});
 it('hidden or missing chapter is 404 without a fallback query',async()=>{prisma.chapter.findFirst.mockResolvedValue(null);await expect(service.chapter('archived')).rejects.toMatchObject({status:404});expect(prisma.chapter.findFirst).toHaveBeenCalledTimes(1);});
 it('book catalog excludes archived/deleted books and chapters and is bounded',async()=>{prisma.book.findMany.mockResolvedValue([]);expect(await service.books()).toEqual([]);expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{archived:false,deletedAt:null},take:100,select:expect.objectContaining({chapters:expect.objectContaining({where:{deletedAt:null},take:500})})}));});
 it('legacy direct-ID preview also excludes archived book parents',async()=>{prisma.chapter.findFirst.mockResolvedValue(null);const old=new ContentService(prisma as unknown as PrismaService);await expect(old.publicChapterPreview('old')).rejects.toMatchObject({status:404});expect(prisma.chapter.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({OR:[{bookId:null},{book:{archived:false,deletedAt:null}}]})}));});
});
describe('Preview public HTTP boundary',()=>{
 let app:INestApplication;const service={books:jest.fn().mockResolvedValue([]),chapter:jest.fn().mockResolvedValue({problems:[]})};
 beforeAll(async()=>{const mod=await Test.createTestingModule({imports:[ThrottlerModule.forRoot([{ttl:60000,limit:1000}])],controllers:[PreviewController],providers:[{provide:PreviewService,useValue:service},{provide:APP_GUARD,useClass:ThrottlerGuard}]}).compile();app=mod.createNestApplication();app.setGlobalPrefix('api');await app.init();});afterAll(async()=>await app.close());
 it('is intentionally public, ignores count/offset overrides, and is not shared-cacheable',async()=>{const res=await request(app.getHttpServer()).get('/api/catalog/preview/chapters/demo?take=1000&offset=3').expect(200);expect(res.headers['cache-control']).toBe('no-store');expect(service.chapter).toHaveBeenLastCalledWith('demo');});
 it('rate limits enumeration at 60 per minute',async()=>{for(let i=0;i<60;i++)await request(app.getHttpServer()).get('/api/catalog/preview/books').expect(200);await request(app.getHttpServer()).get('/api/catalog/preview/books').expect(429);expect(service.books).toHaveBeenCalledTimes(60);});
});
