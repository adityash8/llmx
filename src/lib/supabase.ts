import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { User, UserUsage, Subscription } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client-side client for components
export const createClientSupabase = () => createClientComponentClient()

// Server-side client with auth
export const createServerSupabase = () => createServerComponentClient({ cookies })

export async function getUser(userId: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        usage:user_usage(*),
        subscription:subscriptions(*)
      `)
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function updateUserUsage(userId: string): Promise<UserUsage | null> {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Check if we need to reset monthly usage
    const { data: currentUsage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .single()

    let usageData: Partial<UserUsage>
    
    if (!currentUsage || new Date(currentUsage.last_reset_date) < startOfMonth) {
      // Reset monthly usage
      usageData = {
        user_id: userId,
        generations_this_month: 1,
        last_generation_date: now.toISOString(),
        total_generations: (currentUsage?.total_generations || 0) + 1,
        last_reset_date: startOfMonth.toISOString()
      }
    } else {
      // Increment existing usage
      usageData = {
        generations_this_month: currentUsage.generations_this_month + 1,
        last_generation_date: now.toISOString(),
        total_generations: currentUsage.total_generations + 1
      }
    }

    const { data, error } = await supabase
      .from('user_usage')
      .upsert(usageData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating user usage:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error updating user usage:', error)
    return null
  }
}

export async function createUser(userData: {
  id: string
  email: string
  name?: string
}): Promise<User | null> {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        plan: 'free'
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user:', userError)
      return null
    }

    // Create initial usage record
    const { error: usageError } = await supabase
      .from('user_usage')
      .insert({
        user_id: userData.id,
        generations_this_month: 0,
        last_generation_date: new Date().toISOString(),
        total_generations: 0,
        last_reset_date: new Date().toISOString()
      })

    if (usageError) {
      console.error('Error creating user usage:', usageError)
    }

    return user
  } catch (error) {
    console.error('Error creating user:', error)
    return null
  }
}

// Authentication helpers
export async function signUp(email: string, password: string, name?: string) {
  const supabase = createClientSupabase()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0]
      }
    }
  })

  if (error) {
    throw error
  }

  // Create user record in our database
  if (data.user) {
    await createUser({
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata?.name
    })
  }

  return data
}

export async function signIn(email: string, password: string) {
  const supabase = createClientSupabase()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const supabase = createClientSupabase()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw error
  }
}

export async function getCurrentUser() {
  const supabase = createClientSupabase()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw error
  }

  if (!user) {
    return null
  }

  // Get full user data from our database
  return await getUser(user.id)
}

// Project operations
export async function createProject(projectData: {
  userId: string
  name: string
  domain: string
  sitemapUrl?: string
  rules?: any[]
  urls?: any[]
  validationIssues?: any[]
  llmsTxtContent?: string
  score?: number
  isPublic?: boolean
}) {
  const supabase = createClientSupabase()
  
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: projectData.userId,
      name: projectData.name,
      domain: projectData.domain,
      sitemap_url: projectData.sitemapUrl,
      rules: projectData.rules || [],
      urls: projectData.urls || [],
      validation_issues: projectData.validationIssues || [],
      llms_txt_content: projectData.llmsTxtContent,
      score: projectData.score,
      is_public: projectData.isPublic || false
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getUserProjects(userId: string) {
  const supabase = createClientSupabase()
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

export async function updateProject(projectId: string, updates: any) {
  const supabase = createClientSupabase()
  
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteProject(projectId: string) {
  const supabase = createClientSupabase()
  
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    throw error
  }
}
