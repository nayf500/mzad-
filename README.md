# مزاد مسارك — نسخة حقيقية Cloudflare

هذه النسخة تربط الواجهة بباك إند Cloudflare Worker وقاعدة Cloudflare D1.

## ما الذي أصبح حقيقياً؟
- إنشاء حساب وتسجيل دخول.
- جلسة دخول محفوظة بملف Cookie آمن.
- تخزين المستخدمين في D1.
- إنشاء مزاد من لوحة المدير.
- عداد المزاد مرتبط بوقت الخادم.
- تسجيل المزايدات في D1.
- منع المزايدة بأقل من الحد الأدنى.
- تحديث السعر الحالي على الخادم.
- عرض آخر المزايدات.
- إيقاف/إنهاء المزاد من واجهة الإدارة عبر API.

## الإعداد على Cloudflare
1. ثبّت Node.js ثم Wrangler: `npm install -g wrangler`
2. سجل الدخول: `wrangler login`
3. أنشئ D1: `wrangler d1 create masarak-auction`
4. انسخ `database_id` الذي يظهر لك إلى `wrangler.toml` مكان `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
5. أنشئ الجداول: `wrangler d1 execute masarak-auction --remote --file=schema.sql`
6. عدّل `ADMIN_PHONE` في `wrangler.toml` إلى رقم الجوال الذي تريد أن يكون مديراً.
7. انشر: `wrangler deploy`

> ملاحظة مهمة: هذه نسخة تشغيلية فعلية للمزاد، لكنها لا تتضمن بوابة دفع أو تحقق OTP. هذه إضافات منفصلة تحتاج مزود دفع/SMS.
