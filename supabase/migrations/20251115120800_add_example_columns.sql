-- Add english_example, godlife_example, and part_of_speech columns to words table
ALTER TABLE public.words
ADD COLUMN IF NOT EXISTS english_example TEXT,
ADD COLUMN IF NOT EXISTS godlife_example TEXT,
ADD COLUMN IF NOT EXISTS part_of_speech TEXT;

-- Copy existing example data to english_example if english_example is empty
UPDATE public.words
SET english_example = example
WHERE english_example IS NULL OR english_example = '';
