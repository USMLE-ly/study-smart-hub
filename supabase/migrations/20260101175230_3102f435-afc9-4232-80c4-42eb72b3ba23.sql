-- Create user gamification stats table
CREATE TABLE public.user_gamification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  xp_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  focus_minutes INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value INTEGER NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_achievements junction table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_gamification
CREATE POLICY "Users can view their own gamification stats" 
ON public.user_gamification FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gamification stats" 
ON public.user_gamification FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gamification stats" 
ON public.user_gamification FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for achievements (readable by all authenticated users)
CREATE POLICY "Achievements are viewable by authenticated users" 
ON public.achievements FOR SELECT 
TO authenticated
USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can earn achievements" 
ON public.user_achievements FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_gamification_updated_at
BEFORE UPDATE ON public.user_gamification
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, xp_reward, requirement_type, requirement_value, tier) VALUES
('First Steps', 'Complete your first study task', 'Trophy', 50, 'tasks_completed', 1, 'bronze'),
('Getting Started', 'Complete 5 study tasks', 'Star', 100, 'tasks_completed', 5, 'bronze'),
('Dedicated Learner', 'Complete 25 study tasks', 'Award', 250, 'tasks_completed', 25, 'silver'),
('Study Master', 'Complete 100 study tasks', 'Crown', 500, 'tasks_completed', 100, 'gold'),
('Focus Beginner', 'Spend 60 minutes in focus mode', 'Timer', 75, 'focus_minutes', 60, 'bronze'),
('Deep Focus', 'Spend 300 minutes in focus mode', 'Zap', 200, 'focus_minutes', 300, 'silver'),
('Zen Master', 'Spend 1000 minutes in focus mode', 'Brain', 400, 'focus_minutes', 1000, 'gold'),
('On Fire', 'Maintain a 3-day streak', 'Flame', 100, 'current_streak', 3, 'bronze'),
('Unstoppable', 'Maintain a 7-day streak', 'Target', 250, 'current_streak', 7, 'silver'),
('Legendary', 'Maintain a 30-day streak', 'Medal', 1000, 'current_streak', 30, 'gold'),
('Level Up', 'Reach level 5', 'TrendingUp', 150, 'level', 5, 'bronze'),
('High Achiever', 'Reach level 10', 'Rocket', 300, 'level', 10, 'silver'),
('Elite', 'Reach level 25', 'Sparkles', 750, 'level', 25, 'gold');