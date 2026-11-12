-- Ангийн шалгалтын хуудасны түлхүүр ангийн id-тай (CSHEET3:<classroomId>) тул багана өргөснө.
-- varchar уртыг ихэсгэх нь хүснэгтийг дахин бичихгүй, өгөгдөлд хүрэхгүй.
ALTER TABLE "ClassCheck" ALTER COLUMN "bookKey" TYPE VARCHAR(48);
ALTER TABLE "BookPayment" ALTER COLUMN "bookKey" TYPE VARCHAR(48);
