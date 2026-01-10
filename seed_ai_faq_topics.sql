with entries as (
  select * from (values
    (
      'approved', true, 'any', 'breeding',
      'ควรผสมพันธุ์วันไหนดีที่สุด',
      'ช่วงที่เหมาะสมคือช่วงไข่ตก (ovulation) โดยทั่วไปหลังเริ่มเป็นสัดประมาณ 9-14 วัน แต่ที่แม่นยำที่สุดคือการตรวจโปรเจสเตอโรนและเซลล์ช่องคลอด',
      'When is the best time to breed?',
      'Best timing is around ovulation. Many females ovulate ~9-14 days after heat starts, but progesterone testing and vaginal cytology give the most accurate window.',
      array['ผสมพันธุ์','วันไข่ตก','เป็นสัด','ovulation','progesterone','breeding timing'],
      9
    ),
    (
      'approved', true, 'any', 'breeding',
      'ผสมพันธุ์แล้วต้องดูแลแม่หมาอย่างไร',
      'ควรให้อาหารคุณภาพดี น้ำสะอาด พักผ่อนเพียงพอ หลีกเลี่ยงความเครียด และตรวจสุขภาพกับสัตวแพทย์ โดยเฉพาะช่วงปลายท้อง',
      'How should I care for a pregnant dog?',
      'Provide quality nutrition, clean water, rest, low stress, and regular vet checks, especially in late pregnancy.',
      array['ดูแลแม่หมา','ตั้งท้อง','pregnant care','nutrition','care'],
      8
    ),
    (
      'approved', true, 'any', 'breeding',
      'คำนวณวันคลอดจากวันผสมอย่างไร',
      'โดยทั่วไปสุนัขตั้งท้อง ~63 วัน (58-68 วัน) จากวันผสมหรือไข่ตก หากต้องการวันคลอดที่แม่นยำ ให้ตรวจยืนยันกับสัตวแพทย์',
      'How to estimate due date after mating?',
      'Dogs are pregnant ~63 days (58-68) from mating or ovulation. For precise due dates, confirm with your vet.',
      array['กำหนดคลอด','due date','gestation','คำนวณวันคลอด'],
      9
    ),
    (
      'approved', true, 'any', 'health',
      'วัคซีนหลักที่สุนัขควรมีมีอะไรบ้าง',
      'โดยทั่วไปมีวัคซีนรวม (DHPP/DHLPP) และพิษสุนัขบ้า พร้อมบันทึกในสมุดวัคซีน ควรปรึกษาสัตวแพทย์ตามพื้นที่',
      'What core vaccines should dogs get?',
      'Common core vaccines include DHPP/DHLPP and Rabies. Keep records and follow your vet’s local schedule.',
      array['วัคซีน','vaccination','rabies','DHPP','สุขภาพ'],
      8
    ),
    (
      'approved', true, 'any', 'health',
      'ก่อนผสมพันธุ์ควรตรวจสุขภาพอะไรบ้าง',
      'ควรตรวจสุขภาพทั่วไป ตรวจโรคติดต่อ ตรวจพันธุกรรมเฉพาะสายพันธุ์ และตรวจสภาพการสืบพันธุ์ เพื่อความปลอดภัยของแม่และลูก',
      'What health checks are recommended before breeding?',
      'General health exam, infectious disease screening, breed-specific genetic tests, and reproductive evaluation are recommended.',
      array['ตรวจสุขภาพก่อนผสม','health check','genetic test','ตรวจพันธุกรรม'],
      8
    ),
    (
      'approved', true, 'any', 'health',
      'ควรถ่ายพยาธิสุนัขบ่อยแค่ไหน',
      'โดยทั่วไปถ่ายพยาธิทุก 3 เดือน แต่ช่วงตั้งท้อง/ให้นมควรปรึกษาสัตวแพทย์เพื่อความปลอดภัย',
      'How often should dogs be dewormed?',
      'Common guidance is every 3 months, but during pregnancy/lactation consult a vet for safe timing.',
      array['ถ่ายพยาธิ','deworm','สุขภาพ','pregnancy'],
      7
    ),
    (
      'approved', true, 'global', 'marketplace',
      'ขายสัตว์เลี้ยงใน Marketplace ต้องเตรียมอะไรบ้าง',
      'เตรียมรูปภาพชัดเจน ข้อมูลสายพันธุ์ อายุ เพศ เอกสารสุขภาพ และราคา พร้อมระบุสถานะพร้อมส่งมอบ',
      'What do I need to list a pet in the Marketplace?',
      'Prepare clear photos, breed/age/sex info, health documents, and price, plus availability status.',
      array['ลงขาย','ประกาศขาย','marketplace','listing','price'],
      8
    ),
    (
      'approved', true, 'global', 'marketplace',
      'ควรถามอะไรกับผู้ขายก่อนจองลูกสุนัข',
      'ควรถามเรื่องวัคซีน/ถ่ายพยาธิ สุขภาพพ่อแม่ สภาพแวดล้อมการเลี้ยง เอกสาร และเงื่อนไขการจอง/มัดจำ',
      'What should I ask before reserving a puppy?',
      'Ask about vaccines/deworming, parent health, living conditions, documents, and reservation/deposit terms.',
      array['จองลูกสุนัข','deposit','reserve','ถามผู้ขาย'],
      7
    ),
    (
      'approved', true, 'global', 'marketplace',
      'ราคาสัตว์เลี้ยงในตลาดดูได้จากไหน',
      'ดูราคาเฉลี่ยใน Marketplace ตามสายพันธุ์และพื้นที่ แล้วเปรียบเทียบกับเอกสารสุขภาพและคุณภาพสายเลือด',
      'How can I estimate market price?',
      'Check Marketplace averages by breed and location, then adjust based on health documents and pedigree quality.',
      array['ราคาเฉลี่ย','market price','ราคาตลาด','marketplace'],
      7
    ),
    (
      'approved', true, 'any', 'health',
      'โภชนาการลูกสุนัขควรให้อาหารแบบไหน',
      'ควรให้อาหารลูกสุนัขสูตรสำหรับวัยเจริญเติบโตที่มีโปรตีนและพลังงานเหมาะสม แบ่งมื้อเล็กวันละหลายครั้ง พร้อมน้ำสะอาดตลอดเวลา หากเปลี่ยนอาหารควรค่อยๆ ปรับ',
      'What nutrition is best for puppies?',
      'Feed a growth formula with appropriate protein and calories, split into small meals several times a day, and provide clean water. Transition foods gradually.',
      array['โภชนาการลูกสุนัข','อาหารลูกสุนัข','puppy nutrition','puppy food'],
      8
    ),
    (
      'approved', true, 'any', 'breeding',
      'การผสมเทียมสุนัขทำอย่างไร',
      'การผสมเทียมควรทำโดยสัตวแพทย์หรือผู้เชี่ยวชาญ โดยอ้างอิงช่วงไข่ตก (ตรวจโปรเจสเตอโรน) เพื่อเพิ่มโอกาสสำเร็จและลดความเสี่ยง',
      'How does artificial insemination work in dogs?',
      'Artificial insemination should be done by a vet or specialist, timed to ovulation (often via progesterone testing) to maximize success and reduce risk.',
      array['การผสมเทียม','ผสมเทียม','artificial insemination','AI breeding'],
      8
    ),
    (
      'approved', true, 'any', 'health',
      'ปรึกษาสัตวแพทย์ AI ทำอะไรได้บ้าง',
      'ช่วยเก็บข้อมูลสุขภาพสัตว์แต่ละตัวอย่างละเอียด เช่น อายุ น้ำหนัก อาหาร การออกกำลัง วัคซีน โรคประจำตัว และประวัติในครอบครัว จากนั้นวิเคราะห์ความเสี่ยงและแนะนำการป้องกันเบื้องต้น แต่ไม่แทนที่การวินิจฉัยของสัตวแพทย์',
      'What can a Vet AI consultation do?',
      'It helps collect detailed pet health data (age, weight, diet, activity, vaccines, conditions, family history) to assess risks and suggest prevention steps. It does not replace a vet diagnosis.',
      array['ปรึกษาสัตวแพทย์ ai','vet ai','health profile','ประวัติสุขภาพ','ป้องกันโรค'],
      8
    ),
    (
      'approved', true, 'any', 'health',
      'กระเพาะบิด (GDV) ป้องกันอย่างไร',
      'ภาวะกระเพาะบิดเป็นเหตุฉุกเฉินที่เสี่ยงเสียชีวิตสูง ข้อมูลนี้เป็นแนวทางทั่วไป ไม่แทนการวินิจฉัยของสัตวแพทย์\n\nอาการที่พบบ่อย: ท้องอืดแข็ง เจ็บ/กระสับกระส่าย น้ำลายไหลมาก พยายามอาเจียนแต่ไม่ออก หายใจเร็ว เหงือกซีด อ่อนแรง\n\nสาเหตุ/ปัจจัยเสี่ยง: กินมื้อใหญ่เร็ว กินแล้วออกกำลังกายหนักทันที สายพันธุ์อกลึก อายุเพิ่มขึ้น ประวัติครอบครัวเคยเป็น\n\nการป้องกัน: แบ่งอาหารเป็นมื้อเล็กหลายมื้อ ใช้ชามกินช้า เลี่ยงวิ่งหนัก 1-2 ชม.หลังอาหาร และเฝ้าระวังหลังมื้ออาหาร\n\nการรักษา: ต้องรีบพาไปโรงพยาบาลสัตว์ที่มีอุปกรณ์ครบและพร้อมผ่าตัดทันที การรักษามักรวมให้น้ำเกลือ ปลดลมในกระเพาะ และผ่าตัดแก้การบิดพร้อมยึดกระเพาะ (gastropexy)',
      'How to prevent gastric torsion (GDV/bloat)?',
      'Gastric torsion (GDV) is a life-threatening emergency. This is general information and does not replace a vet diagnosis.\n\nCommon signs: Distended hard abdomen, pain/restlessness, excessive drooling, repeated retching with no vomit, rapid breathing, pale gums, weakness.\n\nCauses/risk factors: Large rapid meals, intense exercise right after eating, deep-chested breeds, older age, family history.\n\nPrevention: Smaller frequent meals, slow feeders, avoid heavy activity for 1-2 hours after meals, and monitor closely.\n\nTreatment: Immediate emergency vet care at a clinic equipped for surgery. Treatment often includes IV fluids, stomach decompression, and surgical correction with gastropexy.',
      array['gdv','bloat','gastric torsion','กระเพาะบิด','บิดกระเพาะ','ท้องอืด','ปวดท้อง','ร้องโหยหวน','กระสับกระส่าย','วิ่งไปมา','พยายามอาเจียน','อาเจียนไม่ออก','น้ำลายไหล','ท้องบวม','หายใจเร็ว','เหงือกซีด','อ่อนแรง','ทรุด','retching','dry heave','drooling','restless','pain','swollen abdomen','pale gums','collapse'],
      9
    ),
    (
      'approved', true, 'any', 'health',
      'อาการแบบไหนที่ควรสงสัยกระเพาะบิด (GDV)',
      'อาการสำคัญ: ท้องบวมแข็ง, กระสับกระส่ายหรือเจ็บปวด, น้ำลายไหลมาก, พยายามอาเจียนแต่ไม่ออก, หายใจเร็ว, เหงือกซีด, อ่อนแรงหรือทรุด\n\nหากสงสัยกระเพาะบิด ให้รีบนำส่งโรงพยาบาลสัตว์ฉุกเฉินที่มีเครื่องมือครบและผ่าตัดได้ทันที เพราะมีโอกาสเสียชีวิตสูงมาก',
      'What symptoms suggest GDV (bloat)?',
      'Key warning signs include a distended hard abdomen, pain/restlessness, excessive drooling, repeated retching with no vomit, rapid breathing, pale gums, weakness, or collapse.\n\nIf you suspect GDV, go immediately to an emergency veterinary hospital with surgical capability. Delayed treatment is often fatal.',
      array['gdv','bloat','gastric torsion','symptoms','signs','distended abdomen','swollen abdomen','retching','dry heave','drooling','restless','pain','pale gums','collapse','ปวดท้อง','ร้องโหยหวน','กระสับกระส่าย','วิ่งไปมา','พยายามอาเจียน','อาเจียนไม่ออก','น้ำลายไหล','ท้องบวม','หายใจเร็ว','เหงือกซีด','อ่อนแรง','ทรุด'],
      10
    ),
    (
      'approved', true, 'any', 'health',
      'ถ้าบรรพบุรุษมีประวัติโรค ควรระวังอย่างไร',
      'ควรบันทึกประวัติสุขภาพของพ่อแม่/ปู่ย่าตายาย และแจ้งสัตวแพทย์เพื่อวางแผนตรวจคัดกรองโรคทางพันธุกรรม ปรับการดูแลและโภชนาการให้เหมาะสม',
      'How should I handle disease history in ancestors?',
      'Record family health history and share it with your vet. Use it to plan genetic screening and adjust care and nutrition accordingly.',
      array['ประวัติโรค','พันธุกรรม','family history','บรรพบุรุษ','เสี่ยงโรค'],
      7
    )
  ) as t(
    status, is_active, scope, category,
    question_th, answer_th, question_en, answer_en,
    keywords, priority
  )
)
insert into public.ai_faq_entries (
  status, is_active, scope, category,
  question_th, answer_th, question_en, answer_en,
  keywords, priority, source
)
select
  e.status, e.is_active, e.scope, e.category,
  e.question_th, e.answer_th, e.question_en, e.answer_en,
  e.keywords, e.priority, 'seed'
from entries e
where not exists (
  select 1 from public.ai_faq_entries f
  where coalesce(f.question_th, '') = coalesce(e.question_th, '')
    and coalesce(f.question_en, '') = coalesce(e.question_en, '')
);
