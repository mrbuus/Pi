/** Display mode only. API authorization always uses the authenticated live role. */
export function navigationRole(user: {
  role: string;
  externalTeacherProfile?: { verifiedAt: string | null } | null;
}): string {
  return (user.role === "TEACHER" || user.role === "TEACHER_PLUS") && user.externalTeacherProfile
    ? "GROUP_TEACHER"
    : user.role;
}
