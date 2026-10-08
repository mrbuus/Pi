"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "../ui/Surface";
import InfoHint from "../ui/InfoHint";
import { api } from "@/lib/api";

interface RegistrationForm {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  organization: string;
}

export function RegisterExternalTeacher() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<RegistrationForm>({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    organization: "",
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api("/teacher-groups/register", { method: "POST", body: formData, auth: false });
      setSuccess(true);
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        organization: "",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Бүртгэл илгээж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-lg border border-success/30 bg-success/10">
        <h2 className="mb-2 text-lg font-bold text-success">
          Бүртгэл үүслээ
        </h2>
        <p className="mb-4 text-sm text-ink">
          Бүртгүүлсэн имэйл, нууц үгээрээ нэвтэрч «Анги удирдах» хэсгээс
          ангийн бүлгээ үүсгэнэ үү. Админы зөвшөөрөл хүлээх шаардлагагүй.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-bg"
        >
          Нэвтрэх
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <h2 className="mb-4 text-xl font-bold">Багшийн бүртгэл</h2>

      <InfoHint>
        Бүртгүүлээд ангийн бүлэг үүсгэж, нэгдэх кодоо сурагчдадаа өгнө.
        Энэ бүртгэл нь төвийн ажилтны эрх эсвэл мэргэжлийн баталгаажуулалт олгохгүй.
      </InfoHint>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="external-email"
            className="mb-1 block text-sm font-medium"
          >
            Имэйл
          </label>
          <input
            id="external-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-3"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="external-first-name"
              className="mb-1 block text-sm font-medium"
            >
              Нэр
            </label>
            <input
              id="external-first-name"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              autoComplete="given-name"
              minLength={2}
              maxLength={100}
              required
              className="min-h-11 w-full rounded-lg border border-line bg-surface px-3"
            />
          </div>
          <div>
            <label
              htmlFor="external-last-name"
              className="mb-1 block text-sm font-medium"
            >
              Овог
            </label>
            <input
              id="external-last-name"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              autoComplete="family-name"
              minLength={2}
              maxLength={100}
              required
              className="min-h-11 w-full rounded-lg border border-line bg-surface px-3"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="external-password"
            className="mb-1 block text-sm font-medium"
          >
            Нууц үг
          </label>
          <input
            id="external-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="external-password-hint"
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-3"
          />
          <p id="external-password-hint" className="mt-1 text-xs text-ink-dim">8 ба түүнээс олон тэмдэгт.</p>
        </div>

        <div>
          <label
            htmlFor="external-organization"
            className="mb-1 block text-sm font-medium"
          >
            Ажилладаг сургууль/төв (сонголттой)
          </label>
          <input
            id="external-organization"
            type="text"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            autoComplete="organization"
            maxLength={255}
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-3"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="min-h-11 w-full rounded-lg bg-brand font-medium text-on-brand hover:bg-brand/90 disabled:opacity-50"
        >
          {isLoading ? "Бүртгүүлж байна" : "Бүртгүүлэх"}
        </button>
      </form>
    </Card>
  );
}
