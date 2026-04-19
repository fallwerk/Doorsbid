// api/create-payment-intent.js
// Vercel Serverless Function – Secret Key bleibt hier, nie im Frontend!
// Deployment: Diese Datei in /api/ Ordner auf GitHub hochladen

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://doorsbid.ch');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentMethodId, amount, auctionId, buyerEmail, buyerName } = req.body;

    if (!paymentMethodId || !amount || !auctionId) {
      return res.status(400).json({ error: 'Fehlende Parameter' });
    }

    // Betrag in Rappen (Stripe erwartet kleinste Währungseinheit)
    const amountInCents = Math.round(amount * 100);

    // PaymentIntent erstellen
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'chf',
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        auction_id: auctionId,
        buyer_email: buyerEmail || '',
        buyer_name: buyerName || '',
        platform: 'doorsbid'
      },
      receipt_email: buyerEmail || null,
      description: `Doorsbid Auktion #${auctionId}`,
      statement_descriptor: 'DOORSBID',
    });

    if (paymentIntent.status === 'succeeded') {
      return res.status(200).json({
        success: true,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
      });
    } else {
      return res.status(400).json({
        error: 'Zahlung nicht abgeschlossen',
        status: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('Stripe Error:', error);
    return res.status(500).json({
      error: error.message || 'Zahlungsfehler'
    });
  }
}
