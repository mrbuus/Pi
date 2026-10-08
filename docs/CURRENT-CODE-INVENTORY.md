# Одоогийн кодын бүртгэл · 2026-09-24

Бүх controller declaration, page.tsx, Prisma model-ийн inventory. Endpoint байгаа нь production-д ажиллаж буй, role/scope зөв гэсэн баталгаа биш. Route parser нь literal decorator-уудыг авсан; runtime prefix/rewrites нэмэгдэх боломжтой.

42 controller файл; 276 route declaration; 48 page; 70 model.

## activity

Эх: `api/src/activity/activity.controller.ts`

- `GET /activity/me` · `me` · мөр 27
- `GET /activity/student/:id` · `student` · мөр 33
- `GET /activity/streak` · `streak` · мөр 48
- `GET /activity/classroom/:id` · `classroom` · мөр 54
## analytics

Эх: `api/src/analytics/analytics.controller.ts`

- `GET /analytics/overview` · `overview` · мөр 16
- `GET /analytics/engagement` · `engagement` · мөр 21
- `GET /analytics/classrooms` · `classrooms` · мөр 26
- `GET /analytics/topics` · `topics` · мөр 31
- `GET /analytics/at-risk` · `atRisk` · мөр 36
## announcements

Эх: `api/src/announcements/announcements.controller.ts`

- `POST /announcements` · `create` · мөр 92
- `GET /announcements` · `myAnnouncements` · мөр 100
- `GET /announcements/manage` · `manage` · мөр 111
- `PATCH /announcements/:id` · `update` · мөр 118
- `DELETE /announcements/:id` · `remove` · мөр 133
## src

Эх: `api/src/app.controller.ts`

- `GET /` · `getHello` · мөр 8
## assignments

Эх: `api/src/assignments/assignments.controller.ts`

- `POST /classrooms/:id/assignments` · `create` · мөр 33
- `GET /classrooms/:id/assignments` · `listForClass` · мөр 50
- `GET /classrooms/:id/assignments/stats` · `stats` · мөр 69
- `GET /assignments/my` · `my` · мөр 86
- `POST /assignments/:id/submit` · `submit` · мөр 92
- `POST /assignments/:id/review` · `review` · мөр 102
- `PATCH /assignments/:id` · `update` · мөр 113
- `DELETE /assignments/:id` · `remove` · мөр 124
- `GET /assignments/:id/submissions` · `roster` · мөр 130
## assignments

Эх: `api/src/assignments/homework-marks.controller.ts`

- `GET /classrooms/:id/homework-marks` · `byClassAndDate` · мөр 28
- `GET /students/:id/homework-marks` · `byStudent` · мөр 44
- `PATCH /classrooms/:id/homework-marks/:studentId` · `setMark` · мөр 61
## attempts

Эх: `api/src/attempts/attempts.controller.ts`

- `POST /attempts/evening` · `evening` · мөр 28
- `GET /attempts/my` · `my` · мөр 34
- `GET /attempts/my-stats` · `myStats` · мөр 44
- `POST /admin/run-daily-summary` · `runSummary` · мөр 50
- `GET /classrooms/:id/daily-summary` · `dailySummary` · мөр 58
- `GET /classrooms/:id/attention` · `attention` · мөр 73
## attendance

Эх: `api/src/attendance/attendance.controller.ts`

- `POST /classrooms/:id/attendance` · `mark` · мөр 28
- `GET /classrooms/:id/attendance` · `byClassAndDate` · мөр 43
- `GET /classrooms/:id/attendance/history` · `history` · мөр 60
- `GET /students/:id/attendance` · `byStudent` · мөр 78
- `GET /attendance/my` · `my` · мөр 95
## audit

Эх: `api/src/audit/audit.controller.ts`

- `GET /audit` · `list` · мөр 15
- `GET /audit/entity/:entity/:entityId` · `history` · мөр 40
## auth

Эх: `api/src/auth/auth.controller.ts`

- `POST /auth/register` · `register` · мөр 35
- `POST /auth/login` · `login` · мөр 41
- `GET /auth/google` · `beginGoogleLogin` · мөр 50
- `POST /auth/google/link` · `beginGoogleLink` · мөр 57
- `GET /auth/google/callback` · `googleCallback` · мөр 63
- `POST /auth/google/exchange` · `exchangeGoogleCode` · мөр 76
- `POST /auth/change-password` · `changePassword` · мөр 83
- `POST /auth/forgot-password` · `forgotPassword` · мөр 102
- `POST /auth/reset-password` · `resetPassword` · мөр 108
- `GET /auth/me` · `me` · мөр 114
- `POST /auth/me/avatar` · `setAvatar` · мөр 121
## class-sessions

Эх: `api/src/class-sessions/class-sessions.controller.ts`

- `POST /classrooms/:id/did-test` · `recordDidTest` · мөр 70
- `GET /classrooms/:id/test-sessions` · `listForClass` · мөр 87
- `POST /test-sessions/:id/excluded` · `setExcluded` · мөр 98
- `DELETE /test-sessions/:id` · `remove` · мөр 113
- `GET /me/todo-marking` · `todo` · мөр 120
## classification

Эх: `api/src/classification/classification.controller.ts`

- `GET /classification/categories` · `listCategories` · мөр 88
- `POST /classification/categories` · `createCategory` · мөр 93
- `PATCH /classification/categories/:id` · `renameCategory` · мөр 99
- `GET /classification/problems/:id` · `getProblem` · мөр 104
- `PUT /classification/problems/:id/choices` · `setChoices` · мөр 109
- `PUT /classification/problems/:id/tags` · `setTags` · мөр 118
## classrooms

Эх: `api/src/classrooms/classrooms.controller.ts`

- `POST /classrooms` · `create` · мөр 32
- `GET /classrooms` · `list` · мөр 38
- `GET /classrooms/unassigned-students` · `unassigned` · мөр 44
- `GET /classrooms/registry` · `registry` · мөр 53
- `POST /classrooms/:id/enroll` · `enroll` · мөр 59
- `POST /classrooms/:id/remove-student` · `removeStudent` · мөр 74
- `PATCH /classrooms/:id` · `update` · мөр 89
- `DELETE /classrooms/:id` · `archive` · мөр 99
- `POST /classrooms/:id/disband` · `disband` · мөр 114
## colortags

Эх: `api/src/colortags/colortags.controller.ts`

- `PUT /students/:id/color-tag` · `setTag` · мөр 29
- `DELETE /students/:id/color-tag` · `removeTag` · мөр 38
- `GET /students/:id/color-tags` · `forStudent` · мөр 43
- `GET /classrooms/:id/color-tags` · `forClassroom` · мөр 48
## content

Эх: `api/src/content/catalog.controller.ts`

- `GET /catalog/grades/:grade/chapters` · `chaptersByGrade` · мөр 23
- `GET /catalog/chapters/:id/preview` · `chapterPreview` · мөр 32
## content

Эх: `api/src/content/content.controller.ts`

- `POST /books` · `createBook` · мөр 39
- `GET /books` · `listBooks` · мөр 44
- `PATCH /books/:id` · `updateBook` · мөр 52
- `DELETE /books/:id` · `deleteBook` · мөр 69
- `POST /chapters` · `createChapter` · мөр 85
- `GET /chapters` · `listChapters` · мөр 90
- `PATCH /chapters/reorder` · `reorderChapters` · мөр 107
- `PATCH /chapters/:id` · `updateChapter` · мөр 121
- `DELETE /chapters/:id` · `deleteChapter` · мөр 137
- `POST /problems` · `createProblem` · мөр 144
- `PATCH /problems/:problemId` · `updateProblem` · мөр 153
- `DELETE /problems/:problemId` · `deleteProblem` · мөр 169
- `GET /problems/:problemId` · `getProblem` · мөр 184
- `GET /chapters/:id/problems` · `listProblems` · мөр 190
- `GET /tags` · `listTags` · мөр 208
- `GET /formulas` · `listFormulas` · мөр 215
## content

Эх: `api/src/content/topics.controller.ts`

- `GET /topics` · `list` · мөр 32
- `POST /topics` · `create` · мөр 39
- `PATCH /topics/:id` · `update` · мөр 46
- `DELETE /topics/:id` · `remove` · мөр 59
## enrollment-windows

Эх: `api/src/enrollment-windows/enrollment-windows.controller.ts`

- `GET /enrollment-windows` · `findAll` · мөр 33
- `PATCH /enrollment-windows/:subject` · `update` · мөр 40
## events

Эх: `api/src/events/events.controller.ts`

- `POST /events` · `track` · мөр 33
- `GET /events/my-summary` · `mySummary` · мөр 38
- `GET /events/stats` · `stats` · мөр 44
## finance

Эх: `api/src/finance/finance.controller.ts`

- `GET /finance/report` · `getMonthlyReport` · мөр 28
- `GET /finance/expenses` · `getExpenses` · мөр 37
- `POST /finance/expenses` · `createExpense` · мөр 46
- `PATCH /finance/expenses/:id` · `updateExpense` · мөр 63
- `DELETE /finance/expenses/:id` · `deleteExpense` · мөр 85
## gateways

Эх: `api/src/gateways/gateways.controller.ts`

- `GET /gateways/status` · `status` · мөр 61
- `GET /gateways/qpay/payments/:paymentId/status` · `checkQpayStatus` · мөр 75
- `POST /gateways/qpay/callback` · `qpayCallback` · мөр 163
## goals

Эх: `api/src/goals/goals.controller.ts`

- `POST /goals` · `create` · мөр 32
- `GET /goals` · `findAll` · мөр 37
- `PATCH /goals/:id` · `update` · мөр 42
- `DELETE /goals/:id` · `remove` · мөр 51
## insights

Эх: `api/src/insights/insights.controller.ts`

- `GET /insights/distractor-analysis` · `getDistractorAnalysis` · мөр 18
- `GET /insights/problem-quality` · `getProblemQuality` · мөр 33
- `GET /insights/topic-mastery` · `getTopicMastery` · мөр 54
- `GET /insights/ml-export` · `getMlExport` · мөр 69
- `GET /insights/ml-export-count` · `getMlExportCount` · мөр 96
## leads

Эх: `api/src/leads/leads.controller.ts`

- `POST /leads` · `create` · мөр 21
- `GET /leads` · `findAll` · мөр 30
- `PATCH /leads/:id/status` · `updateStatus` · мөр 37
## lessons

Эх: `api/src/lessons/lessons.controller.ts`

- `GET /lessons/chapters` · `listChapters` · мөр 36
- `GET /lessons/:chapterId` · `getLesson` · мөр 50
- `POST /lessons/:chapterId/theory` · `createTheory` · мөр 57
- `PATCH /lessons/theory/:id` · `updateTheory` · мөр 67
- `DELETE /lessons/theory/:id` · `removeTheory` · мөр 74
- `PATCH /lessons/:chapterId/theory/reorder` · `reorderTheory` · мөр 81
- `POST /lessons/:chapterId/progress` · `recordProgress` · мөр 90
## notes

Эх: `api/src/notes/notes.controller.ts`

- `POST /students/:id/notes` · `create` · мөр 30
- `GET /students/:id/notes` · `list` · мөр 40
- `PATCH /notes/:id` · `update` · мөр 50
- `DELETE /notes/:id` · `remove` · мөр 60
## notifications

Эх: `api/src/notifications/sms.controller.ts`

- `GET /sms/status` · `status` · мөр 40
- `POST /sms/send` · `send` · мөр 47
- `POST /sms/bulk/estimate` · `estimate` · мөр 61
- `POST /sms/bulk` · `createBulk` · мөр 68
- `POST /sms/bulk/:id/start` · `startBulk` · мөр 78
- `GET /sms/messages` · `messages` · мөр 85
- `GET /sms/batches` · `batches` · мөр 109
- `POST /sms/messages/:id/retry` · `retry` · мөр 119
- `GET /sms/templates` · `templates` · мөр 127
- `POST /sms/templates` · `createTemplate` · мөр 133
- `PATCH /sms/templates/:id` · `updateTemplate` · мөр 142
- `DELETE /sms/templates/:id` · `deleteTemplate` · мөр 151
## parents

Эх: `api/src/parents/parents.controller.ts`

- `POST /parent/links` · `requestLink` · мөр 28
- `GET /parent/children` · `myChildren` · мөр 34
- `GET /parent/links/pending` · `pendingLinks` · мөр 40
- `POST /parent/links/:id/verify` · `verify` · мөр 46
- `POST /parent/links/:id/reject` · `reject` · мөр 52
- `POST /parent/results/:testResultId/ack/request` · `requestAck` · мөр 58
- `POST /parent/results/:testResultId/ack/verify` · `verifyAck` · мөр 67
## passes

Эх: `api/src/passes/passes.controller.ts`

- `GET /catalog/passes` · `listActive` · мөр 28
- `POST /passes` · `create` · мөр 35
- `PATCH /passes/:id` · `update` · мөр 47
- `DELETE /passes/:id` · `remove` · мөр 61
- `POST /passes/:id/grant` · `grant` · мөр 71
- `GET /me/passes` · `my` · мөр 84
- `DELETE /me/passes/:userPassId` · `revoke` · мөр 92
## payments

Эх: `api/src/payments/payments.controller.ts`

- `POST /payments` · `create` · мөр 35
- `GET /payments/my` · `my` · мөр 41
- `GET /payments` · `list` · мөр 48
- `PATCH /payments/:id` · `update` · мөр 57
- `POST /payments/:id/confirm` · `confirm` · мөр 71
- `POST /payments/:id/reject` · `reject` · мөр 85
- `POST /payments/:id/reverse` · `reverse` · мөр 102
- `GET /payments/months/:month` · `monthStatus` · мөр 116
- `GET /payments/student/:id` · `studentHistory` · мөр 124
- `GET /payments/outstanding` · `outstanding` · мөр 132
## progress

Эх: `api/src/progress/progress.controller.ts`

- `GET /progress/online-students` · `onlineStudents` · мөр 39
- `GET /progress/student/:id` · `studentDepth` · мөр 57
- `GET /progress/student/:id/timeline` · `timeline` · мөр 71
- `POST /progress/student/:id/assign-test` · `assignTest` · мөр 82
- `PATCH /progress/student/:id/attempt/:attemptId` · `adjustAttempt` · мөр 97
- `DELETE /progress/student/:id/attempt/:attemptId` · `deleteAttempt` · мөр 114
- `POST /progress/student/:id/reset-chapter` · `resetChapter` · мөр 129
## recommend

Эх: `api/src/recommend/recommend.controller.ts`

- `GET /recommend/next` · `next` · мөр 36
- `POST /recommend/attempt` · `submitAttempt` · мөр 54
## reconcile

Эх: `api/src/reconcile/reconcile.controller.ts`

- `POST /reconcile/import` · `FileInterceptor` · мөр 50
- `GET /reconcile/transactions` · `getTransactions` · мөр 116
- `POST /reconcile/:id/match` · `manualMatch` · мөр 128
- `POST /reconcile/:id/ignore` · `ignoreTransaction` · мөр 149
## schedule

Эх: `api/src/schedule/schedule.controller.ts`

- `POST /schedule` · `create` · мөр 46
- `GET /schedule` · `findAll` · мөр 51
- `GET /schedule/classroom/:id` · `forClassroom` · мөр 56
- `GET /schedule/me` · `forMe` · мөр 62
- `GET /schedule/week` · `week` · мөр 69
- `POST /schedule/bulk` · `bulkCreate` · мөр 75
- `POST /schedule/:id/split` · `splitSeries` · мөр 83
- `POST /schedule/:id/exceptions` · `upsertException` · мөр 89
- `DELETE /schedule/:id/exceptions/:exceptionId` · `removeException` · мөр 99
- `PATCH /schedule/:id/topic` · `upsertTopic` · мөр 114
- `DELETE /schedule/:id/topic` · `clearTopic` · мөр 124
- `GET /schedule/teachers` · `listTeacherOptions` · мөр 139
- `GET /schedule/teacher-workdays` · `listTeacherWorkDays` · мөр 144
- `PUT /schedule/teacher-workdays` · `putTeacherWorkDays` · мөр 153
- `POST /schedule/teacher-workdays/exception` · `upsertTeacherWorkException` · мөр 162
- `GET /schedule/days` · `days` · мөр 176
- `GET /schedule/:id` · `findOne` · мөр 186
- `PATCH /schedule/:id` · `update` · мөр 192
- `DELETE /schedule/:id` · `remove` · мөр 198
- `POST /calendar` · `createCalendarDay` · мөр 206
- `GET /calendar` · `listCalendarDays` · мөр 214
- `GET /calendar/:id` · `findCalendarDay` · мөр 222
- `PATCH /calendar/:id` · `updateCalendarDay` · мөр 228
- `DELETE /calendar/:id` · `removeCalendarDay` · мөр 234
## storage

Эх: `api/src/storage/uploads.controller.ts`

- `POST /uploads` · `FileInterceptor` · мөр 187
- `GET /files/:key` · `serve` · мөр 231
## store

Эх: `api/src/store/store.controller.ts`

- `GET /store/products` · `listProducts` · мөр 26
- `POST /store/purchase` · `purchase` · мөр 35
- `GET /store/my-purchases` · `myPurchases` · мөр 47
- `POST /store/admin/products` · `createProduct` · мөр 57
- `POST /store/admin/products/:id/deactivate` · `deactivateProduct` · мөр 77
- `POST /store/admin/products/:id/price` · `updatePrice` · мөр 94
- `GET /store/admin/products` · `adminGetAllProducts` · мөр 113
- `GET /store/admin/purchases` · `adminGetAllPurchases` · мөр 123
- `GET /store/admin/revenue` · `adminGetRevenueSummary` · мөр 133
## tasks

Эх: `api/src/tasks/tasks.controller.ts`

- `POST /tasks` · `create` · мөр 36
- `GET /tasks` · `findAll` · мөр 42
- `GET /tasks/workload` · `workload` · мөр 49
- `GET /tasks/staff-directory` · `staffDirectory` · мөр 56
- `GET /tasks/:id` · `findOne` · мөр 61
- `PATCH /tasks/:id` · `update` · мөр 66
- `DELETE /tasks/:id` · `remove` · мөр 75
- `POST /tasks/:id/assignees` · `addAssignee` · мөр 81
- `DELETE /tasks/:id/assignees/:userId` · `removeAssignee` · мөр 87
## teacher-groups

Эх: `api/src/teacher-groups/teacher-groups.controller.ts`

- `POST /teacher-groups/register` · `registerExternalTeacher` · мөр 31
- `GET /teacher-groups/unverified` · `getUnverifiedTeachers` · мөр 44
- `PUT /teacher-groups/verify/:userId` · `verifyExternalTeacher` · мөр 55
- `POST /teacher-groups/create` · `createGroup` · мөр 73
- `GET /teacher-groups/my-groups` · `getMyGroups` · мөр 86
- `GET /teacher-groups/:groupId` · `getGroupDetails` · мөр 96
- `POST /teacher-groups/join` · `joinGroup` · мөр 109
- `PUT /teacher-groups/:groupId/archive` · `archiveGroup` · мөр 122
- `DELETE /teacher-groups/:groupId/students/:studentId` · `removeStudentFromGroup` · мөр 135
## tests

Эх: `api/src/tests/tests.controller.ts`

- `POST /tests` · `create` · мөр 38
- `GET /tests` · `list` · мөр 43
- `GET /tests/my-results` · `myResults` · мөр 53
- `GET /tests/:id` · `getOne` · мөр 58
- `POST /tests/:id/start` · `start` · мөр 69
- `POST /tests/:id/heartbeat` · `heartbeat` · мөр 78
- `PATCH /tests/:id/session` · `saveSession` · мөр 93
- `POST /tests/:id/submit` · `submit` · мөр 104
- `GET /tests/:id/review` · `review` · мөр 115
- `POST /tests/:id/results` · `enterResult` · мөр 121
- `GET /tests/:id/results` · `results` · мөр 131
- `DELETE /tests/:id` · `remove` · мөр 139
- `GET /tests/:id/acknowledgements` · `acknowledgements` · мөр 145
- `GET /tests/students/:id/test-results` · `byStudent` · мөр 161
## tuition

Эх: `api/src/tuition/tuition.controller.ts`

- `GET /tuition/refund/preview` · `previewRefund` · мөр 43
- `POST /tuition/refund` · `createRefund` · мөр 58
- `POST /tuition/refund/:id/pending` · `submitForApproval` · мөр 78
- `POST /tuition/refund/:id/approve` · `approveRefund` · мөр 89
- `POST /tuition/refund/:id/paid` · `markAsPaid` · мөр 104
- `POST /tuition/refund/:id/cancel` · `cancelRefund` · мөр 120
- `GET /tuition/refund/:id` · `getRefund` · мөр 136
- `GET /tuition/refunds` · `listRefunds` · мөр 146
- `GET /tuition/paid-until/my` · `getMyPaidUntil` · мөр 168
- `GET /tuition/paid-until/:studentId` · `getPaidUntil` · мөр 181
## users

Эх: `api/src/users/users.controller.ts`

- `GET /users` · `listUsers` · мөр 61
- `POST /users` · `createUser` · мөр 67
- `GET /users/teachers` · `listTeachers` · мөр 72
- `GET /users/search` · `searchStudents` · мөр 79
- `GET /users/:id` · `getDetail` · мөр 87
- `PATCH /users/:id/profile` · `updateProfile` · мөр 94
- `POST /users/:id/send-password-reset` · `sendPasswordReset` · мөр 117
- `POST /users/promote-teacher` · `promote` · мөр 126
- `PATCH /users/:id/teacher-status` · `setStatus` · мөр 131
- `PATCH /users/:id/role` · `setRole` · мөр 140
- `GET /users/students/pending-approval` · `getPendingApprovalStudents` · мөр 150
- `POST /users/students/:id/approve` · `approveStudent` · мөр 157
## videos

Эх: `api/src/videos/videos.controller.ts`

- `POST /videos` · `create` · мөр 33
- `GET /videos` · `listByChapter` · мөр 38
- `GET /videos/chapters` · `listChaptersWithVideos` · мөр 46
- `PATCH /videos/:id` · `update` · мөр 62
- `DELETE /videos/:id` · `remove` · мөр 73

## Веб хуудас

- `/app/admin/analytics` → `web/src/app/app/admin/analytics/page.tsx`
- `/app/admin/audit` → `web/src/app/app/admin/audit/page.tsx`
- `/app/admin/classrooms` → `web/src/app/app/admin/classrooms/page.tsx`
- `/app/admin/content` → `web/src/app/app/admin/content/page.tsx`
- `/app/admin/enrollment` → `web/src/app/app/admin/enrollment/page.tsx`
- `/app/admin/finance` → `web/src/app/app/admin/finance/page.tsx`
- `/app/admin/leads` → `web/src/app/app/admin/leads/page.tsx`
- `/app/admin` → `web/src/app/app/admin/page.tsx`
- `/app/admin/reconcile` → `web/src/app/app/admin/reconcile/page.tsx`
- `/app/admin/registry` → `web/src/app/app/admin/registry/page.tsx`
- `/app/admin/store` → `web/src/app/app/admin/store/page.tsx`
- `/app/admin/students/[id]` → `web/src/app/app/admin/students/[id]/page.tsx`
- `/app/admin/students` → `web/src/app/app/admin/students/page.tsx`
- `/app/admin/theory` → `web/src/app/app/admin/theory/page.tsx`
- `/app/buyer` → `web/src/app/app/buyer/page.tsx`
- `/app/goals` → `web/src/app/app/goals/page.tsx`
- `/app/groups/[groupId]` → `web/src/app/app/groups/[groupId]/page.tsx`
- `/app/groups` → `web/src/app/app/groups/page.tsx`
- `/app/insights` → `web/src/app/app/insights/page.tsx`
- `/app/learn/[chapterId]` → `web/src/app/app/learn/[chapterId]/page.tsx`
- `/app/learn` → `web/src/app/app/learn/page.tsx`
- `/app/library` → `web/src/app/app/library/page.tsx`
- `/app/online/[id]` → `web/src/app/app/online/[id]/page.tsx`
- `/app/online` → `web/src/app/app/online/page.tsx`
- `/app/parent` → `web/src/app/app/parent/page.tsx`
- `/app/password` → `web/src/app/app/password/page.tsx`
- `/app/payments` → `web/src/app/app/payments/page.tsx`
- `/app/planner` → `web/src/app/app/planner/page.tsx`
- `/app/practice` → `web/src/app/app/practice/page.tsx`
- `/app/profile` → `web/src/app/app/profile/page.tsx`
- `/app/schedule` → `web/src/app/app/schedule/page.tsx`
- `/app/sms` → `web/src/app/app/sms/page.tsx`
- `/app/store` → `web/src/app/app/store/page.tsx`
- `/app/student` → `web/src/app/app/student/page.tsx`
- `/app/student/payments` → `web/src/app/app/student/payments/page.tsx`
- `/app/students/[id]` → `web/src/app/app/students/[id]/page.tsx`
- `/app/teacher` → `web/src/app/app/teacher/page.tsx`
- `/app/tests/[id]` → `web/src/app/app/tests/[id]/page.tsx`
- `/app/tests/[id]/results` → `web/src/app/app/tests/[id]/results/page.tsx`
- `/app/tests/new` → `web/src/app/app/tests/new/page.tsx`
- `/app/tests` → `web/src/app/app/tests/page.tsx`
- `/app/tuition` → `web/src/app/app/tuition/page.tsx`
- `/app/videos` → `web/src/app/app/videos/page.tsx`
- `/auth/google/callback` → `web/src/app/auth/google/callback/page.tsx`
- `/forgot-password` → `web/src/app/forgot-password/page.tsx`
- `/login` → `web/src/app/login/page.tsx`
- `/` → `web/src/app/page.tsx`
- `/register` → `web/src/app/register/page.tsx`

## Prisma model

User, GoogleIdentity, GoogleOAuthState, GoogleLoginExchange, PasswordResetToken, SmsMessage, SmsBatch, SmsTemplate, StudentProfile, TeacherProfile, ExternalTeacherProfile, ParentLink, Classroom, TeacherGroup, TeacherGroupMember, Enrollment, Attendance, Assignment, Submission, DailyHomeworkMark, Book, Chapter, Topic, TheoryBlock, Video, ProblemChoice, Problem, Tag, ProblemTag, Formula, ProblemFormula, ProblemAnalysis, Test, TestProblem, TestAccess, TestAttemptSession, TestResult, ResultAcknowledgement, EmailOtp, Attempt, DailyClassSummary, Prediction, StudentColorTag, StudentNote, AuditLog, Pass, UserPass, BankTransaction, StudentCodeLegacy, Payment, ProductItem, Purchase, ExpenseRecord, TuitionRefund, Announcement, AnnouncementClassroomTarget, ClassTestSession, LearningEvent, EnrollmentWindow, Lead, StaffTask, StaffTaskAssignee, ClassSchedule, ScheduleException, LessonTopic, TeacherWorkDay, TeacherWorkException, AcademicCalendarDay, StudentGoal, StreakFreeze
