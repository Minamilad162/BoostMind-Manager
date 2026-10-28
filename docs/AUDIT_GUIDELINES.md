# PROJECT_AUTOMATED_AUDIT_INSTRUCTIONS.md

**Version:** 1.0  
**Purpose:** هذا الملف يُرسل مع أي مشروع برمجي لكي يقوم ChatGPT بتحليل المشروع، اختيار الفحوصات المناسبة له، تنفيذ ما يمكن تنفيذه، وتقديم تقرير واضح بالإصلاحات والمخاطر قبل الـ Production.

---

# 1. التعليمات الأساسية إلى ChatGPT

عند استلام هذا الملف مع أي مشروع، لا تتعامل معه كـ Checklist ثابتة يتم تطبيقها بالكامل بشكل أعمى.

يجب أولًا:

1. قراءة المشروع وفهم بنيته الحالية.
2. تحديد الـ Stack والتقنيات المستخدمة.
3. تحديد طبيعة المشروع:
   - Frontend فقط.
   - Full Stack.
   - API / Backend.
   - Database Project.
   - Serverless Application.
   - Mobile App.
   - Dashboard.
   - Tracker / Workflow System.
   - Import / Export System.
4. تحديد الأجزاء الحرجة في المشروع.
5. اختيار الفحوصات المناسبة فقط بناءً على:
   - Architecture.
   - حجم البيانات.
   - طريقة الاستخدام.
   - عدد المستخدمين المتوقع.
   - بيئة التشغيل.
   - نوع الـ Database.
   - وجود Authentication أو Roles.
   - وجود Cache أو Realtime أو Background Jobs.
6. عدم تطبيق اختبارات غير مناسبة لمجرد أنها موجودة في هذا الملف.
7. عدم افتراض أن المشروع يعمل بكفاءة لمجرد أن الـ Build ناجح.
8. عدم تغيير الكود عشوائيًا قبل تحديد الـ Root Cause.
9. الحفاظ على الـ Existing Logic والـ Architecture ما لم تكن هي سبب المشكلة.
10. التحقق من الـ Side Effects قبل تنفيذ أي تعديل.
11. عدم حذف أي Feature أو Logic موجودة بهدف التبسيط إلا إذا طُلب ذلك صراحة.
12. عدم تعديل Production أو Production Database أثناء الفحص أو التطوير.
13. استخدام Development / Test Environment فقط عند تنفيذ الفحوصات.
14. توثيق أي جزء لا يمكن اختباره بدل ادعاء أنه تم اختباره.
15. تقديم Evidence لكل نتيجة مهمة.

---

# 2. الوضع الافتراضي للفحص

إذا لم أحدد نوع المهمة، استخدم الوضع التالي:

## Default Mode: Full Technical Audit

يشمل:

- فهم المشروع.
- فحص Architecture.
- مراجعة Code.
- مراجعة Performance.
- مراجعة Database.
- مراجعة Security.
- مراجعة Error Handling.
- مراجعة Cache.
- مراجعة Concurrency.
- مراجعة Memory Risks.
- مراجعة Build وDeployment.
- تحديد الفحوصات التي تحتاج Load Test.
- تحديد المشكلات.
- ترتيبها حسب الخطورة.
- اقتراح الإصلاحات.

**لا تعدل المشروع تلقائيًا في Default Mode إلا إذا طلبت منك صراحة تنفيذ الإصلاحات.**

---

# 3. أوضاع العمل المتاحة

يمكنني كتابة أحد الأوضاع التالية عند إرسال المشروع:

## Mode A — Audit Only

- تحليل المشروع فقط.
- عدم تعديل أي ملفات.
- تقديم تقرير شامل.
- تحديد المشاكل والمخاطر.
- تحديد الاختبارات المطلوبة.

## Mode B — Audit and Fix

- تحليل المشروع.
- تحديد Root Cause.
- تنفيذ الإصلاحات الآمنة.
- الحفاظ على Existing Logic.
- تشغيل Build وTests بعد التعديل.
- تقديم نسخة كاملة من المشروع بعد الإصلاح.
- توضيح الملفات التي تم تعديلها.
- مقارنة الأداء أو السلوك قبل وبعد عندما يكون ذلك ممكنًا.

## Mode C — Pre-Production Release Check

- فحص المشروع كإصدار مرشح للـ Production.
- تشغيل كل الفحوصات المناسبة.
- فحص Environment Variables.
- فحص Build Production.
- فحص Database Migrations.
- فحص Security.
- فحص Performance Regression.
- فحص Rollback Readiness.
- إصدار قرار:
  - GO
  - GO WITH CONDITIONS
  - NO-GO

## Mode D — Performance Investigation

- عدم تغيير الكود في البداية.
- قياس Request Flow.
- تحديد Bottleneck الحقيقي.
- تحليل:
  - CPU.
  - I/O.
  - Database.
  - Connection Pool.
  - Threads / Workers.
  - Memory.
  - Cache.
  - Network.
  - Frontend Rendering.
- تنفيذ الإصلاح فقط بعد وجود دليل واضح.

## Mode E — Security and Permissions Audit

- فحص Authentication.
- فحص Authorization.
- فحص Roles.
- فحص RLS.
- فحص Data Isolation.
- فحص Admin Actions.
- فحص Secrets.
- فحص Uploads.
- فحص Audit Logs.
- فحص Rate Limits.
- فحص Client-side privilege bypass.

---

# 4. أول خطوة إلزامية: Project Discovery

قبل بدء الفحص، يجب إنشاء Project Profile من الكود الفعلي.

## يجب تحديد:

- Project Name.
- Project Version.
- Main Framework.
- Programming Language.
- Package Manager.
- Build Tool.
- Frontend Framework.
- Backend Framework.
- Database.
- ORM أو Query Layer.
- Authentication Provider.
- Hosting Platform.
- Storage Provider.
- External APIs.
- Realtime Features.
- Cache Layer.
- Background Jobs.
- Scheduled Jobs.
- Import / Export Functions.
- Main User Roles.
- Critical Business Flows.
- Main Tables / Entities.
- Existing Tests.
- Deployment Configuration.
- Environment Files.
- Database Migration Structure.

## يجب كذلك تحديد:

- الملفات الرئيسية التي يبدأ منها التطبيق.
- الـ Routes الرئيسية.
- الـ API Endpoints.
- الـ Database Queries أو RPCs الحرجة.
- الـ Components أو Services الأكثر استخدامًا.
- أي كود مكرر أو Architecture غير واضحة.
- أي TODO أو FIXME أو Placeholder Logic.
- أي Dependencies قديمة أو غير مستخدمة.

---

# 5. اختيار الفحوصات تلقائيًا

بعد Project Discovery، يجب إنشاء:

## Applicable Checks

الفحوصات التي تنطبق على المشروع وسيتم تنفيذها.

## Non-Applicable Checks

الفحوصات غير المناسبة مع توضيح السبب.

## Manual Checks Required

الفحوصات التي تحتاج:

- Credentials.
- Production-like data.
- External service access.
- Browser interaction.
- Load testing environment.
- Database access.
- Monitoring access.

لا يتم وضع علامة Pass على فحص لم يتم تنفيذه فعليًا.

---

# 6. Architecture Audit

يجب فحص ما يلي حسب المشروع:

- هل Architecture مفهومة وقابلة للتتبع؟
- أين توجد Business Rules؟
- ما هو Source of Truth؟
- هل توجد Logic مكررة بين Frontend وBackend وDatabase؟
- هل توجد Coupling عالية؟
- هل توجد Circular Dependencies؟
- هل توجد ملفات أو Components ضخمة جدًا؟
- هل يوجد فصل واضح بين:
  - UI.
  - State.
  - API.
  - Business Logic.
  - Database Logic.
- هل Failure في خدمة واحدة يعطل النظام كله؟
- هل يوجد Single Point of Failure؟
- هل توجد Hidden Side Effects؟
- هل توجد عمليات تعتمد على ترتيب غير مضمون؟
- هل المشروع قابل للتوسع دون إعادة كتابة كبيرة؟

---

# 7. Code Quality Audit

يجب فحص:

- Dead Code.
- Duplicate Logic.
- Unused Imports.
- Unused Dependencies.
- Large Functions.
- Large Components.
- Hard-coded Values.
- Hard-coded URLs.
- Hidden Business Rules.
- Missing Type Safety.
- Unsafe Type Casting.
- Silent Error Handling.
- Empty Catch Blocks.
- Missing Validation.
- Inconsistent Naming.
- Complex Conditional Logic.
- Unclear State Management.
- Mutation of Shared State.
- Non-deterministic Logic.
- Incorrect Async Handling.
- Missing Cleanup.
- Missing Tests.
- Placeholder Code.
- Fake Data left in Production paths.

---

# 8. API Audit

إذا كان المشروع يحتوي على APIs أو RPCs، يجب فحص:

- Duplicate Requests.
- N+1 Requests.
- Waterfall Requests.
- Missing Pagination.
- Full Dataset Loading.
- Large Responses.
- Missing Timeouts.
- Unsafe Retries.
- Missing Cancellation.
- Incorrect HTTP Methods.
- Incorrect Status Codes.
- Missing Validation.
- Missing Authentication.
- Missing Authorization.
- Inconsistent Error Format.
- Unbounded Search.
- Unbounded Export.
- Unbounded Page Size.
- Missing Idempotency.
- Double Submit Risk.
- Partial Failure Risk.
- Slow Serialization.
- Returning unused fields.

## يجب قياس أو تقدير:

- Request Count per Page.
- Response Size.
- Data Rows Returned.
- Duplicate Calls.
- Critical Endpoint Latency إن أمكن.
- Timeout behavior.
- Retry behavior.

---

# 9. Database Audit

إذا كان المشروع يستخدم Database، يجب فحص:

- Query Structure.
- `SELECT *`.
- Missing Indexes.
- Wrong Indexes.
- N+1 Queries.
- Query inside Loops.
- Sequential Scans على جداول كبيرة.
- Expensive Sorting.
- Expensive Aggregations.
- Large Joins.
- Duplicate Rows بسبب Joins.
- Missing Constraints.
- Missing Foreign Keys.
- Incorrect Cascades.
- Long Transactions.
- Open Transactions.
- Lock Risks.
- Deadlock Risks.
- Offset Pagination على أحجام ضخمة.
- Soft Delete handling.
- Audit Log correctness.
- Data Type mismatches.
- Implicit casts.
- JSON fields المستخدمة بدل relational design دون داعٍ.
- Limits الافتراضية التي قد تقطع النتائج بصمت.
- Queries التي تقرأ Rows كثيرة وتعيد Rows قليلة.
- Dashboard calculations التي تعاد بالكامل دون Cache أو Pre-aggregation.

## عند توفر Database Access

يجب استخدام ما يناسب:

- `EXPLAIN`.
- `EXPLAIN ANALYZE`.
- Query Plans.
- Slow Query Logs.
- Index Usage.
- Table Size.
- Row Counts.
- Lock Inspection.
- Connection Inspection.

---

# 10. Connection Pool Audit

يُطبق فقط إذا كان المشروع يستخدم Database Connections مباشرة أو عبر Pool.

يجب فحص:

- هل يتم إنشاء Connection جديدة مع كل Request؟
- هل يتم إعادة استخدام Connections؟
- هل Pool Size معروفة؟
- هل Pool Size مناسبة لحدود Database؟
- هل توجد Connection Timeout؟
- هل توجد Query Timeout؟
- هل Connections تُعاد بعد Error؟
- هل توجد Idle-in-Transaction Sessions؟
- هل توجد Requests تنتظر Connection؟
- هل زيادة Pool قد تضغط Database بدل تحسين الأداء؟
- هل مجموع Connections من كل Services وEnvironments آمن؟

---

# 11. Concurrency and Race Conditions Audit

يجب فحصه عند وجود:

- Multiple Users.
- Parallel Requests.
- Shared Records.
- Imports.
- Jobs.
- Realtime.
- Background Processing.

الفحوصات تشمل:

- Double Submit.
- Duplicate Record Creation.
- Lost Updates.
- Two users editing the same record.
- Delete while Update.
- Update after stale read.
- Missing transaction.
- Missing atomic operation.
- Missing version check.
- Unsafe shared state.
- Lock contention.
- Repeated scheduled jobs.
- Multiple instances executing the same task.
- Retry creating duplicates.
- Network failure after successful commit.

---

# 12. Memory and Resource Audit

يجب فحص ما ينطبق:

- Arrays أو Maps تكبر بلا Limit.
- Cache بلا TTL.
- Cache بلا Maximum Size.
- Event Listeners لا يتم تنظيفها.
- Subscriptions لا يتم إغلاقها.
- Timers وIntervals لا يتم تنظيفها.
- Abort Controllers غير مستخدمة.
- Requests قديمة تظل فعالة.
- Closures تحتفظ ببيانات كبيرة.
- Components مغلقة تظل في Memory.
- Realtime channels تظل مفتوحة.
- Files أو Streams لا يتم إغلاقها.
- Large Objects محفوظة بلا داعٍ.
- Logs تحتفظ بـ Payloads ضخمة.
- In-flight request maps لا يتم تنظيفها بعد Error.
- Object URLs لا يتم Revoke لها.
- Memory increase after repeated navigation.
- Memory increase after repeated open/close of dialogs.
- Memory increase after load and no recovery.

---

# 13. Cache Audit

إذا كان المشروع يحتوي على Cache، يجب فحص:

- سبب وجود Cache.
- Cache Key.
- TTL.
- Maximum Size.
- User isolation.
- Company isolation.
- Filter isolation.
- Fiscal Year isolation.
- Cache invalidation.
- Incremental invalidation.
- Stale data.
- Cache stampede.
- In-flight deduplication.
- Timeout cooldown.
- Last-good payload behavior.
- Cache hit/miss behavior.
- Permissions changes and cache.
- Create/Update/Delete impact.
- Full cache rebuild risk.
- Duplicate cache layers.

---

# 14. Frontend Audit

إذا كان المشروع يحتوي على Frontend، يجب فحص:

- Duplicate API Calls.
- Incorrect `useEffect` dependencies.
- Strict Mode duplicate side effects.
- Re-render storms.
- Large state objects.
- Full dataset in browser.
- Client-side filtering of large datasets.
- Missing server-side pagination.
- Large DOM.
- Large lists without virtualization.
- Large charts.
- Charts recalculating on hover.
- Missing code splitting.
- Large bundle.
- Blocking scripts.
- Unoptimized assets.
- Uncancelled requests.
- Memory leaks.
- Missing loading states.
- Missing error states.
- Buttons allowing duplicate submit.
- Mobile performance.
- Accessibility issues that affect usability.
- Client-side-only security checks.
- Tokens or secrets exposed in the bundle.

---

# 15. Authentication and Authorization Audit

يجب فحص:

- Login flow.
- Session persistence.
- Token refresh.
- Logout.
- Password reset.
- Protected routes.
- Backend authorization.
- Database authorization.
- Role enforcement.
- User/Company/Site isolation.
- Admin-only actions.
- Viewer restrictions.
- Delete restrictions.
- Audit logging.
- RLS policies.
- Service role exposure.
- Authorization based on editable client fields.
- Access after role change.
- Access after user deactivation.
- Cached permission data.
- Direct API bypass attempts.

---

# 16. Security Audit

الفحوصات تشمل ما ينطبق:

- SQL Injection.
- XSS.
- HTML Injection.
- Command Injection.
- Path Traversal.
- Unsafe file uploads.
- File size limits.
- MIME validation.
- Secrets in repository.
- Secrets in frontend.
- Sensitive logs.
- CORS.
- CSRF when applicable.
- Rate limiting.
- Brute-force protection.
- Unbounded search.
- Unbounded export.
- Open redirects.
- Insecure storage.
- Public buckets.
- Weak RLS.
- Over-permissive service accounts.
- Dependency vulnerabilities.
- Missing security headers.

---

# 17. Error Handling and Reliability Audit

يجب فحص:

- Missing Timeouts.
- Infinite Retry.
- Retry without backoff.
- Retry of non-idempotent operations.
- Silent catches.
- Generic misleading errors.
- Partial saves.
- Half-completed transactions.
- Upload failure.
- Import failure.
- Export failure.
- Network disconnect.
- Token expiration.
- Database timeout.
- External API failure.
- Cache failure.
- Duplicate response.
- Success in backend but failure in frontend.
- Clear user feedback.
- Recoverability.
- Health checks.
- Graceful degradation.

---

# 18. Build, Dependencies and Deployment Audit

يجب فحص:

- Build succeeds.
- Tests succeed.
- Lint succeeds.
- Type check succeeds.
- Production build succeeds.
- Missing environment variables.
- Incorrect environment variables.
- Development URLs inside Production build.
- Dependency lock file.
- Unused dependencies.
- Vulnerable dependencies.
- Platform limits.
- Serverless limits.
- Function timeout.
- Memory limits.
- Request limits.
- Storage limits.
- Domain.
- SSL.
- CORS.
- Deployment configuration.
- Database migration order.
- Rollback readiness.
- Backup readiness.
- Version identification.
- Smoke test after deployment.

---

# 19. Performance Testing Selection

لا يتم تشغيل Load Test عشوائيًا.

يجب أولًا تحديد أهم User Flows، مثل:

- Login.
- Dashboard initial load.
- Filter change.
- Search.
- Register pagination.
- Record create.
- Record update.
- File upload.
- Import.
- Export.
- Drilldown.
- Realtime update.

بعدها يتم اختيار الفحوصات المناسبة:

## Load Test
للحمل الطبيعي المتوقع.

## Stress Test
لمعرفة نقطة الانهيار.

## Spike Test
للزيادة المفاجئة.

## Soak Test
لاكتشاف Memory Leak أو Connection Leak.

## يجب تحديد:

- Concurrent Users.
- Requests per Second.
- Dataset Size.
- Test Duration.
- Expected P50.
- Expected P95.
- Expected P99.
- Acceptable Error Rate.
- Recovery Time.

إذا لم يكن تنفيذ Load Test ممكنًا داخل البيئة الحالية، يجب إنشاء **Load Test Plan جاهز للتنفيذ** بدل الادعاء أن المشروع اجتازه.

---

# 20. Metrics المطلوبة

حسب ما تسمح به البيئة، يجب جمع أو طلب:

- Request Count.
- P50 Latency.
- P95 Latency.
- P99 Latency.
- Error Rate.
- Response Size.
- CPU Usage.
- Memory Usage.
- Memory recovery after load.
- Active Connections.
- Waiting Connections.
- Query Duration.
- Rows Read.
- Rows Returned.
- Cache Hit Rate.
- Cache Miss Rate.
- Duplicate Requests.
- Frontend Bundle Size.
- Browser JS Heap.
- DOM Nodes.
- Failed Jobs.
- Timeouts.
- Retry Count.

---

# 21. AI-Generated Code Gate

أي Code تم إنشاؤه أو تعديله بواسطة AI يجب ألا يُقبل لمجرد أنه يعمل.

يجب التحقق من:

- لماذا الحل مناسب؟
- ما الافتراضات التي يعتمد عليها؟
- هل توجد Libraries أو APIs غير صحيحة؟
- هل الحل متوافق مع الإصدارات الحالية؟
- هل يغير Architecture الحالية؟
- هل يعيد تحميل Full Dataset؟
- هل يضيف Duplicate Requests؟
- هل يسبب Memory Leak؟
- هل يسبب Race Condition؟
- هل يفتح Connection بلا إغلاق؟
- هل يغير Business Logic؟
- هل يحذف Side Effects مهمة؟
- هل يكسر Backward Compatibility؟
- هل توجد Error Paths غير معالجة؟
- هل توجد Security Risks؟
- هل تم اختبار Edge Cases؟
- هل تم قياس الأداء قبل وبعد؟
- هل يمكن Rollback؟

---

# 22. قواعد التعديل عند اختيار Audit and Fix

عند تنفيذ إصلاحات:

1. لا تغيّر أكثر من المطلوب.
2. لا تعيد كتابة المشروع بالكامل دون ضرورة.
3. حافظ على Existing Logic.
4. حافظ على Existing Architecture إن لم تكن سبب المشكلة.
5. راجع Dependencies والـ Side Effects.
6. عدّل Root Cause لا العرض فقط.
7. لا تستخدم Workaround هشًا إذا كان الحل الجذري ممكنًا.
8. لا تحذف Feature موجودة دون طلب.
9. لا تغيّر Database Schema دون Migration.
10. لا تنفذ Migration على Production.
11. كل Migration يجب أن تكون:
    - مرقمة.
    - موثقة.
    - لها Verification.
    - لها Recovery Notes.
12. شغّل Build وTests بعد التعديل.
13. نفذ Regression Check.
14. قارن النتائج قبل وبعد إن أمكن.
15. سلّم نسخة كاملة من المشروع، وليس Patch فقط، إذا كان المطلوب تسليم مشروع معدل.
16. استبعد `node_modules` من أي ZIP.
17. اذكر الملفات التي تم تعديلها باختصار.
18. لا تكرر تعليمات تشغيل طويلة يعرفها المستخدم مسبقًا.

---

# 23. Output المطلوب من ChatGPT

بعد الفحص، يجب تسليم التقرير بهذا الشكل:

## 1. Executive Summary

- حالة المشروع.
- أهم المخاطر.
- هل مناسب للـ Production؟
- أهم 3 إجراءات مطلوبة.

## 2. Project Profile

- Stack.
- Architecture.
- Database.
- Hosting.
- Critical Flows.

## 3. Applied Checks

- الفحوصات التي تم اختيارها.
- سبب اختيار كل مجموعة.

## 4. Findings

مرتبة حسب:

- Critical.
- High.
- Medium.
- Low.

لكل Finding:

- ID.
- المشكلة.
- مكانها.
- الدليل.
- التأثير.
- Root Cause.
- الإصلاح المقترح.
- هل تم إصلاحها؟
- طريقة التحقق.

## 5. Performance Findings

- Duplicate Calls.
- Slow Queries.
- Large Responses.
- Memory Risks.
- Cache Risks.
- Connection Risks.
- Frontend bottlenecks.

## 6. Security Findings

- Authentication.
- Authorization.
- Data isolation.
- Secrets.
- Input validation.
- RLS.
- Uploads.

## 7. Tests Executed

- Build.
- Lint.
- Type Check.
- Unit Tests.
- Integration Tests.
- Browser Tests.
- Database Checks.
- Load Tests.

## 8. Tests Not Executed

مع توضيح السبب وما هو المطلوب لتنفيذها.

## 9. Before / After

إذا تم تعديل المشروع:

- السلوك قبل.
- السلوك بعد.
- القياسات قبل.
- القياسات بعد.

## 10. Final Decision

- GO.
- GO WITH CONDITIONS.
- NO-GO.

## 11. Remaining Risks

المخاطر التي ما زالت موجودة.

## 12. Delivered Files

- المشروع المعدل.
- Report.
- Migrations.
- Test files.
- Verification notes.

---

# 24. Mandatory Evidence Rule

لا تستخدم الكلمات التالية دون دليل:

- “Optimized”
- “Production Ready”
- “Secure”
- “Scalable”
- “No Memory Leak”
- “Fast”
- “Fixed”
- “Fully Tested”

يجب ربط كل ادعاء بنتيجة فعلية أو توضيح أنه استنتاج مبدئي.

---

# 25. Final Production Decision Rules

## GO

يُستخدم فقط إذا:

- لا توجد Critical Issues.
- لا توجد High Issues تمنع التشغيل.
- Build ناجح.
- الفحوصات الأساسية ناجحة.
- الصلاحيات آمنة.
- Migration path واضحة.
- Rollback ممكن.
- Performance ضمن الحدود المطلوبة أو مخاطرها مقبولة بالدليل.

## GO WITH CONDITIONS

يُستخدم إذا:

- لا توجد Critical Issues.
- توجد مخاطر معروفة يمكن قبولها مؤقتًا.
- توجد Monitoring وخطة إصلاح واضحة.
- المخاطر لا تسبب فقد بيانات أو اختراق صلاحيات.

## NO-GO

يُستخدم عند وجود:

- Data loss risk.
- Security bypass.
- Production database risk.
- Broken authentication.
- Broken authorization.
- Unbounded critical query.
- Migration غير آمنة.
- Connection leak.
- Memory growth مستمر.
- Failure تحت الحمل المتوقع.
- عدم إمكانية Rollback.
- أرقام Dashboard أو Reports غير موثوقة.

---

# 26. Project-Specific Addendum

عند استخدام هذا الملف مع مشروع معروف، يجب إضافة فحوصات مخصصة له بدل الاكتفاء بالفحوصات العامة.

أمثلة:

- Dashboard:
  - تطابق الأرقام مع Register.
  - Drilldown correctness.
  - Filter persistence.
  - Chart data correctness.
  - Cache invalidation.
- Tracker:
  - Role workflow.
  - Status transitions.
  - Concurrent edits.
  - Notifications.
  - Audit trail.
- Investigation System:
  - Draft/Published separation.
  - Approval workflow.
  - Attachments.
  - Audit.
  - Master record synchronization.
- Import System:
  - Duplicate detection.
  - Partial import rollback.
  - Validation.
  - Large file handling.
- Export System:
  - Memory usage.
  - Large dataset handling.
  - Background export if necessary.

---

# 27. CHEIRON Mandatory Addendum

عند فحص أي إصدار CHEIRON يجب التأكد صراحة من:

- الحفاظ على Dashboard Bundle RPC.
- الحفاظ على Client TTL Cache.
- الحفاظ على In-flight Deduplication.
- الحفاظ على Timeout Cooldown.
- الحفاظ على Cache-based / Server-side Register Pagination.
- عدم إعادة Full Dataset Loading.
- عدم إعادة Duplicate RPC Loading.
- الحفاظ على Incremental Cache Refresh بعد Incident Mutations.
- الحفاظ على Single-Incident Cache Refresh.
- عدم كسر Fiscal Year persistence.
- عدم كسر Company / Site / Location filters.
- تطابق Dashboard Counts مع Register.
- تطابق Drilldown مع KPI.
- مجموع Rolling 12M Man-hours = آخر 11 شهر + الشهر الحالي.
- مجموع Rolling 12M KM بنفس القاعدة.
- عدم حساب Average بدل Sum.
- عدم تغيير Legacy Logic بدون قرار معتمد.
- عدم حذف Tabs أو Charts مخفية.
- التطوير على CHEIRON Development فقط.
- عدم تعديل Production أثناء التطوير.
- كل Database Change في Migration مرقمة.
- وجود Verification وRecovery Notes.
- تسليم Complete Project ZIP بدون `node_modules`.
- تنفيذ Performance Regression Check في كل Release.

---

# 28. معلومات يمكن للمستخدم إضافتها عند إرسال المشروع

يمكن للمستخدم كتابة هذه البيانات، وإن لم يكتبها يتم استنتاج المتاح من المشروع:

- **Mode:** Audit Only / Audit and Fix / Pre-Production / Performance / Security
- **Expected Users:**
- **Expected Concurrent Users:**
- **Expected Data Size:**
- **Target Environment:**
- **Known Problem:**
- **Critical Flows:**
- **Do Not Change:**
- **Required Output:**
- **Production Constraints:**

---

# 29. مثال للرسالة المرفقة مع المشروع

```text
استخدم ملف PROJECT_AUTOMATED_AUDIT_INSTRUCTIONS.md.

Mode: Audit and Fix

راجع المشروع بالكامل وحدد الفحوصات المناسبة له تلقائيًا.
ركز على الأداء، Database Queries، Cache، Duplicate Requests،
الصلاحيات، Memory Risks، والـ Production Readiness.

حافظ على الـ Existing Logic والـ Architecture.
لا تعدل Production.
نفذ الإصلاحات الآمنة فقط.
شغّل Build وTests.
سلّمني Complete Project ZIP بدون node_modules،
ومعه تقرير بالمشاكل والإصلاحات والاختبارات والـ Remaining Risks.
```

---

# 30. Changelog

## v1.0

- تحويل الـ Performance Checklist إلى تعليمات تشغيل تلقائية.
- إضافة Project Discovery.
- إضافة Automatic Check Selection.
- إضافة أوضاع Audit Only وAudit and Fix وPre-Production وPerformance وSecurity.
- إضافة قواعد عدم التعديل العشوائي.
- إضافة Evidence Rule.
- إضافة تقرير نهائي موحد.
- إضافة Project-Specific Addendum.
- إضافة CHEIRON Mandatory Addendum.
