import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const { plan, billingCycle, userId, userEmail } = await request.json()

    if (!plan || !billingCycle || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Define pricing
    const prices = {
      pro: {
        monthly: 'price_pro_monthly', // Replace with actual Stripe price IDs
        yearly: 'price_pro_yearly'
      },
      agency: {
        monthly: 'price_agency_monthly',
        yearly: 'price_agency_yearly'
      }
    }

    const priceId = prices[plan as keyof typeof prices]?.[billingCycle as 'monthly' | 'yearly']
    
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or billing cycle' }, { status: 400 })
    }

    // Create or retrieve Stripe customer
    let customer
    try {
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      })
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0]
      } else {
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            userId: userId
          }
        })
      }
    } catch (error) {
      console.error('Error creating/retrieving customer:', error)
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      metadata: {
        userId: userId,
        plan: plan,
        billingCycle: billingCycle
      },
      subscription_data: {
        metadata: {
          userId: userId,
          plan: plan
        }
      }
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' }, 
      { status: 500 }
    )
  }
}
