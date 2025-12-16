# 📱 In-App Purchase Subscription Implementation Guide

## 🎯 **IMPLEMENTATION STATUS: BACKEND READY** ✅

### **What's Implemented**
- ✅ Database schema for subscriptions
- ✅ Subscription service with tier management
- ✅ API endpoints for purchase/cancel/restore
- ✅ Feature gating system
- ✅ Usage tracking and limits
- ⚠️ Receipt verification (placeholder - needs API keys)

---

## 📊 **SUBSCRIPTION TIERS**

### **1. Free Tier** 🆓
- **Price**: $0.00 / ₹0
- **Storage**: 100MB
- **Features**:
  - Max 10 journals per month
  - Max 3 photos per journal
  - Max 30 seconds audio
  - Basic support
  - Standard themes only

### **2. Premium Monthly** 💎
- **Price**: $4.99/month / ₹399/month
- **Storage**: 1GB
- **Features**:
  - Unlimited journals
  - Max 10 photos per journal
  - Max 5 minutes audio
  - Priority support
  - Custom themes
  - Advanced analytics
  - Ad-free experience

### **3. Premium Yearly** 🌟
- **Price**: $49.99/year / ₹3,999/year
- **Savings**: 2 months free!
- **Storage**: 2GB
- **Features**:
  - Everything in Monthly
  - Max 15 photos per journal
  - Max 10 minutes audio
  - Early access to new features

### **4. Lifetime Premium** 👑
- **Price**: $99.99 one-time / ₹7,999 one-time
- **Storage**: 10GB
- **Features**:
  - Everything in Yearly
  - Max 20 photos per journal
  - Unlimited audio length
  - Exclusive features
  - VIP support

---

## 🗄️ **DATABASE SETUP**

### **Run the migration**:
```bash
cd DateQuizBE
psql -h <host> -U <user> -d <database> -f database/migrations/create_subscriptions.sql
```

Or programmatically:
```javascript
const fs = require('fs');
const db = require('./src/config/db');

const migration = fs.readFileSync('./database/migrations/create_subscriptions.sql', 'utf8');
await db.query(migration);
```

---

## 🔌 **API ENDPOINTS**

### **Public Endpoints**

#### **Get Subscription Tiers**
```http
GET /api/subscription/tiers
```
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "free",
      "display_name": "Free",
      "description": "Basic features for couples to get started",
      "price_usd": "0.00",
      "price_inr": "0.00",
      "billing_period": "lifetime",
      "features": {...},
      "storage_limit_mb": 100
    },
    // ... more tiers
  ]
}
```

### **Protected Endpoints** (Require Authentication)

#### **Get My Subscription**
```http
GET /api/subscription/my-subscription
Headers: Authorization: Bearer <token>
```

#### **Purchase Subscription**
```http
POST /api/subscription/purchase
Headers: Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "tierName": "premium_monthly",
  "platform": "ios",
  "transactionId": "1000000123456789",
  "originalTransactionId": "1000000123456789",
  "receiptData": "base64_encoded_receipt"
}
```

#### **Cancel Subscription**
```http
POST /api/subscription/cancel
Headers: Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "reason": "Too expensive"
}
```

#### **Restore Purchases**
```http
POST /api/subscription/restore
Headers: Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "platform": "ios",
  "receipts": [
    {
      "receiptData": "base64_receipt",
      "transactionId": "1000000123456789",
      "productId": "premium_monthly"
    }
  ]
}
```

#### **Get Subscription History**
```http
GET /api/subscription/history?limit=50
Headers: Authorization: Bearer <token>
```

#### **Check Feature Access**
```http
GET /api/subscription/feature/custom_themes
Headers: Authorization: Bearer <token>
```

---

## 🍎 **iOS SETUP (React Native)**

### **1. Install Dependencies**
```bash
npm install react-native-iap
```

### **2. Configure In-App Products**
- Go to **App Store Connect**
- Navigate to **My Apps** > Your App > **Subscriptions**
- Create subscription groups and products:
  - `com.datequiz.premium.monthly` - $4.99/month
  - `com.datequiz.premium.yearly` - $49.99/year
  - `com.datequiz.premium.lifetime` - $99.99 one-time

### **3. Client Code Example**
```javascript
import * as RNIap from 'react-native-iap';

const productIds = [
  'com.datequiz.premium.monthly',
  'com.datequiz.premium.yearly',
  'com.datequiz.premium.lifetime'
];

// Initialize IAP
async function initIAP() {
  await RNIap.initConnection();
  await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
  
  const products = await RNIap.getProducts({ skus: productIds });
  console.log('Products:', products);
}

// Purchase subscription
async function purchaseSubscription(productId) {
  try {
    const purchase = await RNIap.requestPurchase({ sku: productId });
    
    // Verify with backend
    const response = await fetch(`${API_URL}/api/subscription/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tierName: getTierName(productId),
        platform: Platform.OS,
        transactionId: purchase.transactionId,
        originalTransactionId: purchase.originalTransactionId,
        receiptData: purchase.transactionReceipt
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Finish transaction
      await RNIap.finishTransaction({purchase, isConsumable: false});
      return result.data;
    }
  } catch (error) {
    console.error('Purchase failed:', error);
    throw error;
  }
}

// Restore purchases
async function restorePurchases() {
  try {
    const purchases = await RNIap.getAvailablePurchases();
    
    const response = await fetch(`${API_URL}/api/subscription/restore`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform: Platform.OS,
        receipts: purchases.map(p => ({
          receiptData: p.transactionReceipt,
          transactionId: p.transactionId,
          productId: p.productId
        }))
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
}

function getTierName(productId) {
  const mapping = {
    'com.datequiz.premium.monthly': 'premium_monthly',
    'com.datequiz.premium.yearly': 'premium_yearly',
    'com.datequiz.premium.lifetime': 'lifetime'
  };
  return mapping[productId] || 'premium_monthly';
}
```

---

## 🤖 **ANDROID SETUP (React Native)**

### **1. Install Dependencies**
```bash
npm install react-native-iap
```

### **2. Configure Google Play Console**
- Go to **Google Play Console**
- Navigate to **Monetization** > **Subscriptions**
- Create subscription products:
  - `premium_monthly` - ₹399/month
  - `premium_yearly` - ₹3,999/year
  - `premium_lifetime` - ₹7,999 one-time

### **3. Client Code** (Same as iOS, uses Platform.OS to detect)

---

## 🔐 **RECEIPT VERIFICATION SETUP**

### **iOS Receipt Verification**

1. **Get Shared Secret** from App Store Connect
2. **Add to environment variables**:
```env
APPLE_SHARED_SECRET=your_shared_secret_here
APPLE_ENVIRONMENT=sandbox  # or 'production'
```

3. **Update subscriptionService.js**:
```javascript
async verifyIOSReceipt(receiptData, isProduction = false) {
  const appleUrl = isProduction
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';
  
  const response = await fetch(appleUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      'password': process.env.APPLE_SHARED_SECRET,
      'exclude-old-transactions': false
    })
  });
  
  const result = await response.json();
  
  if (result.status === 0) {
    const latestReceipt = result.latest_receipt_info[0];
    return {
      isValid: true,
      transactionId: latestReceipt.transaction_id,
      originalTransactionId: latestReceipt.original_transaction_id,
      expiresAt: new Date(parseInt(latestReceipt.expires_date_ms))
    };
  }
  
  return { isValid: false };
}
```

### **Android Purchase Verification**

1. **Set up Google Play Developer API**
2. **Create Service Account** and download JSON key
3. **Add to environment variables**:
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
GOOGLE_PLAY_PACKAGE_NAME=com.yourapp.package
```

4. **Install Google APIs**:
```bash
npm install googleapis
```

5. **Update subscriptionService.js**:
```javascript
const { google } = require('googleapis');

async verifyAndroidPurchase(purchaseToken, subscriptionId, isProduction = false) {
  const androidpublisher = google.androidpublisher('v3');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
  });
  
  const authClient = await auth.getClient();
  
  const response = await androidpublisher.purchases.subscriptions.get({
    auth: authClient,
    packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
    subscriptionId: subscriptionId,
    token: purchaseToken
  });
  
  const purchase = response.data;
  
  return {
    isValid: purchase.paymentState === 1,
    orderId: purchase.orderId,
    expiresAt: new Date(parseInt(purchase.expiryTimeMillis))
  };
}
```

---

## 🎨 **FEATURE GATING IN YOUR APP**

### **Check Feature Access**
```javascript
// In your React Native app
async function checkFeatureAccess(feature) {
  const response = await fetch(
    `${API_URL}/api/subscription/feature/${feature}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const result = await response.json();
  return result.data.hasAccess;
}

// Usage
const canUseCustomThemes = await checkFeatureAccess('custom_themes');
if (canUseCustomThemes) {
  // Show custom theme options
} else {
  // Show upgrade prompt
}
```

### **Feature Gate Component**
```javascript
// FeatureGate.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export function FeatureGate({ feature, children, onUpgradePress }) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkAccess();
  }, [feature]);
  
  async function checkAccess() {
    const access = await checkFeatureAccess(feature);
    setHasAccess(access);
    setLoading(false);
  }
  
  if (loading) return <View><Text>Loading...</Text></View>;
  
  if (hasAccess) {
    return children;
  }
  
  return (
    <View style={styles.upgradePrompt}>
      <Text style={styles.title}>Premium Feature</Text>
      <Text style={styles.description}>
        Upgrade to Premium to unlock this feature
      </Text>
      <TouchableOpacity onPress={onUpgradePress} style={styles.button}>
        <Text style={styles.buttonText}>Upgrade Now</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 🔧 **SETUP STEPS**

### **1. Run Database Migration**
```bash
cd DateQuizBE
# Connect to your database and run:
psql -h <host> -U <user> -d <database> -f database/migrations/create_subscriptions.sql
```

### **2. Configure Environment Variables**
```env
# iOS
APPLE_SHARED_SECRET=your_apple_shared_secret
APPLE_ENVIRONMENT=sandbox

# Android
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.nexusapps.UnfoldUs

# General
NODE_ENV=development
```

### **3. Install Dependencies** (if using Google Play API)
```bash
cd DateQuizBE
npm install googleapis
```

### **4. Configure App Store / Play Store**
- **iOS**: Set up subscriptions in App Store Connect
- **Android**: Set up subscriptions in Google Play Console

### **5. Install React Native IAP**
```bash
cd DateQuiz
npm install react-native-iap
npx pod-install  # iOS only
```

---

## 📱 **REACT NATIVE CLIENT IMPLEMENTATION**

### **Full Example Screen**
```javascript
// screens/SubscriptionScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as RNIap from 'react-native-iap';

const productIds = [
  'com.datequiz.premium.monthly',
  'com.datequiz.premium.yearly',
  'com.datequiz.premium.lifetime'
];

export function SubscriptionScreen() {
  const [products, setProducts] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initIAP();
    loadCurrentSubscription();
    
    return () => {
      RNIap.endConnection();
    };
  }, []);

  async function initIAP() {
    try {
      await RNIap.initConnection();
      const items = await RNIap.getProducts({ skus: productIds });
      setProducts(items);
    } catch (error) {
      console.error('IAP init error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentSubscription() {
    try {
      const response = await fetch(`${API_URL}/api/subscription/my-subscription`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      setCurrentSubscription(result.data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  }

  async function handlePurchase(product) {
    try {
      setLoading(true);
      const purchase = await RNIap.requestPurchase({ sku: product.productId });
      
      // Send to backend for verification
      const response = await fetch(`${API_URL}/api/subscription/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tierName: getTierName(product.productId),
          platform: Platform.OS,
          transactionId: purchase.transactionId,
          originalTransactionId: purchase.originalTransactionId,
          purchaseToken: purchase.purchaseToken,
          receiptData: purchase.transactionReceipt
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await RNIap.finishTransaction({ purchase, isConsumable: false });
        Alert.alert('Success', 'Subscription activated!');
        loadCurrentSubscription();
      } else {
        Alert.alert('Error', result.error || 'Purchase verification failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    try {
      setLoading(true);
      const purchases = await RNIap.getAvailablePurchases();
      
      if (purchases.length === 0) {
        Alert.alert('No Purchases', 'No purchases found to restore');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/subscription/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform: Platform.OS,
          receipts: purchases.map(p => ({
            receiptData: p.transactionReceipt,
            transactionId: p.transactionId,
            productId: p.productId,
            purchaseToken: p.purchaseToken
          }))
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', result.message);
        loadCurrentSubscription();
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>Choose Your Plan</Text>
        
        {currentSubscription && (
          <View style={styles.currentPlan}>
            <Text>Current: {currentSubscription.display_name}</Text>
            <Text>Expires: {new Date(currentSubscription.expires_at).toLocaleDateString()}</Text>
          </View>
        )}
        
        {products.map(product => (
          <TouchableOpacity
            key={product.productId}
            style={styles.productCard}
            onPress={() => handlePurchase(product)}
          >
            <Text style={styles.productName}>{product.title}</Text>
            <Text style={styles.productPrice}>{product.localizedPrice}</Text>
            <Text style={styles.productDescription}>{product.description}</Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function getTierName(productId) {
  const mapping = {
    'com.datequiz.premium.monthly': 'premium_monthly',
    'com.datequiz.premium.yearly': 'premium_yearly',
    'com.datequiz.premium.lifetime': 'lifetime'
  };
  return mapping[productId] || 'premium_monthly';
}
```

---

## 🎯 **FEATURE GATING EXAMPLES**

### **1. Limit Journals per Month**
```javascript
// Before creating journal
const canCreate = await subscriptionService.canUseFeature(userId, 'max_journals_per_month');
if (!canCreate) {
  return res.status(403).json({
    success: false,
    error: 'Monthly journal limit reached',
    upgradeRequired: true
  });
}

// Track usage
await subscriptionService.trackFeatureUsage(userId, 'max_journals_per_month');
```

### **2. Limit Photos per Journal**
```javascript
// Before uploading photo
const limit = await subscriptionService.getFeatureLimit(userId, 'max_photos_per_journal');
const currentPhotos = await getPhotoCount(journalId);

if (currentPhotos >= limit) {
  return res.status(403).json({
    success: false,
    error: `Photo limit reached (${limit} max)`,
    upgradeRequired: true
  });
}
```

### **3. Custom Themes Access**
```javascript
// Check if user can access custom themes
const hasCustomThemes = await subscriptionService.hasFeatureAccess(userId, 'custom_themes');
if (!hasCustomThemes) {
  return res.status(403).json({
    success: false,
    error: 'Custom themes require Premium subscription',
    upgradeRequired: true
  });
}
```

---

## 🔄 **WEBHOOK HANDLERS** (For automatic renewal/cancellation)

### **iOS Server Notifications**
```javascript
// routes/webhooks/appleWebhook.js
router.post('/apple/subscription-notification', async (req, res) => {
  const notification = req.body;
  
  // Handle different notification types
  switch (notification.notification_type) {
    case 'DID_RENEW':
      await handleRenewal(notification);
      break;
    case 'CANCEL':
      await handleCancellation(notification);
      break;
    case 'DID_FAIL_TO_RENEW':
      await handlePaymentIssue(notification);
      break;
  }
  
  res.sendStatus(200);
});
```

### **Android Real-time Developer Notifications**
```javascript
// routes/webhooks/googleWebhook.js
router.post('/google/subscription-notification', async (req, res) => {
  const message = JSON.parse(Buffer.from(req.body.message.data, 'base64'));
  
  switch (message.notificationType) {
    case 2: // SUBSCRIPTION_RENEWED
      await handleRenewal(message);
      break;
    case 3: // SUBSCRIPTION_CANCELED
      await handleCancellation(message);
      break;
  }
  
  res.sendStatus(200);
});
```

---

## 📈 **NEXT STEPS**

### **Immediate Actions**:
1. ✅ Run database migration
2. ⚠️ Configure App Store Connect subscriptions
3. ⚠️ Configure Google Play Console subscriptions
4. ⚠️ Get Apple Shared Secret
5. ⚠️ Set up Google Service Account
6. ⚠️ Install react-native-iap in client app
7. ⚠️ Implement subscription screen in React Native

### **Testing**:
1. Use sandbox/test environments
2. Test purchase flow end-to-end
3. Test restore purchases
4. Test subscription expiration
5. Test feature gating

### **Production Checklist**:
- [ ] iOS subscriptions approved in App Store Connect
- [ ] Android subscriptions approved in Play Console
- [ ] Receipt verification working
- [ ] Webhooks configured
- [ ] Feature gating tested
- [ ] Upgrade/downgrade flows tested
- [ ] Refund handling implemented
- [ ] Grace period configured

---

## 🎉 **YOU NOW HAVE A COMPLETE SUBSCRIPTION SYSTEM!**

**What's Ready**:
- ✅ 4-tier subscription model (Free, Monthly, Yearly, Lifetime)
- ✅ Database schema with history tracking
- ✅ Feature gating and usage limits
- ✅ API endpoints for purchase/cancel/restore
- ✅ Receipt verification framework
- ✅ Subscription management system

**Next Steps**: Configure App Store/Play Store products and implement the client-side code! 🚀
