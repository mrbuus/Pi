'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/Surface';
import InfoHint from '../ui/InfoHint';

import { api } from "@/lib/api";
export function RegisterExternalTeacher() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    organization: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      await api('/teacher-groups/register', { method: 'POST', body: formData });

      setSuccess(true);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        organization: '',
      });

      // 2 секундын дараа нэвтрэх хуудас руу явах
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="max-w-md border border-success/30 bg-success/10">
        <h2 className="text-lg font-bold text-success mb-2">Амжилттай бүртгүүлэв</h2>
        <p className="text-success text-sm mb-4">
          Баталгаажуулагдсаны дараа ангийн бүлгүүдийг ашиглаж болно.
        </p>
        <p className="text-success text-xs">Нэвтрэх хуудас руу зөөлж байна...</p>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <h1 className="text-xl font-bold mb-4">Гадны багшийн бүртгэл</h1>

      <InfoHint>
        Админ баталгаажуулсан хүртэл сурагчийн мэдээлэл харахгүй байна.
      </InfoHint>

      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div>
          <label className="block text-sm font-medium mb-1">Имэйл</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-line rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Нэр</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-line rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Овог</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-line rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Нууц үг</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full px-3 py-2 border border-line rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Ажилладаг сургууль/төв (сонголтой)
          </label>
          <input
            type="text"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-line rounded"
          />
        </div>

        {error && (
          <div className="p-3 border border-error/30 bg-error/10 rounded text-error text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Бүртгүүлж байна...' : 'Бүртгүүлэх'}
        </button>
      </form>
    </Card>
  );
}
