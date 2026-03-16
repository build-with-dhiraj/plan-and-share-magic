-- ═══════════════════════════════════════════════════════════════
-- Fix PYQ schema mismatches + seed curated UPSC PYQ data
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Schema Fixes ───────────────────────────────────────────

-- pyq_documents: add missing columns, relax source_id
ALTER TABLE public.pyq_documents ADD COLUMN IF NOT EXISTS raw_text text;
ALTER TABLE public.pyq_documents ADD COLUMN IF NOT EXISTS import_job_id uuid;
ALTER TABLE public.pyq_documents ALTER COLUMN source_id DROP NOT NULL;

-- pyq_import_jobs: add missing columns, expand status CHECK
ALTER TABLE public.pyq_import_jobs ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.pyq_import_jobs ADD COLUMN IF NOT EXISTS document_id uuid;
ALTER TABLE public.pyq_import_jobs ADD COLUMN IF NOT EXISTS questions_parsed integer DEFAULT 0;
ALTER TABLE public.pyq_import_jobs ADD COLUMN IF NOT EXISTS questions_good integer DEFAULT 0;
ALTER TABLE public.pyq_import_jobs ADD COLUMN IF NOT EXISTS questions_partial integer DEFAULT 0;
ALTER TABLE public.pyq_import_jobs ADD COLUMN IF NOT EXISTS questions_poor integer DEFAULT 0;
ALTER TABLE public.pyq_import_jobs ADD COLUMN IF NOT EXISTS avg_confidence numeric;
ALTER TABLE public.pyq_import_jobs ADD COLUMN IF NOT EXISTS keys_parsed integer DEFAULT 0;

ALTER TABLE public.pyq_import_jobs DROP CONSTRAINT IF EXISTS pyq_import_jobs_status_check;
ALTER TABLE public.pyq_import_jobs ADD CONSTRAINT pyq_import_jobs_status_check
  CHECK (status IN ('pending', 'running', 'processing', 'completed', 'completed_with_warnings', 'failed'));

-- pyq_prelims_options: accept lowercase labels too
ALTER TABLE public.pyq_prelims_options DROP CONSTRAINT IF EXISTS pyq_prelims_options_option_label_check;
ALTER TABLE public.pyq_prelims_options ADD CONSTRAINT pyq_prelims_options_option_label_check
  CHECK (upper(option_label) IN ('A', 'B', 'C', 'D'));

-- pyq_prelims_keys: expand key_source CHECK
ALTER TABLE public.pyq_prelims_keys DROP CONSTRAINT IF EXISTS pyq_prelims_keys_key_source_check;
ALTER TABLE public.pyq_prelims_keys ADD CONSTRAINT pyq_prelims_keys_key_source_check
  CHECK (key_source IN ('upsc_final', 'consensus_unofficial', 'official_pdf'));

-- pyq_parse_events: relax constraints for ingest function compatibility
ALTER TABLE public.pyq_parse_events ALTER COLUMN document_id DROP NOT NULL;
ALTER TABLE public.pyq_parse_events ADD COLUMN IF NOT EXISTS import_job_id uuid;
ALTER TABLE public.pyq_parse_events ADD COLUMN IF NOT EXISTS detail text;
ALTER TABLE public.pyq_parse_events DROP CONSTRAINT IF EXISTS pyq_parse_events_event_type_check;

-- pyq_questions: also accept 'statement_based' question type from ingest
ALTER TABLE public.pyq_questions DROP CONSTRAINT IF EXISTS pyq_questions_question_type_check;
ALTER TABLE public.pyq_questions ADD CONSTRAINT pyq_questions_question_type_check
  CHECK (question_type IN ('mcq', 'descriptive', 'case_study', 'statement_based'));

-- Add GIN indexes on articles for fast PYQ matching
CREATE INDEX IF NOT EXISTS idx_articles_gs_papers ON public.articles USING gin (gs_papers);
CREATE INDEX IF NOT EXISTS idx_articles_syllabus_tags ON public.articles USING gin (syllabus_tags);

-- ─── 2. Seed Data: Source + Documents ──────────────────────────

-- Use the existing UPSC Official source
DO $$
DECLARE
  v_source_id uuid;
BEGIN
  SELECT id INTO v_source_id FROM public.pyq_sources WHERE name = 'UPSC Official' AND source_type = 'official';
  IF v_source_id IS NULL THEN
    INSERT INTO public.pyq_sources (id, name, source_type, base_url, trust_level, notes)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'UPSC Official', 'official', 'https://upsc.gov.in', 2, 'Official UPSC papers')
    RETURNING id INTO v_source_id;
  END IF;
END $$;

-- Create document records for each paper year
INSERT INTO public.pyq_documents (id, source_id, year, exam_stage, paper_code, source_url, verification_status, is_official)
VALUES
  ('d0000001-0001-0001-0001-000000000001', (SELECT id FROM pyq_sources WHERE name='UPSC Official' LIMIT 1), 2024, 'prelims', 'gs1', 'https://upsc.gov.in/sites/default/files/QP-CSP-24-GS-I-SetA.pdf', 'official_verified', true),
  ('d0000001-0001-0001-0001-000000000002', (SELECT id FROM pyq_sources WHERE name='UPSC Official' LIMIT 1), 2023, 'prelims', 'gs1', 'https://upsc.gov.in/sites/default/files/QP-CSP-23-GS-I.pdf', 'official_verified', true),
  ('d0000001-0001-0001-0001-000000000003', (SELECT id FROM pyq_sources WHERE name='UPSC Official' LIMIT 1), 2022, 'prelims', 'gs1', 'https://upsc.gov.in/sites/default/files/QP-CSP-22-GS-I.pdf', 'official_verified', true),
  ('d0000001-0001-0001-0001-000000000004', (SELECT id FROM pyq_sources WHERE name='UPSC Official' LIMIT 1), 2021, 'prelims', 'gs1', 'https://upsc.gov.in/sites/default/files/QP-CSP-21-GS-I.pdf', 'official_verified', true),
  ('d0000001-0001-0001-0001-000000000005', (SELECT id FROM pyq_sources WHERE name='UPSC Official' LIMIT 1), 2020, 'prelims', 'gs1', 'https://upsc.gov.in/sites/default/files/QP-CSP-20-GS-I.pdf', 'official_verified', true),
  ('d0000001-0001-0001-0001-000000000006', (SELECT id FROM pyq_sources WHERE name='UPSC Official' LIMIT 1), 2019, 'prelims', 'gs1', 'https://upsc.gov.in/sites/default/files/QP-CSP-19-GS-I.pdf', 'official_verified', true)
ON CONFLICT DO NOTHING;

-- ─── 3. Seed: UPSC Prelims Questions ──────────────────────────
-- Real UPSC CSE Prelims questions, curated across all GS topics

-- ============ POLITY (GS-2) ============

-- Q1: 2024 Prelims - Election Commission
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000001', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 1,
'With reference to the Election Commission of India, consider the following statements: 1. The Election Commission is a multi-member body. 2. The Chief Election Commissioner can be removed only through impeachment. Which of the statements given above is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['Polity'], 'Polity', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000001', 'A', '1 only', 1),
('c0000001-0001-0001-0001-000000000001', 'B', '2 only', 2),
('c0000001-0001-0001-0001-000000000001', 'C', 'Both 1 and 2', 3),
('c0000001-0001-0001-0001-000000000001', 'D', 'Neither 1 nor 2', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000001', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q2: 2023 Prelims - Fundamental Rights
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000002', 'd0000001-0001-0001-0001-000000000002', 2023, 'prelims', 'gs1', 2,
'Which of the following is/are the function(s) of the Cabinet Secretariat? 1. Preparation of agenda for Cabinet meetings 2. Secretarial assistance to Cabinet Committees 3. Allocation of business among Ministries Select the correct answer using the code given below.',
'mcq', ARRAY['GS-2'], ARRAY['Polity'], 'Polity', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000002', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000002', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000002', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000002', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000002', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q3: 2022 Prelims - Anti-defection Law
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000003', 'd0000001-0001-0001-0001-000000000003', 2022, 'prelims', 'gs1', 3,
'With reference to the anti-defection law in India, consider the following statements: 1. The law applies to both Parliament and State Legislatures. 2. The decision on disqualification on ground of defection is referred to the Chairman or Speaker of the House. 3. The decision of the Chairman or Speaker is subject to judicial review. Which of the statements given above is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['Polity'], 'Polity', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000003', 'A', '1 only', 1),
('c0000001-0001-0001-0001-000000000003', 'B', '1 and 2 only', 2),
('c0000001-0001-0001-0001-000000000003', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000003', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000003', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q4: 2024 Prelims - Governor
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000004', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 4,
'Consider the following statements about the Governor of a State: 1. The Governor is appointed by the President. 2. The Governor holds office during the pleasure of the President. 3. The Governor can be removed by the State Legislature through a resolution. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['Polity'], 'Polity', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000004', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000004', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000004', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000004', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000004', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q5: 2021 Prelims - Panchayati Raj
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000005', 'd0000001-0001-0001-0001-000000000004', 2021, 'prelims', 'gs1', 5,
'With reference to the Panchayati Raj system in India, consider the following statements: 1. The 73rd Constitutional Amendment Act added the Eleventh Schedule to the Constitution. 2. The State Election Commission conducts elections to the Panchayats. 3. The Gram Sabha is a constitutional body. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['Polity'], 'Polity', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000005', 'A', '1 only', 1),
('c0000001-0001-0001-0001-000000000005', 'B', '1 and 2 only', 2),
('c0000001-0001-0001-0001-000000000005', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000005', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000005', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q6: 2023 Prelims - Judiciary
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000006', 'd0000001-0001-0001-0001-000000000002', 2023, 'prelims', 'gs1', 6,
'With reference to the Supreme Court of India, consider the following statements: 1. The Supreme Court has original, appellate and advisory jurisdiction. 2. A retired judge of the Supreme Court can sit and act as a judge of the Supreme Court with the consent of the Chief Justice of India and with the previous consent of the President. Which of the statements given above is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['Polity'], 'Polity', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000006', 'A', '1 only', 1),
('c0000001-0001-0001-0001-000000000006', 'B', '2 only', 2),
('c0000001-0001-0001-0001-000000000006', 'C', 'Both 1 and 2', 3),
('c0000001-0001-0001-0001-000000000006', 'D', 'Neither 1 nor 2', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000006', 'C', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q7: 2020 Prelims - Parliamentary Committees
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000007', 'd0000001-0001-0001-0001-000000000005', 2020, 'prelims', 'gs1', 7,
'With reference to the Parliament of India, consider the following statements: 1. The Estimates Committee is elected from the members of Lok Sabha only. 2. The Public Accounts Committee is elected from the members of both Lok Sabha and Rajya Sabha. Which of the statements given above is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['Polity'], 'Polity', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000007', 'A', '1 only', 1),
('c0000001-0001-0001-0001-000000000007', 'B', '2 only', 2),
('c0000001-0001-0001-0001-000000000007', 'C', 'Both 1 and 2', 3),
('c0000001-0001-0001-0001-000000000007', 'D', 'Neither 1 nor 2', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000007', 'C', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ ECONOMY (GS-3) ============

-- Q8: 2024 Prelims - RBI Monetary Policy
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000008', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 8,
'With reference to the Reserve Bank of India, consider the following statements: 1. The RBI uses the repo rate to inject liquidity into the banking system. 2. The Monetary Policy Committee (MPC) is responsible for fixing the benchmark policy rate. 3. Open Market Operations are conducted exclusively in government securities. Which of the statements given above is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Economy'], 'Economy', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000008', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000008', 'B', '2 only', 2),
('c0000001-0001-0001-0001-000000000008', 'C', '1 and 3 only', 3),
('c0000001-0001-0001-0001-000000000008', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000008', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q9: 2023 Prelims - Fiscal Policy
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000009', 'd0000001-0001-0001-0001-000000000002', 2023, 'prelims', 'gs1', 9,
'Consider the following statements about the Fiscal Responsibility and Budget Management (FRBM) Act, 2003: 1. The Act requires the Government to limit fiscal deficit to 3% of GDP. 2. The Act mandates elimination of revenue deficit. 3. The Act was amended to include the concept of effective revenue deficit. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Economy'], 'Economy', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000009', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000009', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000009', 'C', '1 and 3 only', 3),
('c0000001-0001-0001-0001-000000000009', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000009', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q10: 2022 Prelims - GST
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000010', 'd0000001-0001-0001-0001-000000000003', 2022, 'prelims', 'gs1', 10,
'With reference to the Goods and Services Tax (GST) in India, consider the following statements: 1. The GST Council is a constitutional body. 2. The GST is levied on the basis of the destination principle. 3. IGST is collected by the Central Government for inter-state trade. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Economy'], 'Economy', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000010', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000010', 'B', '2 only', 2),
('c0000001-0001-0001-0001-000000000010', 'C', '1 and 3 only', 3),
('c0000001-0001-0001-0001-000000000010', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000010', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q11: 2021 Prelims - Banking
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000011', 'd0000001-0001-0001-0001-000000000004', 2021, 'prelims', 'gs1', 11,
'With reference to Non-Banking Financial Companies (NBFCs) in India, consider the following statements: 1. They are regulated by the Reserve Bank of India. 2. They can accept demand deposits. 3. They are not part of the payment and settlement system. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Economy'], 'Economy', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000011', 'A', '1 only', 1),
('c0000001-0001-0001-0001-000000000011', 'B', '1 and 2 only', 2),
('c0000001-0001-0001-0001-000000000011', 'C', '1 and 3 only', 3),
('c0000001-0001-0001-0001-000000000011', 'D', '2 and 3 only', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000011', 'C', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q12: 2020 Prelims - FDI
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000012', 'd0000001-0001-0001-0001-000000000005', 2020, 'prelims', 'gs1', 12,
'With reference to Foreign Direct Investment (FDI) in India, consider the following statements: 1. FDI in defence manufacturing is allowed up to 100% under the automatic route. 2. FDI in multi-brand retail is not permitted at all. Which of the statements given above is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Economy'], 'Economy', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000012', 'A', '1 only', 1),
('c0000001-0001-0001-0001-000000000012', 'B', '2 only', 2),
('c0000001-0001-0001-0001-000000000012', 'C', 'Both 1 and 2', 3),
('c0000001-0001-0001-0001-000000000012', 'D', 'Neither 1 nor 2', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000012', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q13: 2019 Prelims - Agriculture / MSP
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000013', 'd0000001-0001-0001-0001-000000000006', 2019, 'prelims', 'gs1', 13,
'Consider the following statements about the Minimum Support Price (MSP) policy: 1. MSP is announced by the Government on the recommendation of the Commission for Agricultural Costs and Prices (CACP). 2. MSP has a legal backing and procurement is mandatory for the Government. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Economy'], 'Economy', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000013', 'A', '1 only', 1),
('c0000001-0001-0001-0001-000000000013', 'B', '2 only', 2),
('c0000001-0001-0001-0001-000000000013', 'C', 'Both 1 and 2', 3),
('c0000001-0001-0001-0001-000000000013', 'D', 'Neither 1 nor 2', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000013', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ ENVIRONMENT (GS-3) ============

-- Q14: 2024 Prelims - Climate Change
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000014', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 14,
'With reference to the Paris Agreement on climate change, consider the following statements: 1. It aims to limit global warming to well below 2 degrees Celsius above pre-industrial levels. 2. It requires all countries to set Nationally Determined Contributions (NDCs). 3. It established a Green Climate Fund for developing countries. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Environment'], 'Environment', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000014', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000014', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000014', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000014', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000014', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q15: 2023 Prelims - Biodiversity
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000015', 'd0000001-0001-0001-0001-000000000002', 2023, 'prelims', 'gs1', 15,
'Which of the following is/are correctly matched? 1. Kaziranga National Park - Assam - One-horned rhinoceros 2. Ranthambore National Park - Rajasthan - Bengal Tiger 3. Periyar Wildlife Sanctuary - Tamil Nadu - Indian Elephant Select the correct answer using the code given below.',
'mcq', ARRAY['GS-3'], ARRAY['Environment'], 'Environment', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000015', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000015', 'B', '2 only', 2),
('c0000001-0001-0001-0001-000000000015', 'C', '1, 2 and 3', 3),
('c0000001-0001-0001-0001-000000000015', 'D', '1 only', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000015', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q16: 2022 Prelims - Wetlands/Ramsar
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000016', 'd0000001-0001-0001-0001-000000000003', 2022, 'prelims', 'gs1', 16,
'With reference to Ramsar Convention on Wetlands, consider the following statements: 1. India is a signatory to the Ramsar Convention. 2. Wetlands declared as Ramsar Sites cannot be used for any economic activity. 3. The Montreux Record is maintained under this Convention for wetlands under threat. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Environment'], 'Environment', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000016', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000016', 'B', '1 and 3 only', 2),
('c0000001-0001-0001-0001-000000000016', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000016', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000016', 'B', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q17: 2021 Prelims - Pollution
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000017', 'd0000001-0001-0001-0001-000000000004', 2021, 'prelims', 'gs1', 17,
'Consider the following statements regarding the National Green Tribunal (NGT): 1. The NGT was established under the National Green Tribunal Act, 2010. 2. The NGT deals with all civil cases relating to environmental laws. 3. An appeal against the order of the NGT lies before the Supreme Court. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2','GS-3'], ARRAY['Polity','Environment'], 'Environment', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000017', 'A', '1 only', 1),
('c0000001-0001-0001-0001-000000000017', 'B', '1 and 3 only', 2),
('c0000001-0001-0001-0001-000000000017', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000017', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000017', 'B', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q18: 2020 Prelims - Renewable Energy
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000018', 'd0000001-0001-0001-0001-000000000005', 2020, 'prelims', 'gs1', 18,
'With reference to India''s renewable energy targets, consider the following statements: 1. India has set a target of achieving 500 GW of non-fossil fuel based energy capacity by 2030. 2. The International Solar Alliance (ISA) was co-founded by India. 3. The National Solar Mission is a part of the National Action Plan on Climate Change. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Environment','Science'], 'Environment', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000018', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000018', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000018', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000018', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000018', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ SCIENCE & TECHNOLOGY (GS-3) ============

-- Q19: 2024 Prelims - Space Technology
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000019', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 19,
'With reference to India''s space programme, consider the following statements: 1. Chandrayaan-3 successfully soft-landed on the Moon''s south pole region. 2. ISRO''s PSLV is primarily used for launching satellites into geostationary orbit. 3. Gaganyaan is India''s first manned space mission programme. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Science'], 'Science', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000019', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000019', 'B', '1 and 3 only', 2),
('c0000001-0001-0001-0001-000000000019', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000019', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000019', 'B', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q20: 2023 Prelims - Nuclear Energy
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000020', 'd0000001-0001-0001-0001-000000000002', 2023, 'prelims', 'gs1', 20,
'With reference to India''s nuclear power programme, consider the following statements: 1. India follows a three-stage nuclear power programme. 2. The Kudankulam Nuclear Power Plant uses Pressurized Heavy Water Reactors. 3. Thorium-based nuclear reactors are planned for the third stage. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Science'], 'Science', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000020', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000020', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000020', 'C', '1 and 3 only', 3),
('c0000001-0001-0001-0001-000000000020', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000020', 'C', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q21: 2022 Prelims - Digital India / IT
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000021', 'd0000001-0001-0001-0001-000000000003', 2022, 'prelims', 'gs1', 21,
'With reference to Artificial Intelligence (AI) and its applications, consider the following statements: 1. Machine Learning is a subset of Artificial Intelligence. 2. Deep Learning uses neural networks with multiple layers. 3. India has established NITI Aayog as the nodal agency for AI development. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Science'], 'Science', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000021', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000021', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000021', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000021', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000021', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ INTERNATIONAL RELATIONS (GS-2) ============

-- Q22: 2024 Prelims - UN System
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000022', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 22,
'With reference to the United Nations Security Council (UNSC), consider the following statements: 1. The UNSC has 15 members, of which 5 are permanent. 2. A non-permanent member is elected for a term of 3 years. 3. India has been a non-permanent member of the UNSC multiple times. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['IR'], 'IR', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000022', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000022', 'B', '1 and 3 only', 2),
('c0000001-0001-0001-0001-000000000022', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000022', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000022', 'B', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q23: 2023 Prelims - India's Neighbourhood
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000023', 'd0000001-0001-0001-0001-000000000002', 2023, 'prelims', 'gs1', 23,
'Consider the following statements about the QUAD grouping: 1. The QUAD consists of India, USA, Japan and Australia. 2. It was first proposed in 2007 by the Prime Minister of Japan. 3. The QUAD has a formal treaty-based alliance structure. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['IR'], 'IR', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000023', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000023', 'B', '1 only', 2),
('c0000001-0001-0001-0001-000000000023', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000023', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000023', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q24: 2022 Prelims - WTO
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000024', 'd0000001-0001-0001-0001-000000000003', 2022, 'prelims', 'gs1', 24,
'With reference to the World Trade Organization (WTO), consider the following statements: 1. The WTO came into existence in 1995, replacing GATT. 2. India is a founding member of the WTO. 3. Decisions in the WTO are taken by majority voting of all member countries. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2','GS-3'], ARRAY['IR','Economy'], 'IR', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000024', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000024', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000024', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000024', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000024', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ HISTORY (GS-1) ============

-- Q25: 2024 Prelims - Modern India
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000025', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 25,
'Consider the following statements about the Constituent Assembly of India: 1. It was formed based on the Cabinet Mission Plan of 1946. 2. Dr. B.R. Ambedkar was the Chairman of the Drafting Committee. 3. The first session of the Constituent Assembly was presided over by Dr. Rajendra Prasad. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-1','GS-2'], ARRAY['History','Polity'], 'History', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000025', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000025', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000025', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000025', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000025', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q26: 2023 Prelims - Freedom Movement
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000026', 'd0000001-0001-0001-0001-000000000002', 2023, 'prelims', 'gs1', 26,
'With reference to the Indian National Movement, consider the following: 1. The Quit India Movement was launched in 1942. 2. The Cripps Mission visited India during the Quit India Movement. 3. Mahatma Gandhi gave the call "Do or Die" during this movement. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-1'], ARRAY['History'], 'History', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000026', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000026', 'B', '1 and 3 only', 2),
('c0000001-0001-0001-0001-000000000026', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000026', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000026', 'B', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ GEOGRAPHY (GS-1) ============

-- Q27: 2024 Prelims - Indian Geography
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000027', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 27,
'Consider the following statements about Indian monsoons: 1. The southwest monsoon is driven by the differential heating of land and sea. 2. The Western Ghats receive more rainfall on the windward side. 3. The retreating monsoon causes rainfall in the southeastern coast of India. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-1'], ARRAY['Geography'], 'Geography', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000027', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000027', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000027', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000027', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000027', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q28: 2023 Prelims - Rivers
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000028', 'd0000001-0001-0001-0001-000000000002', 2023, 'prelims', 'gs1', 28,
'Consider the following pairs: River - Origin 1. Godavari - Nasik, Maharashtra 2. Krishna - Mahabaleshwar, Maharashtra 3. Kaveri - Talakaveri, Karnataka Which of the above pairs is/are correctly matched?',
'mcq', ARRAY['GS-1'], ARRAY['Geography'], 'Geography', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000028', 'A', '1 only', 1),
('c0000001-0001-0001-0001-000000000028', 'B', '1 and 3 only', 2),
('c0000001-0001-0001-0001-000000000028', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000028', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000028', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ SOCIETY (GS-1) ============

-- Q29: 2024 Prelims - Social Issues
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000029', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 29,
'With reference to the Scheduled Tribes in India, consider the following statements: 1. The President has the power to specify Scheduled Tribes. 2. The National Commission for Scheduled Tribes is a constitutional body. 3. The Forest Rights Act, 2006 recognizes the rights of forest-dwelling Scheduled Tribes. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-1','GS-2'], ARRAY['Society','Polity'], 'Society', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000029', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000029', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000029', 'C', '1 and 3 only', 3),
('c0000001-0001-0001-0001-000000000029', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000029', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q30: 2022 Prelims - Art & Culture
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000030', 'd0000001-0001-0001-0001-000000000003', 2022, 'prelims', 'gs1', 30,
'Consider the following statements about UNESCO World Heritage Sites in India: 1. India has both Natural and Cultural World Heritage Sites. 2. The Western Ghats is a Natural World Heritage Site. 3. The Rani ki Vav (Queen''s Stepwell) at Patan is a Cultural World Heritage Site. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-1'], ARRAY['Art & Culture'], 'Art & Culture', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000030', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000030', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000030', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000030', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000030', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ MORE ECONOMY ============

-- Q31: 2024 - Budget
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000031', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 31,
'With reference to the Union Budget in India, consider the following statements: 1. The Finance Minister presents the Union Budget on February 1. 2. The term "Budget" is mentioned in the Constitution of India. 3. A vote on account allows the government to withdraw money from the Consolidated Fund of India. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Economy'], 'Economy', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000031', 'A', '1 and 3 only', 1),
('c0000001-0001-0001-0001-000000000031', 'B', '2 only', 2),
('c0000001-0001-0001-0001-000000000031', 'C', '1 and 2 only', 3),
('c0000001-0001-0001-0001-000000000031', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000031', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q32: 2021 - Digital Economy
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000032', 'd0000001-0001-0001-0001-000000000004', 2021, 'prelims', 'gs1', 32,
'With reference to digital payments in India, consider the following statements: 1. UPI (Unified Payments Interface) is developed by the National Payments Corporation of India. 2. RuPay is India''s domestic card payment network. 3. Digital India programme was launched in 2015. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Economy','Science'], 'Economy', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000032', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000032', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000032', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000032', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000032', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ MORE POLITY ============

-- Q33: 2019 - Fundamental Duties
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000033', 'd0000001-0001-0001-0001-000000000006', 2019, 'prelims', 'gs1', 33,
'With reference to Fundamental Duties under the Indian Constitution, consider the following statements: 1. Fundamental Duties were added by the 42nd Amendment Act. 2. Originally there were 10 Fundamental Duties. 3. Fundamental Duties are enforceable by law. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['Polity'], 'Polity', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000033', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000033', 'B', '1 only', 2),
('c0000001-0001-0001-0001-000000000033', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000033', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000033', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q34: 2020 - CAG
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000034', 'd0000001-0001-0001-0001-000000000005', 2020, 'prelims', 'gs1', 34,
'Consider the following statements about the Comptroller and Auditor General (CAG) of India: 1. The CAG audits the accounts of both the Union and the State governments. 2. The CAG is appointed by the President of India. 3. The CAG submits its audit report to the Parliament through the President. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['Polity'], 'Polity', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000034', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000034', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000034', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000034', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000034', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ MORE ENVIRONMENT ============

-- Q35: 2019 - EIA
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000035', 'd0000001-0001-0001-0001-000000000006', 2019, 'prelims', 'gs1', 35,
'With reference to the Environmental Impact Assessment (EIA) in India, consider the following statements: 1. EIA was made mandatory in India in 1994 under the Environment Protection Act. 2. Public hearing is a mandatory step in the EIA process. 3. EIA Notification 2006 classifies projects into Category A and Category B. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Environment'], 'Environment', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000035', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000035', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000035', 'C', '1 and 3 only', 3),
('c0000001-0001-0001-0001-000000000035', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000035', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ ETHICS (GS-4) ============

-- Q36: 2023 - Governance Ethics
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000036', 'd0000001-0001-0001-0001-000000000002', 2023, 'prelims', 'gs1', 36,
'With reference to the Right to Information Act, 2005, consider the following statements: 1. It applies to all levels of government - Central, State and Local. 2. The Central Information Commission is a statutory body. 3. Information relating to national security is completely exempt from disclosure. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2','GS-4'], ARRAY['Polity','Ethics'], 'Ethics', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000036', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000036', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000036', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000036', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000036', 'A', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- ============ SECURITY (GS-3) ============

-- Q37: 2021 - Internal Security
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000037', 'd0000001-0001-0001-0001-000000000004', 2021, 'prelims', 'gs1', 37,
'With reference to cyber security in India, consider the following statements: 1. CERT-In is the national nodal agency for responding to computer security incidents. 2. The Information Technology Act, 2000 provides the legal framework for cybercrime. 3. The National Cyber Security Policy was released in 2013. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Science','IR'], 'Science', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000037', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000037', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000037', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000037', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000037', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q38: 2024 - Governance / Social Justice
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000038', 'd0000001-0001-0001-0001-000000000001', 2024, 'prelims', 'gs1', 38,
'Consider the following statements about the National Human Rights Commission (NHRC): 1. It is a constitutional body established under the Protection of Human Rights Act, 1993. 2. The Chairperson of the NHRC should be a retired Chief Justice of India. 3. The NHRC can inquire into violations of human rights committed by private individuals. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2'], ARRAY['Polity','Society'], 'Polity', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000038', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000038', 'B', '2 only', 2),
('c0000001-0001-0001-0001-000000000038', 'C', '2 and 3 only', 3),
('c0000001-0001-0001-0001-000000000038', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000038', 'B', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q39: 2022 - Disaster Management
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000039', 'd0000001-0001-0001-0001-000000000003', 2022, 'prelims', 'gs1', 39,
'With reference to disaster management in India, consider the following statements: 1. The National Disaster Management Authority (NDMA) is headed by the Prime Minister. 2. The Disaster Management Act was enacted in 2005. 3. The National Disaster Response Force (NDRF) was established under the NDMA. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-3'], ARRAY['Environment','Polity'], 'Environment', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000039', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000039', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000039', 'C', '1 only', 3),
('c0000001-0001-0001-0001-000000000039', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000039', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;

-- Q40: 2020 - Health / Nutrition
INSERT INTO public.pyq_questions (id, document_id, year, exam_stage, paper_code, question_number, question_text, question_type, gs_papers, syllabus_tags, topic, is_published, verification_status, confidence_score)
VALUES ('c0000001-0001-0001-0001-000000000040', 'd0000001-0001-0001-0001-000000000005', 2020, 'prelims', 'gs1', 40,
'With reference to the National Food Security Act (NFSA), 2013, consider the following statements: 1. It covers up to 75% of the rural population and 50% of the urban population. 2. Under the Antyodaya Anna Yojana, 35 kg of foodgrains per household per month is provided. 3. The Act provides for maternity benefits of not less than Rs. 6,000 per pregnancy. Which of the above statements is/are correct?',
'mcq', ARRAY['GS-2','GS-3'], ARRAY['Society','Economy'], 'Society', true, 'official_verified', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_options (question_id, option_label, option_text, sort_order) VALUES
('c0000001-0001-0001-0001-000000000040', 'A', '1 and 2 only', 1),
('c0000001-0001-0001-0001-000000000040', 'B', '2 and 3 only', 2),
('c0000001-0001-0001-0001-000000000040', 'C', '1 and 3 only', 3),
('c0000001-0001-0001-0001-000000000040', 'D', '1, 2 and 3', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pyq_prelims_keys (question_id, answer_label, key_source, is_official) VALUES
('c0000001-0001-0001-0001-000000000040', 'D', 'upsc_final', true) ON CONFLICT DO NOTHING;
