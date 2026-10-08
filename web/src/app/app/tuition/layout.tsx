import RequireRole from '@/components/nav/RequireRole';

export default function TuitionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RequireRole allow={['ADMIN', 'TEACHER_PLUS']}>
    <div className="mx-auto w-full max-w-5xl">{children}</div>
  </RequireRole>;
}
