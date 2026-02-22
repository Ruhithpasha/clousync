-- CloudSync Pro: Clean Slate Schema
CREATE EXTENSION IF NOT EXISTS vector;
-- This script fixes the "UUID vs Bigint" type mismatch by ensuring all IDs use UUIDs compatible with Supabase Auth.

-- CAUTION: This will drop existing tables to ensure type consistency.
DROP TABLE IF EXISTS public.images CASCADE;

DROP TABLE IF EXISTS public.albums CASCADE;

DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Create Profiles Table (Must use UUID to match auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  plan TEXT DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO', 'SUPER')),
  storage_limit BIGINT DEFAULT 104857600, -- 100MB in bytes
  is_admin BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Albums Table
CREATE TABLE public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Images Table
CREATE TABLE public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  album_id UUID REFERENCES public.albums(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  file_size BIGINT DEFAULT 0, -- Store size in bytes
  tags TEXT[],
  embedding vector(512), -- CLIP ViT-B/32 generates 512 dimensions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Users can create their own profile" ON public.profiles FOR
INSERT
WITH
    CHECK (auth.uid () = id);

CREATE POLICY "Users can view their own profile" ON public.profiles FOR
SELECT USING (auth.uid () = id);

CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE USING (auth.uid () = id);

CREATE POLICY "Users can manage their own albums" ON public.albums FOR ALL USING (auth.uid () = user_id);

CREATE POLICY "Users can manage their own images" ON public.images FOR ALL USING (auth.uid () = user_id);

-- 6. Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Semantic Search Function
CREATE OR REPLACE FUNCTION match_images (
  query_embedding vector(512),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  album_id UUID,
  original_name TEXT,
  storage_path TEXT,
  cloudinary_url TEXT,
  public_id TEXT,
  file_size BIGINT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    images.id,
    images.user_id,
    images.album_id,
    images.original_name,
    images.storage_path,
    images.cloudinary_url,
    images.public_id,
    images.file_size,
    images.tags,
    images.created_at,
    1 - (images.embedding <=> query_embedding) AS similarity
  FROM images
  WHERE images.user_id = auth.uid() -- Security: Only own images
    AND 1 - (images.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 8. Create Memories Table
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  source_image_id UUID REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
  image_ids UUID[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can manage their own memories" ON public.memories FOR ALL USING (auth.uid () = user_id);