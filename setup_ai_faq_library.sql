create extension if not exists "pgcrypto";

create table if not exists public.ai_faq_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'approved' check (status in ('draft', 'approved', 'archived')),
  is_active boolean not null default true,
  scope text not null default 'any' check (scope in ('any', 'global', 'pet')),
  category text,
  question_th text,
  question_en text,
  answer_th text,
  answer_en text,
  keywords text[],
  exclude text[],
  priority integer not null default 0,
  source text,
  source_query_id uuid references public.ai_query_pool(id) on delete set null,
  source_query text,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz
);

create index if not exists ai_faq_entries_status_idx on public.ai_faq_entries (status, is_active);
create index if not exists ai_faq_entries_scope_idx on public.ai_faq_entries (scope);
create index if not exists ai_faq_entries_keywords_idx on public.ai_faq_entries using gin (keywords);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_ai_faq_entries_updated_at'
  ) then
    create trigger set_ai_faq_entries_updated_at
    before update on public.ai_faq_entries
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.ai_faq_entries enable row level security;

drop policy if exists "faq_read_approved" on public.ai_faq_entries;
drop policy if exists "faq_admin_read" on public.ai_faq_entries;
drop policy if exists "faq_insert_draft" on public.ai_faq_entries;
drop policy if exists "faq_admin_manage" on public.ai_faq_entries;

create policy "faq_read_approved"
on public.ai_faq_entries
for select
using (status = 'approved' and is_active = true);

create policy "faq_admin_read"
on public.ai_faq_entries
for select
using (
  exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
    and pr.role = 'admin'
  )
);

create policy "faq_insert_draft"
on public.ai_faq_entries
for insert
with check (
  auth.role() = 'authenticated'
  and coalesce(status, 'draft') = 'draft'
);

create policy "faq_admin_manage"
on public.ai_faq_entries
for all
using (
  exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
    and pr.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
    and pr.role = 'admin'
  )
);

grant select on public.ai_faq_entries to anon;
grant select, insert, update, delete on public.ai_faq_entries to authenticated;

insert into public.ai_faq_entries (
  status, is_active, scope, category, question_th, answer_th, question_en, answer_en, keywords, priority, source
) values
('approved', true, 'any', 'breeding',
 $$หมาตั้งท้องกี่วัน$$,
 $$โดยทั่วไปสุนัขตั้งท้องประมาณ 63 วัน (ราว 58-68 วัน) นับจากวันผสมหรือวันตกไข่ หากต้องการคำนวณวันคลอดที่แม่นยำ ควรยืนยันกับสัตวแพทย์$$,
 $$How long is a dog pregnant?$$,
 $$Dog gestation averages about 63 days (roughly 58-68 days) from ovulation or mating. For precise timing, confirm with your vet.$$,
 array['dog pregnancy','dog gestation','pregnant dog','gestation length','หมาตั้งท้อง','ท้องกี่วัน','ระยะตั้งท้อง'],
 10,
 'seed'
),
('approved', true, 'any', 'breeding',
 $$แมวตั้งท้องกี่วัน$$,
 $$โดยทั่วไปแมวตั้งท้องประมาณ 63-65 วัน (ประมาณ 9 สัปดาห์) หากต้องการคาดการณ์วันคลอด ควรปรึกษาสัตวแพทย์$$,
 $$How long is a cat pregnant?$$,
 $$Cat pregnancy averages about 63-65 days (around 9 weeks). For accurate timing, confirm with your vet.$$,
 array['cat pregnancy','cat gestation','pregnant cat','แมวตั้งท้อง','ท้องกี่วัน','ระยะตั้งท้องแมว'],
 10,
 'seed'
),
('approved', true, 'any', 'breeding',
 $$ตรวจวันตกไข่หมาต้องทำยังไง$$,
 $$วิธีที่แม่นยำที่สุดคือการตรวจฮอร์โมนโปรเจสเตอโรนจากเลือด ร่วมกับการตรวจเซลล์ช่องคลอด หากบอกวันที่เป็นสัดครั้งล่าสุดได้ จะช่วยประเมินช่วงผสมได้ดีขึ้น$$,
 $$How to detect ovulation in dogs?$$,
 $$The most accurate method is a progesterone blood test, often paired with vaginal cytology. Share the last heat date for a better estimate.$$,
 array['ovulation','progesterone','heat cycle','estrus','วันตกไข่','เป็นสัด','ตรวจฮอร์โมน'],
 8,
 'seed'
),
('approved', true, 'global', 'marketplace',
 $$ตอนนี้มีลูกหมาขายไหม$$,
 $$สามารถดูได้ที่ Marketplace และกรองตามสายพันธุ์/พื้นที่ ถ้าบอกสายพันธุ์ที่ต้องการได้ ฉันช่วยค้นหาให้ได้เลย$$,
 $$Do you have puppies for sale?$$,
 $$Check the Marketplace and filter by breed or location. Tell me the breed you want and I can help you search.$$,
 array['puppy for sale','puppies','ลูกหมา','ขายลูกหมา','หาลูกหมา','want a puppy'],
 9,
 'seed'
),
('approved', true, 'global', 'marketplace',
 $$จองคิวลูกหมาต้องทำอย่างไร$$,
 $$ไปที่หน้า Puppy Coming Soon หรือโปรไฟล์ผู้เพาะพันธุ์ แล้วกดจองคิว ระบบจะบันทึกลำดับคิวให้ และส่งแจ้งเตือนเจ้าของคอก$$,
 $$How do I reserve a puppy queue?$$,
 $$Go to Puppy Coming Soon or the breeder profile and reserve a queue slot. The system records your queue order and notifies the breeder.$$,
 array['reserve puppy','queue','waitlist','จองคิว','คิวลูกหมา','wait list'],
 9,
 'seed'
),
('approved', true, 'any', 'registration',
 $$จดทะเบียนสัตว์เลี้ยงของฉันต้องทำยังไง$$,
 $$ในระบบ Petdegree คุณสามารถสมัครสมาชิก/เข้าสู่ระบบ แล้วไปที่หน้า "ลงทะเบียนสัตว์เลี้ยง" เพื่อกรอกข้อมูลและอัปโหลดเอกสาร หากต้องการ ฉันเปิดหน้าลงทะเบียนให้ได้$$,
 $$How do I register my pet?$$,
 $$Sign up or log in, then open the "Register Pet" page to fill details and upload documents. I can open the registration form for you.$$,
 array['register pet','registration','ลงทะเบียนสัตว์เลี้ยง','จดทะเบียน','สมัครสมาชิก'],
 8,
 'seed'
),
('approved', true, 'any', 'documents',
 $$ใบเพ็ดคืออะไร$$,
 $$ใบเพ็ด (Pedigree) คือเอกสารสายเลือดที่ออกโดยสมาคม/องค์กรที่รับรองสายพันธุ์ ระบุชื่อพ่อแม่และบรรพบุรุษ พร้อมเลขทะเบียน$$,
 $$What is a pedigree certificate?$$,
 $$A pedigree certificate documents lineage and is issued by a recognized club. It lists parents, ancestors, and registration numbers.$$,
 array['pedigree','certificate','ใบเพ็ด','ใบเพ็ดดีกรี','เอกสารสายเลือด'],
 8,
 'seed'
),
('approved', true, 'any', 'health',
 $$ต้องมีวัคซีนหรือใบตรวจสุขภาพอะไรบ้าง$$,
 $$โดยทั่วไปควรมีประวัติวัคซีนหลัก (เช่น DHPP/Rabies สำหรับสุนัข) และใบตรวจสุขภาพ หากอัปโหลดเอกสารในระบบ ผู้สนใจจะเห็นข้อมูลได้ชัดเจน$$,
 $$What vaccines or health documents are required?$$,
 $$Commonly you should have core vaccination records (e.g., DHPP/Rabies for dogs) and a health check. Uploading these helps buyers trust the listing.$$,
 array['vaccine','health certificate','vaccination','ใบวัคซีน','ใบตรวจสุขภาพ','ฉีดวัคซีน'],
 7,
 'seed'
),
('approved', true, 'global', 'marketplace',
 $$อยากลงขายสัตว์เลี้ยงในระบบทำอย่างไร$$,
 $$ไปที่โปรไฟล์สัตว์เลี้ยงของคุณ แล้วเปิดสถานะขาย (For Sale) ใส่ราคา รูป และเอกสารสุขภาพ ระบบจะแสดงใน Marketplace$$,
 $$How do I list a pet for sale?$$,
 $$Open your pet profile, toggle "For Sale", add price, photos, and health documents. The listing will appear in the Marketplace.$$,
 array['sell pet','for sale','ลงขาย','ประกาศขาย','marketplace listing'],
 7,
 'seed'
),
('approved', true, 'any', 'pricing',
 $$ราคาสุนัขควรตั้งเท่าไหร่$$,
 $$ราคาขึ้นอยู่กับสายพันธุ์ สายเลือด เอกสารสุขภาพ และชื่อเสียงผู้เพาะพันธุ์ คุณสามารถดูราคาเฉลี่ยใน Marketplace เพื่อเปรียบเทียบได้$$,
 $$How should I price my pet?$$,
 $$Pricing depends on breed, pedigree, health documents, and breeder reputation. Check Marketplace averages to benchmark your listing.$$,
 array['price','pricing','market price','ตั้งราคา','ราคาเฉลี่ย','ประเมินราคา'],
 6,
 'seed'
);
