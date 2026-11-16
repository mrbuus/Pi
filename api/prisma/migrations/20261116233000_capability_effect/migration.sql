-- Эрхийн матриц (эзэн 2026-11-16): Багш+-ийн үүргээр нээлттэй эрх бүрийг хүн тус бүрд
-- хааж болохоор DENY мөр нэмнэ. ЗӨВХӨН НЭМЭХ: одоогийн бүх мөр ALLOW хэвээр тул хэний ч
-- эрх өөрчлөгдөхгүй.
ALTER TABLE "StaffCapabilityGrant" ADD COLUMN "effect" TEXT NOT NULL DEFAULT 'ALLOW';
