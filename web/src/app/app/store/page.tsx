import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import StoreProducts from './store-products';
import MyPurchases from './my-purchases';

export const metadata: Metadata = {
  title: 'Дэлгүүр — Pi.mn',
  description: 'Шалгалт, номуудыг худалдаж авах',
};

export default function StorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Дэлгүүр</h1>
        <p className="text-secondary mt-1">
          Нэг удаагийн шалгалт, номуудыг худалдаж авах
        </p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">Бүтээгдэхүүнүүд</TabsTrigger>
          <TabsTrigger value="purchases">Миний авсан</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <StoreProducts />
        </TabsContent>

        <TabsContent value="purchases" className="mt-4">
          <MyPurchases />
        </TabsContent>
      </Tabs>
    </div>
  );
}
