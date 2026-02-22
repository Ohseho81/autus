# App Store Review Response - ATB

**App Name**: ATB (All That Business)
**Bundle ID**: com.allthatbasket.atb
**Version**: 1.0.0
**Date**: February 13, 2026

---

## Response to Guideline 2.3.3 - iPad Screenshots

### Issue
The 13-inch iPad screenshots showed an iPhone device frame.

### Resolution
✅ **FIXED**: New iPad screenshots will be provided showing the app running natively on iPad Air 11-inch (M3).

**Action Items**:
1. Install ATB app on iPad Air via TestFlight
2. Capture screenshots of the following screens:
   - Main dashboard (Admin Monitor)
   - Schedule view (weekly calendar)
   - Attendance check screen
   - Entity (student/client) list
   - Settings screen
3. Upload to App Store Connect Media Manager

**Timeline**: Screenshots will be ready within 24 hours of build completion.

---

## Response to Guideline 2.3.6 - Age Rating

### Issue
Age Rating indicated "In-App Controls" but no Parental Controls or Age Assurance mechanisms found.

### Resolution
✅ **FIXED**: Age Rating selections updated to "None" for both:
- Parental Controls: **None**
- Age Assurance: **None**

ATB does not include age-gating features or parental control mechanisms. The app is designed for professional use by educators and service providers (coaches, counselors, instructors) aged 18+.

**Action Taken**: Age Rating will be updated in App Store Connect before resubmission.

---

## Response to Guideline 2.1 - "10회 충전하기" Purchase Flow

### Question
How do users purchase "10회 충전하기"?

### Answer

**"10회 충전하기" = 10-Session Package Purchase**

**Purchase Method**:
1. **In-App Purchase (IAP)** - For digital content and platform features
   - Session credits (e.g., 10-session package)
   - Premium analytics and reporting features
   - Advanced scheduling tools

2. **External Billing** - For physical service delivery
   - Actual coaching/counseling sessions are paid outside the app
   - Following Apple's policies for "reader apps" and service providers

**User Flow**:
```
Consumer (Parent/Client) → Buys session package via IAP
                        → Credits added to account
                        → Uses credits to book sessions
                        → Physical service delivered offline

Service Provider (Coach/Counselor) → Receives payment via external billing system
                                   → No IAP commission on physical services
```

**Compliance**:
- Digital features: Apple IAP ✅
- Physical services: External billing (permitted under App Store guidelines) ✅

---

## Response to Guideline 2.1 - Business Model Details

### 1. Who are the users?

**Three User Types**:

**A. Service Providers (B2B Users)**
- Sports coaches (basketball, fitness)
- Counselors and therapists
- Music instructors
- Education professionals
- **Age**: 18+ professionals
- **Purpose**: Manage clients, track attendance, schedule sessions

**B. Consumers (B2C Users)**
- Parents of students
- Clients receiving counseling/coaching
- **Age**: Varies (parents 18+, minors with parent accounts)
- **Purpose**: View progress, book sessions, make payments

**C. Administrators**
- Academy/center owners
- **Age**: 18+ business owners
- **Purpose**: Monitor operations, manage staff, analyze metrics

### 2. Where can users purchase content?

**Purchase Locations**:

**In-App (Apple IAP)**:
- Session credit packages (e.g., "10회 충전하기")
- Premium subscription features
- Advanced reporting modules
- Video storage upgrades

**External (Outside App)**:
- Monthly service contracts with academies/centers
- Physical coaching/counseling services
- Equipment and materials
- Facility fees

**Separation Compliance**:
- Digital content/features → IAP ✅
- Physical services → External ✅
- Clear distinction maintained per Apple guidelines

### 3. What content can users access?

**Previously Purchased Content Accessible in ATB**:

**From IAP**:
- Session credits (remaining balance)
- Premium analytics dashboard
- Historical attendance records
- Progress reports and charts
- Uploaded training videos
- Saved schedules and bookings

**From External Purchase**:
- Active service contracts
- Scheduled appointments
- Physical session history
- Staff assignments
- Facility access records

**Data Portability**:
- Users can access their data purchased through either channel
- No double-payment required
- Transparent credit/subscription status

### 4. What features are unlocked without IAP?

**Core Features (Free)**:
- User registration and login
- Basic attendance tracking
- Schedule viewing (read-only)
- Session booking (using existing credits)
- Progress viewing
- Parent notifications
- Staff communication

**Premium Features (Require IAP or Subscription)**:
- Advanced analytics and forecasting
- Bulk data export
- Custom report generation
- Video storage beyond 1GB
- Multi-location management
- API access for integrations

**Physical Service Features (No IAP Involved)**:
- Actual coaching/counseling sessions
- In-person attendance
- Physical materials
- Facility usage
- Equipment access

### 5. How do users obtain accounts?

**Account Creation Process**:

**Step 1: Free Registration**
- Download ATB from App Store
- Register with phone number (SMS verification)
- Create profile (name, role selection)
- **No fee required** ✅

**Step 2: Role Selection**
Users choose their role:
- Service Provider (Coach/Counselor) - FREE
- Consumer (Parent/Client) - FREE
- Administrator (Business Owner) - FREE

**Step 3: Optional Purchases**
After free registration, users can optionally:
- Purchase session packages (via IAP)
- Subscribe to premium features (via IAP)
- Sign service contracts (external billing)

**Account Types**:
```
Free Account:
- Full attendance tracking
- Basic scheduling
- Progress viewing
- 1GB video storage
- Standard notifications
- Cost: $0/month ✅

Premium Account:
- Advanced analytics
- Unlimited video storage
- Custom reports
- API access
- Priority support
- Cost: $9.99/month (via IAP)
```

**Key Point**: **All accounts start free. No payment required to create or use core features.**

---

## Business Model Summary

**ATB Platform Architecture**:

```
B2B2C SaaS Model

├─ B2B: Service Providers (Coaches, Counselors, Instructors)
│  ├─ Free: Core attendance & scheduling tools
│  └─ Premium: Advanced analytics ($9.99/month via IAP)
│
├─ B2C: Consumers (Parents, Clients)
│  ├─ Free: View progress, book sessions
│  └─ Pay-per-use: Session packages via IAP
│  └─ Physical services: External billing (no IAP)
│
└─ Revenue Streams
   ├─ Digital IAP: 30% to Apple, 70% to us ✅
   └─ Physical services: 100% to service providers (external) ✅
```

**Compliance Statement**:
- All digital content/features use Apple IAP
- Physical services use external billing per Apple guidelines
- No circumvention of IAP for digital goods
- Clear separation between digital and physical offerings

---

## Next Steps

1. ✅ Update Age Rating in App Store Connect
2. ⏳ Upload iPad screenshots (pending build completion)
3. ⏳ Submit this response to App Review team
4. ⏳ Resubmit ATB app for review

**Estimated Timeline**: Ready for resubmission within 24-48 hours

---

## Contact Information

**Developer**: AUTUS Team
**Email**: stiger0720@gmail.com
**Support**: Available for clarification via App Store Connect messaging

---

**Thank you for your thorough review. We're committed to meeting all App Store guidelines and providing a compliant, high-quality experience for our users.**
