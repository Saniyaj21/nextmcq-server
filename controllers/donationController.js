import Razorpay from 'razorpay';
import crypto from 'crypto';

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAYZORPAY_KEY_ID,
  key_secret: process.env.RAYZORPAY_KEY_SECRET,
});

export const createDonationOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || !Number.isInteger(amount) || amount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const order = await getRazorpay().orders.create({
      amount: amount * 100, // convert to paise
      currency: 'INR',
      receipt: `donation_${Date.now()}`,
      notes: { purpose: 'Support NextMCQ' },
    });

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAYZORPAY_KEY_ID,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create order' });
  }
};

export const verifyDonation = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAYZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true, message: 'Payment verified. Thank you for your support!' });
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Verification error' });
  }
};
