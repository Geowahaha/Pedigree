-- ============================================================
-- Update GDV FAQ entry with detailed guidance + emergency warning
-- ============================================================
UPDATE public.ai_faq_entries
SET
  answer_th = $$กระเพาะบิด (Gastric Dilatation-Volvulus: GDV) เป็นภาวะฉุกเฉินอันตรายถึงชีวิต ข้อมูลนี้เป็นแนวทางทั่วไป ไม่ใช่การวินิจฉัยแทนสัตวแพทย์

อาการที่พบบ่อย: ท้องบวมแข็ง, กระสับกระส่าย/เจ็บปวด, น้ำลายมาก, พยายามอาเจียนแต่ไม่ออก, หายใจเร็ว, เหงือกซีด, อ่อนแรงหรือทรุด

สาเหตุ/ปัจจัยเสี่ยง: กินครั้งละมากหรือเร็ว, ออกกำลังกายหนักทันทีหลังอาหาร, สายพันธุ์อกลึก, อายุเยอะ, ประวัติในสายเลือด

การป้องกัน: แบ่งมื้อเล็กหลายครั้ง, ใช้ชามกันกินเร็ว, งดวิ่งแรงอย่างน้อย 1-2 ชม. หลังอาหาร, เฝ้าระวังเป็นพิเศษในสายพันธุ์เสี่ยง

การรักษา: ต้องรีบนำส่งโรงพยาบาลสัตว์ที่มีอุปกรณ์ครบและสามารถผ่าตัดได้ทันที โดยทั่วไปต้องให้น้ำเกลือ/แก้ช็อก, ระบายแก๊สในกระเพาะ, ผ่าตัดแก้บิดและยึดกระเพาะ (gastropexy) โอกาสเสียชีวิตสูงหากรักษาล่าช้า$$,
  answer_en = $$Gastric dilatation-volvulus (GDV/bloat) is a life-threatening emergency. This is general information and does not replace a veterinarian's diagnosis.

Common signs: Distended hard abdomen, pain/restlessness, excessive drooling, repeated retching with no vomit, rapid breathing, pale gums, weakness/collapse.

Causes/risk factors: Large rapid meals, intense exercise right after eating, deep-chested breeds, older age, family history.

Prevention: Smaller frequent meals, slow feeders, avoid heavy activity for 1-2 hours after meals, and monitor high-risk breeds closely.

Treatment: Go immediately to an emergency veterinary hospital with surgical capability. Typical care includes IV fluids/shock treatment, stomach decompression, and surgery with gastropexy. Delayed treatment carries a high risk of death.$$,
  category = 'health',
  updated_at = now()
WHERE question_en = 'How to prevent gastric torsion (GDV/bloat)?';

COMMIT;
