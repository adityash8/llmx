import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    })

    if (!session.subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
    }

    const subscription: any = session.subscription
    const userId = session.metadata?.userId
    const plan = session.metadata?.plan

    if (!userId || !plan) {
      return NextResponse.json({ error: 'Missing user information' }, { status: 400 })
    }

    // Update user subscription in database
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan: plan,
        status: subscription.status,
        stripe_subscription_id: subscription.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end
      }, {
        onConflict: 'user_id'
      })

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    // Update user plan
    const { error: userError } = await supabase
      .from('users')
      .update({ plan: plan })
      .eq('id', userId)

    if (userError) {
      console.error('Error updating user plan:', userError)
      return NextResponse.json({ error: 'Failed to update user plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error verifying session:', error)
    return NextResponse.json(
      { error: 'Failed to verify session' }, 
      { status: 500 }
    )
  }
}
