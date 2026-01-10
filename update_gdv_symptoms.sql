-- ============================================================
-- Expand GDV keywords + add symptom-based GDV FAQ entry
-- ============================================================

UPDATE public.ai_faq_entries
SET
  keywords = array['gdv','bloat','gastric torsion','กระเพาะบิด','บิดกระเพาะ','ท้องอืด','ปวดท้อง','ร้องโหยหวน','กระสับกระส่าย','วิ่งไปมา','พยายามอาเจียน','อาเจียนไม่ออก','น้ำลายไหล','ท้องบวม','หายใจเร็ว','เหงือกซีด','อ่อนแรง','ทรุด','retching','dry heave','drooling','restless','pain','swollen abdomen','pale gums','collapse'],
  updated_at = now()
WHERE question_en = 'How to prevent gastric torsion (GDV/bloat)?'
   OR question_th = 'กระเพาะบิด (GDV) ป้องกันอย่างไร';

WITH entry AS (
  SELECT * FROM (VALUES
    (
      'approved', true, 'any', 'health',
      'อาการแบบไหนที่ควรสงสัยกระเพาะบิด (GDV)',
      'อาการสำคัญ: ท้องบวมแข็ง, กระสับกระส่ายหรือเจ็บปวด, น้ำลายไหลมาก, พยายามอาเจียนแต่ไม่ออก, หายใจเร็ว, เหงือกซีด, อ่อนแรงหรือทรุด\n\nหากสงสัยกระเพาะบิด ให้รีบนำส่งโรงพยาบาลสัตว์ฉุกเฉินที่มีเครื่องมือครบและผ่าตัดได้ทันที เพราะมีโอกาสเสียชีวิตสูงมาก',
      'What symptoms suggest GDV (bloat)?',
      'Key warning signs include a distended hard abdomen, pain/restlessness, excessive drooling, repeated retching with no vomit, rapid breathing, pale gums, weakness, or collapse.\n\nIf you suspect GDV, go immediately to an emergency veterinary hospital with surgical capability. Delayed treatment is often fatal.',
      array['gdv','bloat','gastric torsion','symptoms','signs','distended abdomen','swollen abdomen','retching','dry heave','drooling','restless','pain','pale gums','collapse','ปวดท้อง','ร้องโหยหวน','กระสับกระส่าย','วิ่งไปมา','พยายามอาเจียน','อาเจียนไม่ออก','น้ำลายไหล','ท้องบวม','หายใจเร็ว','เหงือกซีด','อ่อนแรง','ทรุด'],
      10
    )
  ) AS t(status, is_active, scope, category, question_th, answer_th, question_en, answer_en, keywords, priority)
)
INSERT INTO public.ai_faq_entries (
  status, is_active, scope, category,
  question_th, answer_th, question_en, answer_en,
  keywords, priority, source
)
SELECT
  e.status, e.is_active, e.scope, e.category,
  e.question_th, e.answer_th, e.question_en, e.answer_en,
  e.keywords, e.priority, 'seed'
FROM entry e
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_faq_entries f
  WHERE coalesce(f.question_th, '') = coalesce(e.question_th, '')
    AND coalesce(f.question_en, '') = coalesce(e.question_en, '')
);

COMMIT;
