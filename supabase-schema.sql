-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
  github_token TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User usage tracking
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generations_this_month INTEGER NOT NULL DEFAULT 0,
  last_generation_date TIMESTAMP WITH TIME ZONE,
  total_generations INTEGER NOT NULL DEFAULT 0,
  last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'agency')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  sitemap_url TEXT,
  rules JSONB DEFAULT '[]',
  urls JSONB DEFAULT '[]',
  validation_issues JSONB DEFAULT '[]',
  llms_txt_content TEXT,
  score INTEGER,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GitHub PRs table
CREATE TABLE github_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pr_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  branch TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'merged', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_domain ON projects(domain);
CREATE INDEX idx_github_prs_project_id ON github_prs(project_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_prs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- User usage policies
CREATE POLICY "Users can view own usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON user_usage
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON user_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- GitHub PRs policies
CREATE POLICY "Users can view project PRs" ON github_prs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = github_prs.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project PRs" ON github_prs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = github_prs.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_usage_updated_at BEFORE UPDATE ON user_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
