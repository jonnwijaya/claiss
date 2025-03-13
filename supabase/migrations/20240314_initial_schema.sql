-- Create tables for Claiss application

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Lectures table to store recording metadata
create table if not exists lectures (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade,
    title text not null,
    description text,
    duration integer,
    file_path text not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Transcriptions table to store Whisper API results
create table if not exists transcriptions (
    id uuid primary key default uuid_generate_v4(),
    lecture_id uuid references lectures(id) on delete cascade,
    content text not null,
    language text,
    confidence float,
    created_at timestamp with time zone default now()
);

-- Summaries table to store GPT-4 generated summaries
create table if not exists summaries (
    id uuid primary key default uuid_generate_v4(),
    transcription_id uuid references transcriptions(id) on delete cascade,
    content text not null,
    key_points jsonb,
    created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table lectures enable row level security;
alter table transcriptions enable row level security;
alter table summaries enable row level security;

-- Create policies
create policy "Users can view their own lectures"
    on lectures for select
    using (auth.uid() = user_id);

create policy "Users can insert their own lectures"
    on lectures for insert
    with check (auth.uid() = user_id);

create policy "Users can view transcriptions of their lectures"
    on transcriptions for select
    using (exists (
        select 1 from lectures
        where lectures.id = transcriptions.lecture_id
        and lectures.user_id = auth.uid()
    ));

create policy "Users can view summaries of their transcriptions"
    on summaries for select
    using (exists (
        select 1 from transcriptions
        join lectures on lectures.id = transcriptions.lecture_id
        where transcriptions.id = summaries.transcription_id
        and lectures.user_id = auth.uid()
    ));
