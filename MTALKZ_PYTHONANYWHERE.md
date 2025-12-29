# mTalkz on PythonAnywhere - Important Notes

## 🚨 PythonAnywhere Firewall Restrictions

**Free accounts** on PythonAnywhere have **restricted outbound access**. Only whitelisted domains are allowed.

### Check if mTalkz is Blocked

**On PythonAnywhere console:**
```bash
cd ~/samd-directory
python test_mtalkz_connectivity.py
```

This will test if `api.mtalkz.com` is accessible.

---

## 📊 Possible Results

### ✅ Scenario 1: mTalkz is Accessible
```
✅ WhatsApp: Connected! (Status: 401)
✅ SMS: Connected! (Status: 401)
```
*401 = Unauthorized is GOOD - means connection works, just needs valid API key*

**Action:** Your current setup will work! Just ensure API key is set in WSGI.

---

### ❌ Scenario 2: mTalkz is Blocked
```
❌ WhatsApp: CONNECTION BLOCKED by firewall
❌ SMS: CONNECTION BLOCKED by firewall
```

**Action:** You have 3 options:

#### Option A: Upgrade PythonAnywhere (Recommended)
- **Paid account** ($5/month) removes firewall restrictions
- All external APIs work
- Best for production

#### Option B: Request Whitelist
- Contact PythonAnywhere support
- Ask to whitelist: `api.mtalkz.com`
- May take 1-2 business days
- Free option but requires approval

#### Option C: Use Console Logging (Current)
- OTPs print to error log
- Good for development/testing
- Not suitable for production
- Already configured in your code

---

## 🔧 Current Fallback Behavior

Your code is **already configured** to handle this:

```python
# backend/services/otp_service.py
if not api_key:
    print(f"[OTP SIMULATION] Code for {phone}: {otp}")
    return {"success": True, "message": "OTP simulated (check console)"}
```

**If mTalkz is blocked:**
- OTPs will log to console instead of sending via WhatsApp/SMS
- Check error log: `tail -50 /var/log/szk008.pythonanywhere.com.error.log`
- Look for: `[OTP SIMULATION] Code for +91XXXXXX: 123456`

---

## 📝 To Use Real mTalkz (When Accessible)

Ensure WSGI file has:
```python
os.environ['MTALKZ_API_KEY'] = 'ImPBeDyAom6zfpFgJfhrI0OUivG26T'
os.environ['MTALKZ_SENDER_ID'] = 'SAMDDR'
```

Code will automatically:
- Try WhatsApp first
- Fallback to SMS
- If both fail, log to console

---

## 🎯 Recommendation

1. **Test now:** Run `test_mtalkz_connectivity.py`
2. **If blocked:** Use console logging for testing/development
3. **For production:** Upgrade to paid PythonAnywhere account
4. **Alternative:** Request whitelist from PythonAnywhere

---

## 💡 Why This Matters

- **Development:** Console logging is fine for testing
- **Production:** Real users won't see console - need actual SMS/WhatsApp
- **Workaround:** Magic Link (email) and Google OAuth don't require mTalkz

**Your unified auth system has fallbacks:**
- If mTalkz is blocked → Use Magic Link (email) or Google OAuth
- Mobile number still collected for future use
- System remains functional

---

## ✅ Action Items

**Right now:**
```bash
# On PythonAnywhere
cd ~/samd-directory
git pull
python test_mtalkz_connectivity.py
```

**Then:**
- ✅ Blocked → Use console logging + Magic Link/Google for now
- ✅ Accessible → Verify API key is set, test OTP delivery
- ✅ Production → Upgrade to paid account for full functionality
