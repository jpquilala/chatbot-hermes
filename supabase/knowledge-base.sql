-- Supabase schema for AI Chat persistent knowledge base.
-- Run this in Supabase Dashboard → SQL Editor.

create table if not exists public.knowledge_documents (
  id text primary key,
  file_name text not null unique,
  file_type text not null,
  uploaded_at timestamptz not null default now(),
  indexed_at timestamptz,
  status text not null check (status in ('pending', 'indexed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id text primary key,
  document_id text not null references public.knowledge_documents(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  chunk_text text not null,
  chunk_index integer not null,
  embedding jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_document_id_idx
  on public.knowledge_chunks(document_id);

create index if not exists knowledge_chunks_file_name_idx
  on public.knowledge_chunks(file_name);

create index if not exists knowledge_documents_uploaded_at_idx
  on public.knowledge_documents(uploaded_at desc);

-- Keep direct browser/client access locked down.
-- The Next.js server uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS securely.
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

-- Optional read policies can be added later if you build a public/client-side document list.
-- For now, do not add anon policies. All reads/writes happen server-side.
