# Master Web App Build Prompt — GitHub / Security / Production Ready

عايزك تساعدني تبني **Web App احترافي وقابل للتوسع والصيانة** في مجال:  
`[بص عايزك تعملي ويب سايت، الويب سايت ده بيشمل Project Management، عايزين نقدر إن إحنا carry project ونكتب اسمه ونكتب السعر، التوتال والسعر للشخصين اللي هم موجودين، اللي هم رؤساء الشركتان، كل واحد هياخد كم من المبلغ نفسه، هو بيبقى 50%-50% نسبته، 50%-50%. عايزين نقدر نحط كل project بـ carry link الويب سايت بتاعه، link الداتابيز بتاعه، إيميل وباسورد الداتابيز، وإيميل وباسورد admin بتاع الـ project، وإيميل وباسورد اليوزر اللي عايزه، نقدر نحط الـ host name والـ host link، نحط الـ host إيميل والـ host باسورد، نكتب description عن المشروع، هو عبارة عن إيه، ونقدر إن إحنا نكتب مجموعة features اللي مطلوبة مننا في الويب سايت ده أو الـ project ده، ويكون فيه contact person رقم يعني نقدر نتواصل عليه لل client، والإيميل بتاع الـ client، ولو فيه مثلاً واتساب link نقدر نحطه، الباسورد دي مع الـ client بتاعنا، لو فيه day وdate نكتب معانا التسليم الـ project ده إمتى مثلاً maximum أو كده. عايز كمان يبقى فيه لكل... يعني يبقى فيه ظاهر لينا دخل الشركة كله كام خلال سنة، خلال كل سنة مالية يعني إحنا دخلنا كام في الشركة، وكل واحد فينا كان اللي دخله كام بالضبط، وممكن ندخل كمان مصروفات لكل project، يعني الـ project ده صرفنا مثلاً host ألف جنيه، صرفنا كذا مثلاً، صرفنا داتابيز ألف جنيه، فيبدأ يكتب برضه المصاريف اللي كانت مطلوبة من كل مشروع، وكمان يقدر إن هو يقسم ده، يعني يسجل ده على كل واحد فينا من الشركة. الشركة برضه اللي هما الاتنين بيدفعوا كل واحد 50% برضه من المصروفات. كمان عايز يبقى فيه كل project نقدر ندخل ونقدر إن إحنا ن carry tasks بالـ features اللي برا بتاعت المشروع، فنـ carry الـ features دي ونـ carry كمان الـ tasks، والـ tasks دي تتعمل لها assign على كل واحد فينا، من الاتنين developers اللي موجودين، فنقدر نـ carry برضه الـ developers accounts، ونقدر إن إحنا نخش نشوف كل حاجة برضه كـ admin، إن هو ي manage كل حاجة ويشوف كل حاجة. فنقدر إن إحنا ن assign الـ task الأولى في الـ project ده لـ developer 1، كده developer تاني وهكذا، فيظهر اسم كل developer جنب كل task من الـ tasks اللي موجودة، أو ممكن أ assign الـ project كله على developer معين، مش per task، يبقى الـ project كله على developer معين. وكل الـ tasks ممكن بقى تتحدد high وlow medium كـ priority يعني بتاعتها. والـ accounts زي ما قلتلك developers وadmin، يعني admin وdevelopers. ممكن يبقى فيه اتنين admin مثلاً واتنين developers حالياً، وبعد كده ممكن نبقى نزود. والتاسكات طبعاً يبقى فيه task management، يبقى فيه ليست الـ tasks، وبعد كده مثلاً الـ to do وـ in done وـ in under review والحاجات دي كلها برضه عايزة تبقى موجودة في الموقع. وهيبقى فيه فاتورة إلكترونية هبعتلك قدام لما نخلص كل حاجة هتبقى الفاتورة الإلكترونية، هقولك إزاي هنعملها، من مثال معايا هبعتلك الـ project اللي أنا عايزك تاخد منه الجزء ده بالضبط. بس ظبط كده الجزء ده كله وبعد كده نبتدي.]`

تعامل مع المشروع كأنه **منتج حقيقي قابل للبيع والتسليم والتشغيل production**، وليس مجرد prototype.

---

## 1. التقنيات الأساسية المطلوبة

- **Frontend:** React + TypeScript + Vite
- **Backend / Database / Auth:** Supabase
- **Hosting / Deployment / Serverless Functions:** Netlify
- **Source Control:** GitHub
- **CI / Security Gate:** GitHub Actions
- **Dependency Monitoring:** Dependabot

### متطلبات أساسية

- لازم المشروع يكون **scalable, maintainable, secure, production-ready** قدر الإمكان.
- لازم يكون **Responsive** بشكل ممتاز على الموبايل والديسكتوب.
- لازم يكون قابل للرفع على GitHub ثم Netlify بدون مشاكل npm / Vite / build.
- لازم يبقى فيه documentation واضح من أول نسخة، ويتحدث مع كل تغيير.

---

## 2. مبادئ التنفيذ العامة

- قبل التنفيذ، افهم فكرة المشروع وتحليلها عمليًا.
- جهز خطة مفصلة خطوة بخطوة للتنفيذ من البداية للنهاية.
- اقترح تحسينات إضافية ذكية حتى لو لم أطلبها صراحة، طالما مفيدة للمشروع.
- وضح في كل مرحلة: هنعمل إيه، ليه، فين، وإزاي.
- نفذ تدريجيًا ومنظمًا بدون كسر أي جزء شغال.
- أي تعديل أو إضافة لازم يكون محافظًا على استقرار المشروع.
- لا تغير أي شيء مستقر إلا لو فيه سبب واضح ومكتوب.
- لو فيه أكثر من اختيار تقني، اختَر الأنسب من حيث البساطة والجودة وقابلية الصيانة.
- لو فيه قرار بين حل سريع وحل أنظف طويل المدى، وضح الفرق واختر الأنسب للمشروع.
- لا تعطل TypeScript أو تخفي errors بدل حل السبب الجذري.
- لا تضيف dependency جديدة إلا لو ضرورية فعلًا، وبعد توثيق السبب.

---

## 3. المخرجات المطلوبة في بداية أي مشروع

قبل كتابة الكود، اعرض:

- Project breakdown واضح.
- Feature list مرتبة حسب الأولوية.
- Suggested app architecture.
- Database design proposal.
- Pages / modules / components structure.
- Roles and permissions إذا المشروع يحتاج ذلك.
- UI/UX direction.
- Color palette مقترحة.
- Font pairing مقترح.
- Animation style مقترح.
- Deployment approach.
- Scalability and maintainability considerations.
- Security considerations.
- Suggested folder structure.
- Initial testing strategy.
- GitHub / Netlify / Supabase production workflow.

---

## 4. متطلبات npm / package management / build

### 4.1 أوامر التشغيل والتحقق

قبل تسليم أي نسخة ZIP أو قبل أي commit مهم، لازم يتم تشغيل:

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

> لو المشروع لا يحتوي على script باسم `typecheck`، يجب إضافته في `package.json` مثل: `"typecheck": "tsc -b --pretty false"`.

- استخدم `npm install` أثناء التطوير أو عند إضافة مكتبة جديدة فقط.
- استخدم `npm ci` قبل build / deploy / GitHub Actions لأنه يعتمد على `package-lock.json` ويثبت نفس النسخ بدقة.
- لازم `npm audit --audit-level=high` ينجح قبل اعتبار النسخة production-ready.

### 4.2 package.json و package-lock.json

- لازم `package.json` يحتوي على كل `dependencies` و `devDependencies` المطلوبة فعليًا.
- لازم يتم إرفاق `package-lock.json` مع المشروع دائمًا.
- ممنوع الاعتماد على packages موجودة محليًا فقط.
- ممنوع تعديل lockfile يدويًا إلا للضرورة وبفهم كامل.
- تأكد أن روابط `resolved` داخل `package-lock.json` من npm الرسمي وليست registry داخلية أو خاصة ببيئة معينة.
- عند وجود مشاكل تحميل packages، اضبط registry على npm الرسمي:

```bash
npm config set registry https://registry.npmjs.org/
```

ويفضل وجود `.npmrc` واضح:

```ini
registry=https://registry.npmjs.org/
```

### 4.3 ممنوعات داخل ZIP أو GitHub

ممنوع إرسال أو رفع:

```gitignore
node_modules
dist
.netlify
.env
.env.local
*.zip
npm-debug.log*
```

المسموح والمطلوب:

```text
src/
public/
package.json
package-lock.json
README.md
PROJECT_CONTEXT.md
CHANGELOG.md
.env.example عند الحاجة
```

### 4.4 vite / tsconfig / alias

لازم يتم ضبط `vite.config.ts` و `tsconfig.json` لدعم alias مثل `@/`:

```ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

وتأكد أن TypeScript paths متوافقة مع Vite alias.

### 4.5 Tailwind / PostCSS

- إذا تم استخدام Tailwind v3، استخدم إعداداتها المناسبة.
- إذا تم استخدام Tailwind v4، استخدم `@tailwindcss/postcss` وليس `tailwindcss` مباشرة داخل PostCSS.
- تأكد من تثبيت PostCSS و Autoprefixer عند الحاجة:

```bash
npm install -D postcss autoprefixer
```

لو المشروع يستخدم ESM و `type: "module"` في `package.json`، استخدم صيغة ESM في config files.

### 4.6 Netlify build

يفضل وجود `netlify.toml`:

```toml
[build]
  command = "npm ci && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```

- Build command على Netlify يكون:

```bash
npm ci && npm run build
```

- Publish directory:

```text
dist
```

---

## 5. GitHub workflow الإلزامي

### 5.1 GitHub repo

- ابدأ المشروع على GitHub، ويفضل أن يكون **Private** في البداية.
- لا ترفع `node_modules`, `dist`, `.env`, `.netlify`, أو أي ZIPs.
- لازم `.gitignore` يكون مضبوط من أول نسخة.
- كل مرحلة مهمة لها commit واضح.
- عند الوصول لنسخة مستقرة، اعمل Git tag مثل:

```bash
git tag v1.0-production-baseline
git push origin v1.0-production-baseline
```

### 5.2 GitHub Actions CI Security Gate

لازم يوجد workflow مثل:

`.github/workflows/ci-security.yml`

ويشغل على الأقل:

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

الغرض:

- منع build مكسور.
- كشف TypeScript errors.
- كشف high vulnerabilities.
- ضمان أن المشروع يشتغل من clean install وليس من جهاز المطور فقط.

### 5.3 Dependabot

لازم يوجد:

`.github/dependabot.yml`

- فعل dependency updates.
- لا تعمل merge تلقائي لأي PR من Dependabot.
- لا تدمج Major upgrades عشوائيًا مثل Vite major أو Tailwind major أو React major.
- Major upgrades تكون planned upgrade منفصلة.
- أي Dependabot PR عليه failed checks لا يتم دمجه.
- Minor/Patch updates يتم مراجعتها وتشغيل CI قبل الدمج.

### 5.4 Branch Protection

لو GitHub plan يسمح، فعل حماية `main`:

- Require status checks to pass.
- Require pull request before merging.
- Require CI Security Gate.

لو الـ repo private والخطة لا تطبق enforcement، نعتمد عمليًا على GitHub Actions + discipline + Netlify build gate.

---

## 6. Security baseline الإلزامي

### 6.1 ملفات security داخل المشروع

أنشئ الملفات التالية من أول مرحلة مناسبة:

- `SECURITY.md`
- `docs/current/SECURITY_PLAN.md`
- `docs/current/RELEASE_SECURITY_CHECKLIST.md`
- `docs/current/DEPENDENCY_AND_SUPPLY_CHAIN_POLICY.md`
- `docs/current/SECRETS_ENVIRONMENT_AND_NETLIFY_POLICY.md`

### 6.2 Environment variables والـ secrets

- ممنوع رفع `.env` أو `.env.local` إلى GitHub أو ZIP.
- استخدم `.env.example` بدون قيم حقيقية.
- أي keys حقيقية تتحط في Netlify Environment Variables فقط.
- في React/Vite frontend، استخدم فقط variables التي تبدأ بـ `VITE_`.
- ممنوع وضع `SUPABASE_SERVICE_ROLE_KEY` في frontend أو أي كود client-side.
- Supabase frontend يستخدم `anon key` فقط.
- أي server-only secrets تكون في Netlify Functions environment فقط.

### 6.3 Supabase security

- فعل RLS على الجداول الحساسة.
- صمم roles من البداية عند الحاجة.
- افصل صلاحيات:
  - Super Admin
  - Admin
  - Company/Branch Admin
  - Normal User
  - Viewer
- لا تعتمد على إخفاء UI فقط كحماية؛ لازم قواعد database / RLS تمنع الوصول.
- راجع insert/update/delete policies بوضوح.
- لا تعرض بيانات خارج نطاق صلاحية المستخدم.

### 6.4 Dependency security

- لا تستخدم مكتبات مهجورة أو عليها vulnerabilities عالية بدون سبب واضح.
- لو مكتبة عليها `No fix available`، اقترح بديل أو وثق accepted risk مؤقتًا.
- أي dependency جديدة لازم توثق سبب إضافتها في `CHANGELOG.md` أو `PROJECT_CONTEXT.md`.
- تجنب إضافة مكتبات ضخمة لميزة بسيطة يمكن تنفيذها بكود بسيط.
- راجع حجم bundle وتأثير المكتبات على performance.

---

## 7. Production deployment على Netlify

### 7.1 قبل الربط

تأكد من نجاح:

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

### 7.2 إعداد Netlify

- Import project from GitHub.
- Branch: `main`.
- Build command:

```bash
npm ci && npm run build
```

- Publish directory:

```text
dist
```

- Environment variables في Netlify فقط.

### 7.3 بعد deploy

نفذ smoke test سريع:

- Login.
- Home/Dashboard loads.
- Main navigation works.
- Core CRUD works.
- Filters/search work.
- Export/download features work.
- Auth/session works.
- Mobile view works.
- Console لا يحتوي على errors خطيرة.

### 7.4 Rollback

وثق طريقة rollback:

- Netlify deploy rollback.
- GitHub tag rollback.
- Database migration rollback لو موجود.

---

## 8. التوثيق الإجباري داخل المشروع

من أول خطوة، أنشئ وتحدث ملفات Markdown مرجعية.

### 8.1 ملفات أساسية

- `PROJECT_CONTEXT.md`
- `CHANGELOG.md`
- `README.md`
- `DEPLOYMENT.md`
- `DATABASE.md`
- `SECURITY.md`

### 8.2 PROJECT_CONTEXT.md يحتوي دائمًا على

- وصف المشروع.
- الهدف منه.
- التقنيات المستخدمة.
- الهيكل العام للمشروع.
- القرارات المعمارية المهمة.
- الجداول والعلاقات.
- الصفحات والموديولات.
- الصلاحيات والأدوار.
- assumptions.
- ما تم تنفيذه.
- الخطوات التالية.
- dependencies المهمة.
- أي مشاكل تم حلها وكيف اتحلت.
- آخر نسخة مستقرة.
- طريقة التشغيل والـ deploy.

### 8.3 CHANGELOG.md

كل نسخة لازم تسجل:

- رقم النسخة.
- تاريخ تقريبي.
- التعديلات.
- هل التعديل UI / logic / security / docs / database.
- أي migration أو breaking change.
- نتيجة build/security checks إن أمكن.

### 8.4 Logic Registry / Business Rules Registry

لو المشروع يحتوي dashboards أو تقارير أو حسابات أو rules، لازم إنشاء ملف داخلي مثل:

`docs/current/LOGIC_REGISTRY.md`

أو حسب المشروع:

`docs/current/DASHBOARD_CHART_LOGIC_REGISTRY.md`

ويحتوي على:

- كل KPI أو chart مربوط بأنهي field.
- شروط inclusion/exclusion.
- keyword rules إن وجدت.
- rate formulas.
- percentage denominator rules.
- drilldown matching logic.
- filter behavior.
- default filters.
- أي exceptions.
- أي mapping rules.

أي تغيير في logic لازم يحدث هذا الملف في نفس النسخة.

### 8.5 Client Handover Documents

عند الاستقرار، جهز ملفات client handover:

- `docs/client/CLIENT_HANDOVER.md`
- `docs/client/PRODUCTION_OPERATION_HANDOVER.md`
- نسخة DOCX/PDF عند الحاجة.

محتوى handover:

- وصف النظام.
- طريقة التشغيل.
- طريقة deploy.
- الصلاحيات.
- source of truth للـ data.
- حدود النظام.
- backup/rollback.
- security operations.
- contacts/ownership placeholders.

---

## 9. متطلبات اتجاه الكتابة ودعم العربي/الإنجليزي

- لازم المشروع يدعم النصوص المختلطة عربي + إنجليزي بشكل صحيح في كل مكان.
- أي بيانات معروضة من المستخدم أو قاعدة البيانات يجب أن تدعم Bidi / RTL / LTR.
- استخدم `dir="auto"` في كل الحقول النصية التي يدخل فيها المستخدم بيانات:
  - input
  - textarea
  - searchable select
  - rich text
  - notes fields

### 9.1 Bidi helper component

```tsx
function BidiText({ children }: { children: React.ReactNode }) {
  return (
    <span dir="auto" className="bidi-text">
      {children}
    </span>
  );
}
```

### 9.2 CSS عام

```css
.bidi-text {
  unicode-bidi: plaintext;
  text-align: start;
  overflow-wrap: anywhere;
}

.code-token,
.ltr-token {
  direction: ltr;
  unicode-bidi: isolate;
  display: inline-flex;
  align-items: center;
  text-align: left;
  white-space: nowrap;
}
```

### 9.3 الأكواد والأرقام المرجعية

الأكواد يجب أن تظهر دائمًا LTR ومعزولة عن النص العربي، مثل:

- Action No.
- Recommendation No.
- Source No.
- IDs
- Email
- Phone
- Tags / Codes

استخدم `<bdi dir="ltr">...</bdi>` أو component مثل `CodeToken`.

### 9.4 تغيير لغة الواجهة

عند تغيير اللغة:

```ts
document.documentElement.lang = currentLanguage === "ar" ? "ar" : "en";
document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
```

- لا تعتمد فقط على اتجاه الصفحة العام.
- استخدم CSS logical properties مثل:
  - `margin-inline-start`
  - `padding-inline`
  - `border-inline-start`
  - `text-align: start/end`
- ممنوع معالجة مشكلة اتجاه الكتابة بتغيير الداتا المخزنة؛ الحل في UI/reusable components.

---

## 10. UI/UX requirements

- التصميم لازم يكون **premium / modern / elegant**.
- اهتم جدًا بالـ spacing والـ hierarchy والوضوح.
- استخدم ألوان وفونتات مناسبة لطبيعة المشروع.
- استخدم animations subtle وراقية وليست مبالغ فيها.
- كل شاشة محسوبة للموبايل والديسكتوب.
- اهتم بحالات:
  - loading
  - empty states
  - error states
  - success feedback
  - permission denied states
  - offline/network errors
- اجعل UX سريع وواضح.
- الكروت والجداول والفلاتر تكون قابلة للاستخدام على mobile.
- تجنب الزحمة، وفضل layout واضح ومريح.

---

## 11. Architecture and code quality

- استخدم feature-based structure قدر الإمكان.
- افصل:
  - UI components
  - business logic
  - data access
  - hooks
  - utilities
  - types
- استخدم reusable components.
- لا تكرر نفس logic في أكثر من مكان.
- أي rules أو calculations تكون في helper واضح ومختبر قدر الإمكان.
- استخدم TypeScript types بوضوح.
- لا تستخدم `any` إلا عند الضرورة ومع سبب.
- لا تترك console logs غير ضرورية في production.
- راعِ performance:
  - memoization عند الحاجة.
  - pagination / virtualization للجداول الكبيرة.
  - lazy loading للصفحات الكبيرة.
  - عدم إعادة تحميل charts بدون داعي.

---

## 12. Database / SQL / migrations

- أي SQL queries أو migrations تكون منظمة في ملفات واضحة.
- أسماء الملفات تكون مفهومة مثل:

```text
001_create_profiles.sql
002_create_orders.sql
003_rls_policies.sql
004_seed_defaults.sql
```

- أي migration لازم يكون لها هدف واضح.
- لا تعدل database schema عشوائيًا بدون توثيق.
- عند تعديل schema، حدث `DATABASE.md` و `PROJECT_CONTEXT.md`.
- راعِ indexes للأعمدة المستخدمة في filters/search.
- لا تخزن secrets داخل database tables إلا لو ضروري وبطريقة آمنة.

---

## 13. Export / PDF / PPTX / Excel / file generation

لو المشروع يحتوي Export أو Report أو PDF أو PPTX أو Excel:

- لازم يتم اختبار التصدير على local وعلى live Netlify.
- الملف الناتج لازم يفتح في التطبيق المستهدف الحقيقي:
  - Microsoft PowerPoint للـ PPTX.
  - Excel للـ XLSX/CSV.
  - PDF viewer للـ PDF.
- لا تعتمد فقط على أن الملف يفتح في LibreOffice أو browser preview.
- تجنب handcrafted file formats المعقدة إلا لو لا يوجد بديل.
- لو تم استخدام dependency للتصدير، لازم تكون موثقة ومراجعة أمنيًا.
- أي download Blob/Object URL لازم يترك وقت كافي قبل revoke حتى لا يحدث corrupted download.
- أي export feature لازم يكون لها error handling ورسالة واضحة للمستخدم.

---

## 14. Testing strategy

قد لا ننفذ test suite كامل من أول يوم، لكن لازم التفكير في الاختبارات من البداية.

### 14.1 Required manual smoke test بعد كل release

- App opens.
- Login/logout works.
- Main dashboard/page loads.
- Navigation works.
- Core CRUD works.
- Filters/search work.
- Export/download works.
- Role permissions work.
- Mobile layout works.
- No critical console errors.

### 14.2 Technical checks

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

### 14.3 Functional tests حسب طبيعة المشروع

وثق test checklist داخل:

`docs/current/TEST_PLAN.md`

ويفضل لاحقًا إضافة:

- unit tests للـ utilities المهمة.
- integration tests للـ data access.
- E2E tests للـ critical flows عند الحاجة.

---

## 15. آلية التنفيذ والتسليم في كل مرة

- في كل رد، اذكر باختصار ما الذي تم تعديله.
- ارجع المشروع كاملًا في ملف ZIP عند أي تعديل مؤثر.
- الـ ZIP يحتوي كل الملفات داخل المسارات الصحيحة وجاهز للنسخ واللصق.
- ممنوع إرسال `node_modules`, `dist`, `.env`, `.netlify` داخل ZIP.
- لو التعديل صغير جدًا، ممكن ترجع patch واضح، مع إتاحة النسخة الكاملة عند الحاجة.
- سمّي ZIP باسم واضح يحتوي version وسبب التعديل:

```text
project-name-v1.04-feature-name-no-node-modules.zip
```

- حدّث `CHANGELOG.md` مع كل نسخة.
- حدّث `PROJECT_CONTEXT.md` مع كل تغيير مهم.
- لو التعديل يغير business logic أو chart logic أو permissions أو security، حدث ملف registry/documentation المناسب.

---

## 16. Release workflow المقترح

لكل نسخة مهمة:

1. نفذ التعديل.
2. حدث docs.
3. شغل:

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

4. جهز ZIP بدون generated/secret files.
5. اعمل commit واضح.
6. Push إلى GitHub.
7. راقب GitHub Actions.
8. لو CI Green، Netlify deploy يشتغل.
9. نفذ smoke test على live.
10. لو stable، اعمل tag:

```bash
git tag vX.Y-stable
git push origin vX.Y-stable
```

---

## 17. Production operation / handover

عند الوصول لنسخة مستقرة، أنشئ:

`docs/client/PRODUCTION_OPERATION_HANDOVER.md`

ويحتوي على:

- GitHub repo link placeholder.
- Netlify site link placeholder.
- Supabase project link placeholder.
- environment variables names فقط بدون قيم.
- deploy workflow.
- rollback plan.
- backup plan.
- security checklist.
- dependency update policy.
- support / maintenance notes.
- latest stable tag.

ممنوع وضع أي secrets داخل handover.

---

## 18. قواعد مهمة جدًا أثناء التنفيذ

- لا تكسر أي جزء شغال.
- لا تغير حاجة مستقرة إلا لو في سبب واضح.
- لا تعتمد على حلول محلية فقط؛ لازم المشروع يشتغل من clean install.
- لا تضيف packages لمجرد تسهيل سريع لو ممكن تنفيذ آمن وبسيط بدونها.
- لا تتجاهل build/type/security errors.
- لا ترفع أسرار أو ملفات generated.
- لا تدمج Dependabot PR failed.
- لا تعمل major dependency upgrade عشوائيًا.
- لا تغير business logic بدون تحديث documentation.
- أي feature جديدة تكون reusable وقابلة للتوسع.
- فكر في edge cases وempty/error states.
- اقترح naming conventions واضحة.
- اكتب next steps بوضوح في كل مرحلة.

---

## 19. طريقة البداية المطلوبة منك الآن

1. افهم فكرة المشروع.
2. راجع المتطلبات.
3. اقترح تحسينات إضافية.
4. اعرض خطة تنفيذ مفصلة جدًا خطوة بخطوة.
5. اذكر structure المشروع المقترح.
6. اذكر قاعدة البيانات المقترحة.
7. اذكر الصفحات الأساسية والمميزات.
8. اذكر الشكل المقترح للـ UI/UX.
9. اذكر الملفات التوثيقية التي ستنشئها.
10. اذكر خطة GitHub/Netlify/Security من البداية.
11. بعد ذلك نبدأ التنفيذ مرحلة مرحلة، وكل مرحلة ترجع النسخة الكاملة ZIP.

---

## 20. ملحوظة نهائية مهمة

هذا البرومبت هدفه بناء مشروع Web App احترافي قابل للتشغيل الحقيقي.  
الأولوية دائمًا: **استقرار + أمان + قابلية صيانة + تجربة مستخدم ممتازة**.  
أي قرار أو تعديل يجب أن يخدم هذه الأولويات، ويتوثق بشكل واضح داخل المشروع.
