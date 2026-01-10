# HIPAA Compliance

Deploy ChatSDK in a HIPAA-compliant manner for healthcare applications (telehealth, patient chat, etc.).

## Overview

HIPAA (Health Insurance Portability and Accountability Act) requires specific security controls for Protected Health Information (PHI).

**ChatSDK HIPAA Features:**
- ✅ End-to-end encryption
- ✅ Audit logging
- ✅ Access controls
- ✅ Data retention policies
- ✅ BAA (Business Associate Agreement) support

## Enable HIPAA Mode

```typescript
const sdk = await ChatSDK.connect({
  apiUrl: '...',
  userId: '...',
  
  hipaa: {
    enabled: true,
    encryption: 'e2ee', // End-to-end encryption
    auditLog: true,
    dataRetention: 7 * 365, // 7 years (HIPAA requirement)
  },
});
```

## End-to-End Encryption

```typescript
// Messages are encrypted on client, decrypted on client
// Server never sees plaintext

await sdk.sendMessage({
  channelId: 'patient-dr-smith',
  text: 'My symptoms include...', // Encrypted before sending
  encrypted: true,
});
```

## Audit Logging

All PHI access is logged:

```typescript
// Automatically logged:
// - Who accessed what message
// - When it was accessed
// - From what IP address
// - What action was taken (read, edit, delete)

const auditLogs = await sdk.getAuditLogs({
  userId: 'user-123',
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
});
```

## Access Controls

```typescript
// Role-based access for healthcare teams
await sdk.assignRole({
  userId: 'dr-smith',
  role: 'provider', // Custom healthcare role
  permissions: [
    'messages.read_phi',
    'messages.write_phi',
    'patients.view',
  ],
});

// Patient can only see their own data
await sdk.assignRole({
  userId: 'patient-123',
  role: 'patient',
  permissions: [
    'messages.read_own',
    'messages.write_own',
  ],
});
```

## Data Retention

```typescript
// Auto-delete messages after retention period
await sdk.configureRetention({
  channelId: 'patient-channel',
  retentionDays: 2555, // 7 years
  archiveBeforeDelete: true, // Archive to compliant storage
});
```

## BAA Requirements

Before using ChatSDK for PHI:

1. **Sign BAA** - Contact sales@chatsdk.dev
2. **Enable encryption** - Set `hipaa.encryption: 'e2ee'`
3. **Configure audit logging** - Set `hipaa.auditLog: true`
4. **Set data retention** - Configure appropriate retention period
5. **Implement access controls** - Use role-based permissions
6. **Enable secure transport** - HTTPS/WSS only

## Infrastructure

### Hosting

Use HIPAA-compliant hosting:
- AWS (with BAA)
- Google Cloud (with BAA)
- Azure (with BAA)
- Self-hosted with proper security controls

### Database Encryption

```bash
# PostgreSQL: Enable encryption at rest
ALTER DATABASE chatsdk_hipaa SET encryption = on;

# AWS RDS: Enable encryption
aws rds modify-db-instance \
  --db-instance-identifier chatsdk-hipaa \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:...
```

### Backup Encryption

```bash
# Encrypted backups
pg_dump chatsdk_hipaa \
  | gpg --encrypt --recipient backup@yourdomain.com \
  | aws s3 cp - s3://hipaa-backups/backup-$(date +%Y%m%d).sql.gpg
```

## Compliance Checklist

Technical Requirements:
- [ ] End-to-end encryption enabled
- [ ] Audit logging enabled
- [ ] Access controls implemented
- [ ] Data retention configured
- [ ] Database encryption at rest
- [ ] Transport encryption (HTTPS/WSS)
- [ ] Encrypted backups
- [ ] MFA for admin access
- [ ] IP whitelisting (if applicable)
- [ ] Secure password requirements

Administrative Requirements:
- [ ] BAA signed with ChatSDK
- [ ] BAA signed with hosting provider
- [ ] Security policies documented
- [ ] Incident response plan
- [ ] Employee training on HIPAA
- [ ] Risk assessment completed
- [ ] Breach notification procedures
- [ ] Regular security audits

---

## Example: Telehealth Chat

```typescript
// Patient-Provider secure chat
const sdk = await ChatSDK.connect({
  apiUrl: 'https://hipaa-compliant-api.com',
  userId: 'dr-smith',
  
  hipaa: {
    enabled: true,
    encryption: 'e2ee',
    auditLog: true,
  },
});

// Create patient channel
const channel = await sdk.createChannel({
  name: 'Patient: John Doe',
  type: 'private',
  members: ['dr-smith', 'patient-john-doe'],
  hipaa: true, // Marks as PHI channel
});

// Send message
await sdk.sendMessage({
  channelId: channel.id,
  text: 'Your lab results show...',
  encrypted: true,
});
```

---

## Next Steps

- **[Security →](./security.md)** - Additional security best practices
- **[Deployment →](./deployment.md)** - Production deployment
- **Contact Sales** - BAA and HIPAA setup: sales@chatsdk.dev
