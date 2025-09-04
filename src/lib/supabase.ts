import { createClient } from '@supabase/supabase-js'
import { User, UserUsage, Subscription } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
