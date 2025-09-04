// PayPal payment creation endpoint
import { getServerClient } from '@/lib/supabase';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.paypal.com' 
  : 'https://api.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planId, userId } = req.body;

    if (!planId || !userId) {
      return res.status(400).json({ error: 'Missing planId or userId' });
    }

    // Get the subscription plan
    const supabase = getServerClient();
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Create PayPal payment
    const paymentData = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      transactions: [{
        item_list: {
          items: [{
            name: plan.name,
            sku: plan.tier,
            price: plan.price.toString(),
            currency: plan.currency,
            quantity: 1
          }]
        },
        amount: {
          currency: plan.currency,
          total: plan.price.toString()
        },
        description: `KovalAI ${plan.name} Subscription`
      }],
      redirect_urls: {
        return_url: `${process.env.BASE_URL}/api/payments/paypal-success`,
        cancel_url: `${process.env.BASE_URL}/auth/subscription?cancelled=true`
      }
    };

    const paymentResponse = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const payment = await paymentResponse.json();

    if (payment.state === 'created') {
      // Store payment info in database
      await supabase
        .from('payment_transactions')
        .insert({
          user_id: userId,
          paypal_transaction_id: payment.id,
          amount: plan.price,
          currency: plan.currency,
          subscription_tier: plan.tier,
          status: 'pending',
          paypal_data: payment
        });

      // Find approval URL
      const approvalUrl = payment.links.find(link => link.rel === 'approval_url')?.href;

      res.status(200).json({
        paymentId: payment.id,
        approvalUrl,
        status: 'created'
      });
    } else {
      res.status(400).json({ error: 'Failed to create PayPal payment', details: payment });
    }
  } catch (error) {
    console.error('PayPal payment creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
