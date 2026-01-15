# HIPAA & Enterprise Deployment

Deploy ChatSDK in regulated environments including healthcare (HIPAA), finance, and enterprise.

## Overview

ChatSDK provides a solid foundation for compliance. HIPAA compliance is achieved through **your deployment configuration**, not SDK code changes.

### What ChatSDK Provides

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-tenant isolation | Built-in | Data scoped by `app_id` |
| JWT authentication | Built-in | Role-based access control |
| TLS encryption in transit | Built-in | HTTPS/WSS required |
| Structured audit logging | Built-in | Pino logger with JSON output |
| Message persistence | Built-in | PostgreSQL with full history |
| Real-time sync | Built-in | Centrifugo WebSocket server |

### What You Configure

| Requirement | Your Responsibility |
|-------------|---------------------|
| Encryption at rest | Enable on your database (RDS, Cloud SQL) |
| BAA with cloud provider | Sign with AWS/GCP/Azure |
| Backup & disaster recovery | Configure in your infrastructure |
| Data retention policies | Implement via scheduled jobs |
| Access logging to SIEM | Export Pino logs to your SIEM |
| Network security | VPC, firewalls, IP allowlisting |

## Deployment Architecture

### Recommended HIPAA Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Your VPC / Private Network            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │   Load       │    │   ChatSDK    │    │ Centrifugo│  │
│  │   Balancer   │───▶│   API        │───▶│ WebSocket │  │
│  │   (HTTPS)    │    │   Servers    │    │ Server    │  │
│  └──────────────┘    └──────────────┘    └───────────┘  │
│                             │                            │
│                             ▼                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │          PostgreSQL (Encryption at Rest)          │   │
│  │          + Automated Backups + Point-in-Time      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │   Redis      │    │   S3/Blob    │                   │
│  │   (TLS)      │    │   (Encrypted)│                   │
│  └──────────────┘    └──────────────┘                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Cloud Provider Setup

### AWS (Recommended)

1. **Sign AWS BAA** via AWS Artifact console

2. **Enable RDS encryption:**
```bash
aws rds create-db-instance \
  --db-instance-identifier chatsdk-hipaa \
  --storage-encrypted \
  --kms-key-id alias/aws/rds \
  --engine postgres \
  --engine-version 15 \
  --db-instance-class db.r6g.large
```

3. **Enable automated backups:**
```bash
aws rds modify-db-instance \
  --db-instance-identifier chatsdk-hipaa \
  --backup-retention-period 35 \
  --preferred-backup-window "03:00-04:00"
```

4. **Enable CloudTrail logging:**
```bash
aws cloudtrail create-trail \
  --name chatsdk-audit \
  --s3-bucket-name your-audit-logs \
  --is-multi-region-trail \
  --enable-log-file-validation
```

### Google Cloud

1. **Sign Google Cloud BAA** via Cloud Console

2. **Enable Cloud SQL encryption** (default on)

3. **Configure automated backups:**
```bash
gcloud sql instances patch chatsdk-hipaa \
  --backup-start-time 03:00 \
  --enable-bin-log \
  --retained-backups-count 35
```

### Azure

1. **Sign Azure BAA** via Trust Center

2. **Enable Azure Database encryption** (default on)

3. **Configure geo-redundant backups** in portal

## Security Configuration

### Environment Variables

```bash
# Required for HIPAA
NODE_ENV=production
LOG_LEVEL=info

# Database with SSL
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require

# Force HTTPS
FORCE_HTTPS=true
SECURE_COOKIES=true

# Session security
SESSION_TIMEOUT_MINUTES=15
REQUIRE_MFA=true  # If implementing MFA
```

### Audit Logging

ChatSDK uses Pino for structured logging. Export to your SIEM:

```typescript
// All API calls are logged with:
{
  "level": "info",
  "time": 1704067200000,
  "msg": "API request",
  "req": {
    "method": "POST",
    "url": "/api/messages",
    "userId": "user-123",
    "ip": "10.0.1.50"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 45
}
```

**Export to AWS CloudWatch:**
```bash
# Install CloudWatch agent, configure to ship logs
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/cloudwatch-config.json
```

**Export to Splunk/Datadog:**
```bash
# Use Pino transports
npm install pino-datadog
node app.js | pino-datadog --key YOUR_API_KEY
```

### Network Security

```bash
# Kubernetes NetworkPolicy example
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: chatsdk-api
spec:
  podSelector:
    matchLabels:
      app: chatsdk-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: ingress-nginx
      ports:
        - port: 5501
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
```

## Data Retention

Implement retention policies for HIPAA (typically 6-7 years):

```sql
-- Create retention policy function
CREATE OR REPLACE FUNCTION enforce_retention()
RETURNS void AS $$
BEGIN
  -- Archive messages older than retention period
  INSERT INTO archived_messages
  SELECT * FROM messages
  WHERE created_at < NOW() - INTERVAL '7 years';

  -- Delete from active table
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '7 years';

  -- Log the operation
  INSERT INTO audit_log (action, details, created_at)
  VALUES ('retention_cleanup',
          json_build_object('deleted_before', NOW() - INTERVAL '7 years'),
          NOW());
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule('retention-cleanup', '0 2 * * 0', 'SELECT enforce_retention()');
```

## Compliance Checklist

### Technical Controls

- [ ] **Encryption in transit** - TLS 1.2+ for all connections
- [ ] **Encryption at rest** - Database and blob storage encrypted
- [ ] **Access controls** - JWT auth with role-based permissions
- [ ] **Audit logging** - All access logged and exported to SIEM
- [ ] **Automated backups** - Daily backups with 35+ day retention
- [ ] **Disaster recovery** - Cross-region replication configured
- [ ] **Network isolation** - VPC with security groups/firewall rules
- [ ] **Vulnerability scanning** - Regular scans of infrastructure

### Administrative Controls

- [ ] **BAA signed** - With cloud provider (AWS/GCP/Azure)
- [ ] **Security policies** - Documented and reviewed annually
- [ ] **Incident response** - Plan documented and tested
- [ ] **Access reviews** - Quarterly review of user access
- [ ] **Training** - Staff trained on HIPAA requirements
- [ ] **Risk assessment** - Annual security risk assessment

### Physical Controls (Cloud Provider)

- [ ] **Data center security** - Covered by cloud provider BAA
- [ ] **Media disposal** - Covered by cloud provider BAA

## Self-Hosted Considerations

If self-hosting instead of cloud:

1. **Physical security** - Secure data center access
2. **Hardware encryption** - Use TPM or self-encrypting drives
3. **Network security** - Firewall, IDS/IPS, VPN
4. **Backup offsite** - Encrypted backups to separate location
5. **Document everything** - You're responsible for all controls

## Cost Estimate

| Component | Monthly Cost |
|-----------|-------------|
| AWS RDS (db.r6g.large, encrypted) | $200-400 |
| EC2 instances (2x m6i.large) | $150-300 |
| Application Load Balancer | $20-50 |
| S3 (encrypted, with versioning) | $20-100 |
| CloudWatch Logs | $50-100 |
| CloudTrail | $2-10 |
| **Total** | **$450-1,000/mo** |

*Costs vary by region and usage. Enterprise support adds ~20%.*

## Next Steps

1. **[Deployment Guide](./deployment.md)** - Production deployment walkthrough
2. **[Security Best Practices](./security.md)** - Additional hardening
3. **[Performance Tuning](./performance.md)** - Scale for enterprise load

## Enterprise Support

Need help with HIPAA deployment?

- **GitHub Discussions** - Community support
- **GitHub Issues** - Bug reports and feature requests

---

*ChatSDK is open source software. Compliance is your responsibility based on your deployment configuration and operational practices.*
