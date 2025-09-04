/**
 * PayPal Payment Integration for KovalAI Subscriptions
 * Handles subscription payments and trial upgrades
 */

import { getAdminClient } from '@/lib/supabase'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.paypal.com'
  : 'https://api.sandbox.paypal.com'

// Subscription plans with $0 for testing
const SUBSCRIPTION_PLANS = {
  basic: { price: 0.00, name: 'Basic Plan', features: ['AI Coaching', 'Basic Analytics'] },
  premium: { price: 0.00, name: 'Premium Plan', features: ['AI Coaching', 'Advanced Analytics', 'Video Analysis'] },
  coach: { price: 0.00, name: 'Coach Plan', features: ['All Features', 'Student Management', 'Custom Training Plans'] }
}

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })
  
  const data = await response.json()
  return data.access_token
}

export default async function handler(req, res) {
  const { method } = req

  switch (method) {
    case 'POST':
      return handleCreatePayment(req, res)
    case 'GET':
      return handleGetPlans(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetPlans(req, res) {
  try {
    res.status(200).json({
      plans: SUBSCRIPTION_PLANS,
      message: 'All plans currently FREE for testing'
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plans', details: error.message })
  }
}

async function handleCreatePayment(req, res) {
  try {
    const { userId, planType, returnUrl, cancelUrl } = req.body

    if (!userId || !planType) {
      return res.status(400).json({ error: 'User ID and plan type required' })
    }

    const plan = SUBSCRIPTION_PLANS[planType]
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan type' })
    }

    const supabase = getAdminClient()

    // Since price is $0, we can directly activate the subscription
    if (plan.price === 0) {
      // Update user subscription directly
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          subscription_plan: planType,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        })
        .eq('user_id', userId)

      if (updateError) {
        return res.status(400).json({ 
          error: 'Failed to activate subscription',
          details: updateError.message 
        })
      }

      return res.status(200).json({
        success: true,
        payment: {
          id: `free-${planType}-${Date.now()}`,
          status: 'COMPLETED',
          amount: plan.price,
          plan: planType
        },
        message: `${plan.name} activated successfully (FREE)`
      })
    }

    // For future paid plans, create PayPal payment
    const accessToken = await getPayPalAccessToken()
    
    const paymentData = {
      intent: 'sale',
      payer: { payment_method: 'paypal' },
      transactions: [{
        amount: {
          total: plan.price.toFixed(2),
          currency: 'USD'
        },
        description: `KovalAI ${plan.name} Subscription`,
        item_list: {
          items: [{
            name: plan.name,
            price: plan.price.toFixed(2),
            currency: 'USD',
            quantity: 1
          }]
        }
      }],
      redirect_urls: {
        return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`
      }
    }

    const paymentResponse = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    })

    const payment = await paymentResponse.json()

    if (!paymentResponse.ok) {
      return res.status(400).json({ 
        error: 'PayPal payment creation failed',
        details: payment 
      })
    }

    // Store payment info
    await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        payment_id: payment.id,
        plan_type: planType,
        amount: plan.price,
        status: 'created',
        paypal_data: payment
      })

    const approvalUrl = payment.links.find(link => link.rel === 'approval_url')?.href

    res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        approvalUrl,
        amount: plan.price,
        plan: planType
      }
    })

  } catch (error) {
    console.error('Payment creation error:', error)
    res.status(500).json({ 
      error: 'Payment creation failed',
      details: error.message 
    })
  }
}
