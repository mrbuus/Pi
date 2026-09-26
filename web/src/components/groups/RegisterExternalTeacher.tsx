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
      await api("/teacher-groups/register", { method: "POST", body: formData });
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
          Хүсэлт хүлээн авлаа
        </h2>
        <p className="mb-4 text-sm text-ink">
          Таны хүсэлтийг хүлээн авлаа. Баталгаажсаны дараа нэвтэрч гадны багшийн
          бүлгийг ашиглах боломжтой.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-bg"
        >
          Нүүр хуудас руу буцах
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <h1 className="mb-4 text-xl font-bold">Гадны багшийн бүртгэл</h1>

      <InfoHint>
        Баталгаажих хүртэл шинэ бүлэг үүсгэх боломжгүй. Сурагчид баталгаажаагүй
        багшийн бүлэгт нэгдэх эрхгүй.
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
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-3"
          />
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
