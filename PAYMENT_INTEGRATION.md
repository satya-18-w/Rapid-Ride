# Payment Integration Guide

## Overview
The Rapid Ride application now supports multiple payment methods including Cash, UPI, Card, and Wallet payments. The payment system is integrated with both backend and frontend components.

## Features

### Supported Payment Methods
1. **Cash** - Pay driver directly after ride completion
2. **UPI** - Pay via UPI apps (PhonePe, GPay, Paytm, BHIM, etc.) or UPI ID
3. **Card** - Pay via Debit/Credit cards (Visa, Mastercard, Rupay)
4. **Wallet** - Pay via digital wallets (Paytm, PhonePe wallet)

## Backend Implementation

### Database Schema
The `payments` table stores all payment transactions:
```sql
- id: UUID (Primary Key)
- ride_id: UUID (Foreign Key to rides)
- user_id: UUID (Foreign Key to users)
- amount: DECIMAL
- currency: VARCHAR (default 'INR')
- razorpay_order_id: VARCHAR (for online payments)
- razorpay_payment_id: VARCHAR (after payment completion)
- razorpay_signature: VARCHAR (for verification)
- status: ENUM (created, pending, authorized, captured, failed, refunded)
- payment_method: VARCHAR (cash, upi, card, wallet)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Backend Components

#### 1. Payment Model (`internal/model/payment.go`)
Defines payment data structures:
- `Payment` - Main payment entity
- `CreatePaymentOrderRequest` - Request for creating payment order
- `CreatePaymentOrderResponse` - Response with payment details
- `VerifyPaymentRequest` - For verifying online payments
- `UPIPaymentRequest`, `CardPaymentRequest`, `CashPaymentRequest` - Method-specific requests

#### 2. Payment Repository (`internal/repository/payment.go`)
Database operations:
- `Create()` - Create new payment record
- `GetByID()` - Get payment by ID
- `GetByRideID()` - Get payment for a ride
- `Update()` - Update payment status
- `GetUserPayments()` - Get user's payment history

#### 3. Payment Service (`internal/service/payment.go`)
Business logic:
- `CreatePaymentOrder()` - Creates payment order for a ride
- `VerifyPayment()` - Verifies Razorpay signature for online payments
- `ProcessCashPayment()` - Marks cash payment as completed
- `ProcessUPIPayment()` - Initiates UPI payment
- `GetPaymentByID()` / `GetPaymentByRideID()` - Retrieve payment info

#### 4. Payment Handler (`internal/handler/payment.go`)
API endpoints:
- `POST /api/v1/payments/create` - Create payment order
- `POST /api/v1/payments/verify` - Verify online payment
- `POST /api/v1/payments/cash` - Process cash payment
- `POST /api/v1/payments/upi` - Process UPI payment
- `GET /api/v1/payments/ride/:ride_id` - Get payment by ride ID

### API Flow

#### Creating a Ride with Payment
1. User creates ride with selected payment method
2. Backend creates ride record
3. Frontend calls `/payments/create` with ride_id, amount, payment_method
4. Backend creates payment record and returns payment order details
5. For cash: payment status = "pending"
6. For online: payment status = "created" with Razorpay order ID

#### Completing Payment

**Cash Payment:**
1. Ride completes
2. User rates the ride
3. Frontend calls `/payments/cash` with payment_id
4. Backend updates payment status to "captured"
5. Ride payment_status updated to "completed"

**Online Payment (UPI/Card/Wallet):**
1. After ride creation, user is shown payment interface
2. User completes payment via Razorpay
3. Frontend calls `/payments/verify` with payment details
4. Backend verifies signature and updates payment status
5. Ride payment_status updated to "completed"

## Frontend Implementation

### Components

#### 1. PaymentSelector (`components/PaymentSelector.jsx`)
Enhanced payment selection UI with:
- **Cash Option** - Direct selection
- **UPI Options** - Select from popular apps or enter UPI ID
- **Card Input Form** - Card number, expiry, CVV, holder name with validation
- **Wallet Option** - Quick selection
- Visual feedback for selected payment method
- Amount display with formatted currency

Features:
- Card number formatting (16 digits max)
- Expiry date auto-formatting (MM/YY)
- CVV masking (3 digits)
- Card holder name uppercase conversion
- Form validation before submission

#### 2. UserHome (`pages/UserHome.jsx`)
Payment integration in ride flow:
- Payment method selection after vehicle selection
- Payment order creation on ride booking
- Cash payment processing on ride completion
- Trip summary with payment details

### API Functions (`api.js`)
New payment-related API functions:
```javascript
createPaymentOrder(rideId, amount, paymentMethod)
verifyPayment(paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature)
processCashPayment(paymentId)
processUPIPayment(paymentId, upiId)
getPaymentByRideId(rideId)
```

## Razorpay Integration

### Environment Variables
Add to your `.env` file:
```
RAZORPAY_KEY_ID=your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here
```

### Integration Steps (Production)
1. Sign up for Razorpay account at https://razorpay.com
2. Get API keys from dashboard
3. Add Razorpay SDK to backend:
   ```bash
   go get github.com/razorpay/razorpay-go
   ```
4. Update `payment.go` service to use Razorpay SDK
5. Add Razorpay checkout script to frontend:
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```
6. Implement Razorpay checkout flow in frontend

### Testing (Development)
Currently, the payment system works in "mock mode":
- Payment orders are created with mock order IDs
- Signature verification uses HMAC SHA256
- All payment methods can be tested without actual transactions

## Usage Example

### Complete Flow

1. **User selects vehicle and payment method**
```javascript
setSelectedVehicle({ id: 'sedan', name: 'Sedan', basePrice: 50, pricePerKm: 12 });
setSelectedPayment({ id: 'upi', name: 'UPI', icon: '📱', upiId: 'user@paytm' });
```

2. **User books ride**
```javascript
const rideResponse = await createRide(
    pickupLocation,
    pickupAddress,
    dropoffLocation,
    dropoffAddress,
    'sedan',
    'upi'
);
```

3. **System creates payment order**
```javascript
const paymentResponse = await createPaymentOrder(
    rideResponse.data.id,
    calculateFare(distance),
    'upi'
);
// Returns: { payment_id, razorpay_order_id, amount, currency }
```

4. **For cash: Process after ride**
```javascript
// After ride completion and rating
const payment = await getPaymentByRideId(rideId);
await processCashPayment(payment.data.id);
```

5. **For online: Verify immediately**
```javascript
// After Razorpay payment success
await verifyPayment(
    paymentId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
);
```

## Security Considerations

1. **Signature Verification** - All online payments must pass HMAC SHA256 signature verification
2. **User Authorization** - Users can only access their own payments
3. **Amount Validation** - Payment amounts are validated against ride fare
4. **Status Tracking** - Payment status transitions are logged and validated
5. **HTTPS Required** - All payment APIs must use HTTPS in production

## Error Handling

Common errors and solutions:
- `payment not found` - Invalid payment ID
- `invalid payment signature` - Signature verification failed
- `unauthorized access to payment` - User doesn't own this payment
- `not a cash payment` - Attempting to process non-cash payment as cash
- `ride not found` - Invalid ride ID in payment creation

## Future Enhancements

1. **Refund Support** - Add refund processing for cancelled rides
2. **Payment History** - User dashboard with payment transactions
3. **Multiple Cards** - Save and manage multiple payment methods
4. **Auto-pay** - Automatic payment processing for trusted users
5. **Split Payment** - Share ride costs between multiple users
6. **Coupons/Discounts** - Apply promotional codes
7. **Wallet Balance** - Maintain user wallet for faster checkout
8. **Payment Analytics** - Dashboard for payment metrics

## Testing

### Manual Testing
1. Start backend: `cd backend && task run`
2. Start frontend: `cd frontend && npm run dev`
3. Create account and login
4. Book a ride with each payment method
5. Verify payment records in database

### Database Queries
```sql
-- Check payment status
SELECT * FROM payments WHERE ride_id = 'your-ride-id';

-- Check ride payment status
SELECT id, status, payment_status, payment_method FROM rides WHERE user_id = 'your-user-id';

-- Get user payment history
SELECT * FROM payments WHERE user_id = 'your-user-id' ORDER BY created_at DESC;
```

## Support

For issues or questions:
- Backend: Check logs in `backend/error_log.txt`
- Frontend: Check browser console
- Database: Verify migrations in `backend/internal/database/`

## License
Same as project license
