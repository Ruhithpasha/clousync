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