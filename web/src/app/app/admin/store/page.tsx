import type { Metadata } from 'next';
import StoreAdminClient from '@/components/store-admin/StoreAdminClient';

export const metadata: Metadata = {
  title: 'Дэлгүүрийн удирдлага | Pi.mn',
  description: 'Бүтээгдэхүүн, үнэ, орлогын удирдлага',
};

export default function StoreAdminPage() {
  return <StoreAdminClient />;
}
