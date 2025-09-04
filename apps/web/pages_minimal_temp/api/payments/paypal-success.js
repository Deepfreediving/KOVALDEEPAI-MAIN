// PayPal payment success handler
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId, PayerID } = req.query;

    if (!paymentId || !PayerID) {
      return res.redirect('/auth/subscription?error=missing_params');
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Execute the payment
    const executeData = {
      payer_id: PayerID
    };

    const executeResponse = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payment/${paymentId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(executeData),
    });

    const executedPayment = await executeResponse.json();

    // Get Supabase client for database operations
    const supabase = getServerClient();

    if (executedPayment.state === 'approved') {
      // Get the transaction from database
      const { data: transaction, error: transactionError } = await supabase
        .from('payment_transactions')
        .select('*, subscription_plans(*)')
        .eq('paypal_transaction_id', paymentId)
        .single();

      if (transactionError) {
        console.error('Transaction lookup error:', transactionError);
        return res.redirect('/auth/subscription?error=transaction_not_found');
      }

      // Calculate subscription dates
      const now = new Date();
      const subscriptionStart = now;
      const subscriptionEnd = new Date(now);
      
      if (transaction.subscription_plans.billing_period === 'yearly') {
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
      } else {
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      }

      // Update transaction status
      await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          paypal_data: executedPayment
        })
        .eq('id', transaction.id);

      // Update user profile with new subscription
      const subscriptionUpdate = {
        subscription_tier: transaction.subscription_tier,
        subscription_status: 'active',
        subscription_start_date: subscriptionStart.toISOString(),
        subscription_end_date: subscriptionEnd.toISOString(),
        dive_logs_limit: transaction.subscription_plans.dive_logs_limit
      };

      await supabase
        .from('user_profiles')
        .update(subscriptionUpdate)
        .eq('id', transaction.user_id);

      // Redirect to success page
      res.redirect(`/?upgraded=${transaction.subscription_tier}&payment=success`);
    } else {
      // Payment failed
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          paypal_data: executedPayment
        })
        .eq('paypal_transaction_id', paymentId);

      res.redirect('/auth/subscription?error=payment_failed');
    }
  } catch (error) {
    console.error('PayPal payment execution error:', error);
    res.redirect('/auth/subscription?error=server_error');
  }
}
