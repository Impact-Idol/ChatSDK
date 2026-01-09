# HIPAA Compliance Checklist

**Document Date:** 2026-01-09
**Last Review:** [Date]
**Next Review:** [Date + 90 days]

## Overview

This checklist ensures ChatSDK meets all HIPAA requirements before launching to healthcare customers. Each item must be verified and documented.

**Completion Required:** 100% before production launch
**Review Frequency:** Quarterly
**Owner:** [Security Officer Name]

---

## Administrative Safeguards

### Security Management Process (§164.308(a)(1))

#### Risk Analysis

- [ ] **Risk assessment completed** (documented threats, vulnerabilities)
  - Document: `/docs/security/risk-assessment-YYYY-MM.pdf`
  - Last completed: [Date]
  - Next review: [Date + 12 months]

- [ ] **Risk management strategy documented** (mitigation plans for identified risks)
  - Document: `/docs/security/risk-management-plan.pdf`

- [ ] **Sanction policy documented** (consequences for policy violations)
  - Document: `/docs/policies/sanction-policy.pdf`

- [ ] **Information system activity review** (monthly audit log reviews)
  - Process documented: ✅/❌
  - Last review: [Date]

**Verification:**
```bash
# Check if risk assessment exists
ls -l docs/security/risk-assessment-*.pdf

# Verify monthly audit log reviews
psql -c "SELECT COUNT(*) FROM audit_log WHERE event_category = 'administrative' AND event_type = 'audit_log_review' AND timestamp > NOW() - INTERVAL '30 days';"
```

### Assigned Security Responsibility (§164.308(a)(2))

- [ ] **Security Officer designated**
  - Name: [Name]
  - Email: [Email]
  - Phone: [Phone]
  - Start date: [Date]

- [ ] **Security Officer responsibilities documented**
  - Document: `/docs/policies/security-officer-responsibilities.pdf`

- [ ] **Security Officer has completed HIPAA training**
  - Training date: [Date]
  - Certificate: [Link]

**Verification:**
```bash
# Verify in organizational chart
cat docs/org-chart.md | grep "Security Officer"
```

### Workforce Security (§164.308(a)(3))

#### Authorization and Supervision

- [ ] **Access authorization procedures documented** (who approves access, process)
  - Document: `/docs/policies/access-authorization.pdf`

- [ ] **Workforce clearance procedures** (background checks for employees with PHI access)
  - Vendor: [Background check provider]
  - All employees checked: ✅/❌
  - Documentation: `/docs/hr/background-checks/`

- [ ] **Termination procedures** (revoke access immediately upon termination)
  - Documented: ✅/❌
  - Automated: ✅/❌ (via HRIS integration)

**Verification:**
```bash
# Check that terminated employees have no active sessions
psql -c "SELECT u.user_id, u.terminated_at, COUNT(r.id) as active_tokens FROM app_user u LEFT JOIN refresh_token r ON u.user_id = r.user_id AND r.revoked_at IS NULL WHERE u.terminated_at IS NOT NULL GROUP BY u.user_id, u.terminated_at HAVING COUNT(r.id) > 0;"
# Should return 0 rows
```

### Information Access Management (§164.308(a)(4))

- [ ] **Access management policies documented** (least privilege principle)
  - Document: `/docs/policies/access-management.pdf`

- [ ] **Role-based access control implemented** (owner, admin, moderator, member)
  - Verified in code: ✅/❌
  - File: `/packages/api/src/middleware/auth.ts`

- [ ] **Access review process** (quarterly review of user permissions)
  - Process documented: ✅/❌
  - Last review: [Date]
  - Next review: [Date + 90 days]

**Verification:**
```sql
-- Verify RBAC implementation
SELECT COUNT(*) FROM channel_member WHERE role NOT IN ('owner', 'admin', 'moderator', 'member');
-- Should return 0

-- List users with admin access (for review)
SELECT app_id, user_id, role, created_at
FROM channel_member
WHERE role IN ('owner', 'admin')
ORDER BY app_id, role;
```

### Security Awareness and Training (§164.308(a)(5))

- [ ] **Security awareness training program established**
  - Training platform: [Name]
  - Frequency: Annually + upon hire

- [ ] **All workforce members trained on HIPAA**
  - Training completion rate: [XX%] (must be 100%)
  - Records: `/docs/training/completion-records.csv`

- [ ] **Training content includes:**
  - [ ] PHI handling procedures
  - [ ] Password security
  - [ ] Phishing awareness
  - [ ] Incident reporting
  - [ ] Clean desk policy
  - [ ] Mobile device security

**Verification:**
```bash
# Check training completion
cat docs/training/completion-records.csv | grep "$(date +%Y)" | wc -l
# Compare to employee count
```

### Security Incident Procedures (§164.308(a)(6))

- [ ] **Incident response plan documented**
  - Document: `/docs/hipaa-compliance/04-implementation-roadmap.md#week-9-documentation--incident-response`

- [ ] **Incident response team assigned**
  - Security Officer: [Name]
  - Engineering Lead: [Name]
  - Legal Counsel: [Name]
  - Communications: [Name]

- [ ] **Incident reporting process established** (how to report, who to contact)
  - Hotline: [Phone]
  - Email: security@company.com
  - Documented: ✅/❌

- [ ] **Incident response drills conducted**
  - Last drill: [Date]
  - Next drill: [Date + 90 days]
  - Drill type: [Tabletop / Full simulation]

**Verification:**
```bash
# Check incident response plan exists
test -f docs/hipaa-compliance/incident-response-plan.md && echo "✅ Plan exists" || echo "❌ Plan missing"

# Check drill documentation
ls -l docs/security/incident-response-drills/
```

### Contingency Plan (§164.308(a)(7))

#### Data Backup Plan

- [ ] **Automated backups configured**
  - RDS: 35-day retention ✅/❌
  - S3: Cross-region replication ✅/❌
  - Redis: Daily snapshots ✅/❌

- [ ] **Backup testing conducted**
  - Last test: [Date]
  - Test type: [Full restoration]
  - Success: ✅/❌
  - Documentation: `/docs/backups/test-results-YYYY-MM-DD.pdf`

**Verification:**
```bash
# Verify RDS backups
aws rds describe-db-instances --db-instance-identifier chatsdk-postgres-prod \
  --query 'DBInstances[0].BackupRetentionPeriod'
# Should return 35

# Verify S3 replication
aws s3api get-bucket-replication --bucket chatsdk-uploads-prod
# Should show active replication rule

# Check backup testing documentation
ls -lt docs/backups/test-results-*.pdf | head -1
# Should be within last 90 days
```

#### Disaster Recovery Plan

- [ ] **Disaster recovery plan documented**
  - Document: `/docs/disaster-recovery/dr-plan.pdf`
  - RTO (Recovery Time Objective): [4 hours]
  - RPO (Recovery Point Objective): [15 minutes]

- [ ] **Disaster recovery tested**
  - Last test: [Date]
  - Success: ✅/❌
  - Documentation: `/docs/disaster-recovery/test-results-YYYY-MM-DD.pdf`

- [ ] **Emergency mode operations procedures** (manual operations during outage)
  - Documented: ✅/❌
  - File: `/docs/disaster-recovery/emergency-procedures.pdf`

**Verification:**
```bash
# Check DR plan exists and is recent
test -f docs/disaster-recovery/dr-plan.pdf && \
  find docs/disaster-recovery/dr-plan.pdf -mtime -365 && \
  echo "✅ DR plan exists and updated within 1 year" || \
  echo "❌ DR plan missing or outdated"
```

### Evaluation (§164.308(a)(8))

- [ ] **Periodic technical and non-technical evaluations**
  - Frequency: Quarterly
  - Last evaluation: [Date]
  - Next evaluation: [Date + 90 days]
  - Documentation: `/docs/security/quarterly-evaluations/`

- [ ] **Vulnerability scanning**
  - Tool: [Snyk / Trivy / etc.]
  - Frequency: Weekly (automated)
  - Critical vulnerabilities: [0]

- [ ] **Penetration testing**
  - Last test: [Date]
  - Firm: [Name]
  - Report: `/docs/security/penetration-tests/report-YYYY-MM.pdf`
  - Critical findings: [0]
  - Next test: [Date + 12 months]

**Verification:**
```bash
# Check evaluation documentation
ls -lt docs/security/quarterly-evaluations/ | head -5

# Run vulnerability scan
npm audit --production
# Should report 0 critical/high vulnerabilities
```

### Business Associate Agreement (§164.308(b)(1))

- [ ] **BAA signed with AWS**
  - Signed date: [Date]
  - Document: `/docs/legal/aws-baa-signed.pdf`
  - Expiration: [Date]

- [ ] **BAA covers all services:**
  - [ ] Amazon RDS
  - [ ] Amazon ElastiCache
  - [ ] Amazon S3
  - [ ] Amazon EKS
  - [ ] AWS CloudTrail
  - [ ] Amazon SES
  - [ ] Amazon SNS

- [ ] **BAA with customers** (template provided to customers)
  - Template: `/docs/legal/customer-baa-template.pdf`
  - Signed BAAs: `/docs/legal/customer-baas/`

- [ ] **No PHI sent to non-BAA services**
  - Verified: ✅/❌
  - Audit: Review code for third-party API calls

**Verification:**
```bash
# Check BAA documents exist
test -f docs/legal/aws-baa-signed.pdf && echo "✅ AWS BAA signed" || echo "❌ AWS BAA missing"

# Search code for third-party API calls (manual review)
grep -r "fetch(" packages/api/src/ | grep -v "aws-sdk"
grep -r "axios" packages/api/src/ | grep -v "aws-sdk"
```

---

## Physical Safeguards

### Facility Access Controls (§164.310(a)(1))

**Note:** Physical safeguards delegated to AWS (covered under BAA)

- [ ] **AWS data center certifications verified**
  - SOC 2 Type II: ✅
  - HIPAA compliance: ✅
  - Documentation: AWS Artifact

- [ ] **Developer workstation security policy**
  - Full disk encryption required: ✅/❌
  - Auto-lock after 5 minutes: ✅/❌
  - Policy document: `/docs/policies/workstation-security.pdf`

**Verification:**
```bash
# Verify workstation compliance (manual checklist)
# - All developers have full disk encryption enabled
# - Auto-lock configured
# - Antivirus installed and updated
```

### Workstation Security (§164.310(b))

- [ ] **Workstation use policy documented**
  - No PHI on local devices
  - VPN required for remote access
  - Policy: `/docs/policies/workstation-use.pdf`

- [ ] **Workstation compliance checks**
  - Tool: [MDM solution name]
  - Frequency: Daily (automated)

### Device and Media Controls (§164.310(d)(1))

- [ ] **Media disposal procedures documented**
  - Hard drive destruction: Certified shredding service
  - Vendor: [Name]
  - Policy: `/docs/policies/media-disposal.pdf`

- [ ] **Data disposal logs maintained**
  - Location: `/docs/disposal-logs/`

- [ ] **Media accountability** (track physical media with PHI)
  - Not applicable (cloud-only) ✅

---

## Technical Safeguards

### Access Control (§164.312(a)(1))

#### Unique User Identification

- [ ] **Every user has unique identifier**
  - Verified in database schema: ✅/❌
  - No shared accounts: ✅/❌

**Verification:**
```sql
-- Check for duplicate user IDs (should be 0)
SELECT user_id, COUNT(*)
FROM app_user
GROUP BY user_id
HAVING COUNT(*) > 1;
```

#### Emergency Access Procedure

- [ ] **Break-glass procedure documented** (emergency access to systems)
  - Document: `/docs/procedures/emergency-access.pdf`
  - Process: Temporary elevated privileges with approval + audit

- [ ] **Emergency access tested**
  - Last test: [Date]
  - Success: ✅/❌

#### Automatic Logoff

- [ ] **Session timeout implemented**
  - Access token expiry: 15 minutes ✅/❌
  - Refresh token expiry: 24 hours ✅/❌
  - Verified in code: ✅/❌

**Verification:**
```typescript
// Check token expiry in code
// File: packages/api/src/services/tokens.ts
// Access token: expiresIn: '15m'
// Refresh token: expiresIn: '24h'
```

#### Encryption and Decryption

- [ ] **Data at rest encryption**
  - [ ] RDS: ✅ (KMS encrypted)
  - [ ] S3: ✅ (KMS encrypted)
  - [ ] ElastiCache: ✅ (KMS encrypted)
  - [ ] EKS secrets: ✅ (KMS encrypted)

- [ ] **Data in transit encryption**
  - [ ] HTTPS/TLS 1.2+: ✅
  - [ ] Database connections (SSL): ✅
  - [ ] Redis connections (TLS): ✅
  - [ ] Internal service mesh (mTLS): ✅/❌

- [ ] **Application-level encryption for PHI**
  - [ ] Message text encrypted: ✅/❌
  - [ ] KMS key rotation enabled: ✅/❌

**Verification:**
```bash
# Verify RDS encryption
aws rds describe-db-instances --db-instance-identifier chatsdk-postgres-prod \
  --query 'DBInstances[0].StorageEncrypted'
# Should return true

# Verify S3 encryption
aws s3api get-bucket-encryption --bucket chatsdk-uploads-prod
# Should show KMS encryption

# Test TLS enforcement
curl -I http://api.chatsdk.com
# Should redirect to HTTPS

# Verify database SSL
psql $DATABASE_URL -c "SHOW ssl;"
# Should return 'on'
```

### Audit Controls (§164.312(b))

- [ ] **Audit logging implemented**
  - [ ] Authentication events logged: ✅/❌
  - [ ] Data access logged: ✅/❌
  - [ ] Administrative actions logged: ✅/❌
  - [ ] Failed authorization logged: ✅/❌

- [ ] **Audit logs retained for 7 years**
  - Verified: ✅/❌
  - Partition by month: ✅/❌
  - S3 lifecycle policy: ✅/❌

- [ ] **Audit log reviews conducted**
  - Frequency: Weekly
  - Last review: [Date]
  - Process: Security team reviews suspicious activity
  - Documentation: `/docs/audit-reviews/`

- [ ] **CloudTrail enabled for all AWS activity**
  - Enabled: ✅/❌
  - Log file validation: ✅/❌ (tamper detection)
  - Multi-region: ✅/❌

**Verification:**
```sql
-- Check audit log count (should be growing)
SELECT COUNT(*) FROM audit_log;

-- Check oldest audit log (should be retained)
SELECT MIN(timestamp) FROM audit_log;

-- Verify all event categories logged
SELECT event_category, COUNT(*)
FROM audit_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY event_category;
-- Should include: authentication, authorization, data_access, data_modification, administrative, security
```

```bash
# Verify CloudTrail
aws cloudtrail get-trail-status --name chatsdk-audit
# IsLogging should be true

# Verify log file validation
aws cloudtrail describe-trails --trail-name-list chatsdk-audit \
  --query 'trailList[0].LogFileValidationEnabled'
# Should return true
```

### Integrity (§164.312(c)(1))

- [ ] **Data integrity controls implemented**
  - [ ] Database constraints (foreign keys, unique): ✅
  - [ ] Input validation (Zod schemas): ✅
  - [ ] Integrity hashing for messages: ✅/❌
  - [ ] Audit log hash chain: ✅/❌

- [ ] **Integrity verification**
  - Process: Daily cron job verifies hashes
  - Alerts: Send to security team if tampering detected

**Verification:**
```sql
-- Verify foreign key constraints exist
SELECT COUNT(*)
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';
-- Should be >0

-- Check for messages with invalid integrity hash (if implemented)
-- SELECT COUNT(*) FROM message WHERE integrity_hash IS NOT NULL AND verify_integrity(id) = FALSE;
```

### Person or Entity Authentication (§164.312(d))

- [ ] **Strong authentication implemented**
  - [ ] JWT tokens: ✅
  - [ ] MFA available: ✅/❌
  - [ ] MFA enforced for PHI apps: ✅/❌
  - [ ] Password complexity: ✅/❌
  - [ ] Account lockout after failed attempts: ✅/❌

**Verification:**
```sql
-- Check MFA adoption rate
SELECT
  COUNT(CASE WHEN mfa_enabled THEN 1 END) AS mfa_enabled,
  COUNT(*) AS total_users,
  ROUND(100.0 * COUNT(CASE WHEN mfa_enabled THEN 1 END) / COUNT(*), 2) AS mfa_percentage
FROM app_user;

-- Check apps requiring MFA
SELECT id, name, mfa_required
FROM app
WHERE mfa_required = TRUE;
```

### Transmission Security (§164.312(e)(1))

- [ ] **TLS 1.2+ enforced for all connections**
  - [ ] API endpoints: ✅
  - [ ] WebSocket connections: ✅
  - [ ] Admin panel: ✅

- [ ] **Email encryption (for notifications)**
  - [ ] AWS SES with TLS: ✅

- [ ] **SMS encryption**
  - [ ] AWS SNS: ✅ (encrypted in transit by AWS)

**Verification:**
```bash
# Test TLS version
nmap --script ssl-enum-ciphers -p 443 api.chatsdk.com
# Should show TLSv1.2 and TLSv1.3 only

# Test SSL Labs rating
curl -s "https://api.ssllabs.com/api/v3/analyze?host=api.chatsdk.com" | jq '.endpoints[0].grade'
# Should be 'A' or 'A+'
```

---

## Breach Notification Rule

### Breach Notification Procedures (§164.404-414)

- [ ] **Breach notification plan documented**
  - Document: `/docs/hipaa-compliance/04-implementation-roadmap.md#week-9-documentation--incident-response`

- [ ] **Breach notification contacts:**
  - [ ] HHS Office for Civil Rights: Contact info saved
  - [ ] Media contacts (for breaches ≥500): List prepared
  - [ ] Legal counsel: [Name/Firm]

- [ ] **Breach notification templates prepared:**
  - [ ] Individual notification email: ✅/❌
  - [ ] Media notice: ✅/❌
  - [ ] HHS notification form: ✅/❌

- [ ] **Breach detection monitoring**
  - [ ] GuardDuty alerts configured: ✅/❌
  - [ ] CloudWatch alarms: ✅/❌
  - [ ] Log anomaly detection: ✅/❌

**Verification:**
```bash
# Check GuardDuty enabled
aws guardduty list-detectors
# Should return detector ID

# Check CloudWatch alarms
aws cloudwatch describe-alarms --alarm-name-prefix chatsdk-security
# Should show security alarms

# Verify breach notification templates exist
ls -l docs/templates/breach-notification-*
```

---

## Documentation and Policies

### Required Documentation

- [ ] **Privacy Notice (Notice of Privacy Practices)**
  - Location: `/docs/legal/privacy-notice.pdf`
  - Published on website: ✅/❌
  - URL: https://chatsdk.com/privacy

- [ ] **HIPAA Policies and Procedures Manual**
  - Location: `/docs/policies/hipaa-manual.pdf`
  - Last updated: [Date]
  - Reviewed by legal: ✅/❌

- [ ] **Policy documents:**
  - [ ] Access Control Policy
  - [ ] Audit Log Policy
  - [ ] Backup and Recovery Policy
  - [ ] Breach Notification Policy
  - [ ] Data Retention Policy
  - [ ] Encryption Policy
  - [ ] Incident Response Policy
  - [ ] Password Policy
  - [ ] Remote Access Policy
  - [ ] Sanction Policy
  - [ ] Workstation Security Policy

**Verification:**
```bash
# Check all policy documents exist
for policy in access-control audit-log backup-recovery breach-notification data-retention encryption incident-response password remote-access sanction workstation-security; do
  test -f "docs/policies/${policy}-policy.pdf" && echo "✅ ${policy}" || echo "❌ ${policy} missing"
done
```

---

## External Validation

### Security Assessment

- [ ] **HIPAA security assessment completed**
  - Date: [Date]
  - Firm: [Name]
  - Report: `/docs/assessments/hipaa-assessment-YYYY-MM.pdf`
  - Findings:
    - Critical: [0]
    - High: [0]
    - Medium: [X]
    - Low: [X]
  - All critical/high remediated: ✅/❌

### Penetration Testing

- [ ] **Penetration testing completed**
  - Date: [Date]
  - Firm: [Name]
  - Scope: Web app, API, infrastructure
  - Report: `/docs/assessments/pentest-report-YYYY-MM.pdf`
  - Findings:
    - Critical: [0]
    - High: [0]
    - Medium: [X]
    - Low: [X]
  - All critical/high remediated: ✅/❌

---

## Compliance Status Summary

### Overall Compliance Score

**Administrative Safeguards:** [___%] (Target: 100%)
**Physical Safeguards:** [___%] (Target: 100%)
**Technical Safeguards:** [___%] (Target: 100%)
**Breach Notification:** [___%] (Target: 100%)
**Documentation:** [___%] (Target: 100%)

**OVERALL COMPLIANCE:** [___%] / 100%

### Launch Readiness

**Ready for Production:** ✅/❌

**Conditions for launch:**
- [ ] Overall compliance ≥ 98%
- [ ] All critical findings remediated
- [ ] AWS BAA signed
- [ ] Security assessment passed
- [ ] Penetration testing passed
- [ ] Backup restoration tested
- [ ] Incident response drill conducted
- [ ] All workforce HIPAA trained

### Sign-Off

**Security Officer:**
- Name: [Name]
- Signature: __________________
- Date: [Date]

**Legal Counsel:**
- Name: [Name]
- Signature: __________________
- Date: [Date]

**Chief Technology Officer:**
- Name: [Name]
- Signature: __________________
- Date: [Date]

**Chief Executive Officer:**
- Name: [Name]
- Signature: __________________
- Date: [Date]

---

## Automated Compliance Monitoring

### Daily Checks

```bash
#!/bin/bash
# daily-compliance-check.sh

echo "=== Daily HIPAA Compliance Check ==="
echo "Date: $(date)"

# Check CloudTrail status
echo -n "CloudTrail logging: "
aws cloudtrail get-trail-status --name chatsdk-audit --query 'IsLogging' --output text

# Check GuardDuty
echo -n "GuardDuty enabled: "
aws guardduty list-detectors --query 'DetectorIds[0]' --output text

# Check RDS encryption
echo -n "RDS encryption: "
aws rds describe-db-instances --db-instance-identifier chatsdk-postgres-prod \
  --query 'DBInstances[0].StorageEncrypted' --output text

# Check S3 encryption
echo -n "S3 encryption: "
aws s3api get-bucket-encryption --bucket chatsdk-uploads-prod \
  --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text

# Check backup retention
echo -n "RDS backup retention (days): "
aws rds describe-db-instances --db-instance-identifier chatsdk-postgres-prod \
  --query 'DBInstances[0].BackupRetentionPeriod' --output text

# Check audit log count today
echo -n "Audit logs today: "
psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM audit_log WHERE timestamp > CURRENT_DATE;"

# Check for failed login attempts (>5 = alert)
echo -n "Failed login attempts today: "
psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM audit_log WHERE event_type = 'auth.login_failed' AND timestamp > CURRENT_DATE;"

# Check for critical vulnerabilities
echo "Critical npm vulnerabilities:"
npm audit --production --audit-level=critical

echo "=== Check Complete ==="
```

**Schedule:** Run daily via cron

```bash
# Add to crontab
0 8 * * * /path/to/daily-compliance-check.sh > /var/log/compliance-check.log 2>&1
```

### Alerting

Configure CloudWatch alerts for:
- [ ] Failed login attempts > 5 in 15 minutes
- [ ] GuardDuty high-severity finding
- [ ] RDS backup failure
- [ ] S3 replication failure
- [ ] CloudTrail logging stopped
- [ ] API error rate > 1%

---

## Review and Maintenance

### Quarterly Review

- [ ] Review all policies (quarterly)
- [ ] Review access permissions (quarterly)
- [ ] Review audit logs (weekly)
- [ ] Update risk assessment (annually)
- [ ] Renew certifications (as needed)
- [ ] Test disaster recovery (quarterly)
- [ ] Conduct security drill (quarterly)
- [ ] Review and update this checklist (quarterly)

**Next review date:** [Date + 90 days]

---

## Additional Resources

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [HIPAA Breach Notification Rule](https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html)
- [AWS HIPAA Compliance Whitepaper](https://d1.awsstatic.com/whitepapers/compliance/AWS_HIPAA_Compliance_Whitepaper.pdf)
- [HHS Office for Civil Rights](https://www.hhs.gov/ocr/index.html)

---

**Document Control:**
- Version: 1.0
- Created: 2026-01-09
- Last Updated: 2026-01-09
- Next Review: 2026-04-09
- Owner: Security Officer
