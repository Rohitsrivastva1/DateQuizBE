# Google Play Console Setup Guide

This guide will help you set up Google Play Billing for your DateQuiz app.

## 📋 Prerequisites

1. **Google Play Developer Account** - You need a paid Google Play Developer account ($25 one-time fee)
2. **Published App** - Your app must be published on Google Play Store
3. **Service Account** - For backend API access

## 🔧 Step 1: Google Play Console Setup

### 1.1 Create Subscription Products

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Navigate to **Monetize** → **Products** → **Subscriptions**
4. Click **Create subscription**

#### Configure Monthly Subscription:
- **Product ID**: `premium_monthly`
- **Name**: `Premium Monthly`
- **Description**: `Unlimited journals and enhanced features`
- **Billing period**: `1 month`
- **Price**: `₹25.00` (or your preferred price)
- **Free trial**: Optional (e.g., 7 days)
- **Grace period**: Optional (e.g., 3 days)

### 1.2 Activate Subscription Products

1. After creating subscriptions, click **Activate**
2. Wait for Google Play approval (usually 24-48 hours)
3. Products must be **Active** before they can be used

## 🔑 Step 2: Service Account Setup

### 2.1 Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create one)
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. Fill in details:
   - **Name**: `datequiz-billing-service`
   - **Description**: `Service account for Google Play Billing API`
6. Click **Create and Continue**

### 2.2 Grant Permissions

1. In the service account list, click on your service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Download the JSON key file

### 2.3 Link to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup** → **API access**
3. Click **Link project** (if not already linked)
4. Select your Google Cloud project
5. Grant the following permissions:
   - **View app information and download bulk reports**
   - **View financial data, orders, and cancellation survey responses**

## 🔐 Step 3: Environment Variables

Add these environment variables to your backend:

```bash
# Google Play Configuration
GOOGLE_PLAY_PACKAGE_NAME=com.datequiz.app
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PLAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----"
```

### 3.1 Extract Private Key

From your downloaded JSON key file:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@project.iam.gserviceaccount.com",
  "client_id": "client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

Copy the `private_key` value and `client_email` to your environment variables.

## 📱 Step 4: Android App Configuration

### 4.1 Update Android Manifest

Add billing permission to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

### 4.2 Update Package Name

Ensure your app's package name matches the one in Google Play Console:
- **Google Play Console**: `com.datequiz.app`
- **Android Manifest**: `com.datequiz.app`

### 4.3 Sign APK/AAB

Make sure your app is signed with the same key used for Google Play Store upload.

## 🧪 Step 5: Testing

### 5.1 Test Accounts

1. Add test accounts in Google Play Console:
   - Go to **Setup** → **License testing**
   - Add Gmail addresses of test users
   - Set **License response** to **RESPOND_NORMALLY**

### 5.2 Test Purchases

1. Install your app on a test device
2. Use a test account (added in step 5.1)
3. Test the subscription flow:
   - Purchase subscription
   - Verify receipt
   - Test cancellation
   - Test restoration

### 5.3 Debug Mode

For development, the app will use mock verification if Google Play API is not configured. Check logs for:
```
⚠️ Google Play API credentials not configured. Receipt verification will be mocked.
```

## 🚀 Step 6: Production Deployment

### 6.1 Environment Variables

Set production environment variables:
```bash
NODE_ENV=production
GOOGLE_PLAY_PACKAGE_NAME=com.datequiz.app
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PLAY_PRIVATE_KEY="your-production-private-key"
```

### 6.2 Verify Configuration

Test with real Google Play purchases:
1. Upload signed APK/AAB to Google Play Console
2. Publish to internal testing track
3. Test with real Google Play accounts
4. Verify receipt validation works

## 🔍 Troubleshooting

### Common Issues:

1. **"Purchase token expired"**
   - Purchase tokens expire after 3 days
   - Implement proper token refresh logic

2. **"Package name mismatch"**
   - Ensure package name in code matches Google Play Console

3. **"Service account not authorized"**
   - Check service account permissions in Google Play Console
   - Verify JSON key file is correct

4. **"Subscription not found"**
   - Ensure subscription products are active in Google Play Console
   - Check product IDs match exactly

### Debug Commands:

```bash
# Test Google Play API connection
node -e "const gpv = require('./src/services/googlePlayVerification'); gpv.initialize().then(console.log);"

# Test subscription verification
node -e "const gpv = require('./src/services/googlePlayVerification'); gpv.verifySubscriptionPurchase('test-token', 'premium_monthly').then(console.log);"
```

## 📚 Additional Resources

- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [Google Play Developer API](https://developers.google.com/android-publisher)
- [React Native IAP Documentation](https://github.com/dooboolab/react-native-iap)

## ✅ Checklist

- [ ] Google Play Developer account created
- [ ] Subscription products created and activated
- [ ] Service account created and configured
- [ ] Environment variables set
- [ ] Android app configured with billing permission
- [ ] Test accounts added
- [ ] Test purchases working
- [ ] Production environment configured
- [ ] Real purchases tested

## 🎯 Next Steps

After completing this setup:

1. **Monitor Subscriptions**: Set up analytics to track subscription metrics
2. **Handle Webhooks**: Implement Google Play webhook handlers for subscription events
3. **User Management**: Add subscription management UI for users
4. **Analytics**: Track subscription conversion rates and churn
5. **Support**: Implement subscription support and refund handling

---

**Note**: This setup process can take 1-3 days due to Google Play approval times. Plan accordingly for production releases.
