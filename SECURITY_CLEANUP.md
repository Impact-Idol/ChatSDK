# Security Cleanup Checklist

**Date:** January 10, 2026
**Status:** ⚠️ SENSITIVE DATA FOUND - DO NOT MAKE PUBLIC YET

---

## 🚨 Sensitive Files Found in Git History

### Files with Real Credentials:

1. **`.env.shared`**
   - Contains: DB_PASSWORD, S3_ACCESS_KEY
   - Risk: Database and S3 access
   - Action: REMOVE and rotate credentials

2. **`examples/react-chat/.env.production`**
   - Contains: VITE_API_KEY (looks real)
   - Risk: API access
   - Action: REMOVE and regenerate API key

---

## 🔒 Cleanup Steps

### Step 1: Add to .gitignore (Prevent Future Leaks)

```bash
# Add these to .gitignore
echo ".env.shared" >> .gitignore
echo "examples/react-chat/.env.production" >> .gitignore
echo "**/.env.production" >> .gitignore
echo "**/.env.local" >> .gitignore
```

### Step 2: Remove from Git (Current Commit)

```bash
# Remove from current commit
git rm --cached .env.shared
git rm --cached examples/react-chat/.env.production
git commit -m "security: Remove sensitive env files"
```

### Step 3: Clean Git History (Remove from ALL Commits)

**⚠️ WARNING:** This rewrites history!

```bash
# Install BFG Repo-Cleaner (easier than filter-branch)
brew install bfg

# Remove files from entire history
bfg --delete-files .env.shared
bfg --delete-files .env.production

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (ONLY if repo is private!)
# git push origin --force --all
```

### Step 4: Rotate ALL Secrets

**Critical:** Assume all secrets in those files are compromised!

#### Database Password
```bash
# Connect to your database
psql -U postgres

# Change password
ALTER USER chatsdk WITH PASSWORD 'new-secure-password-here';
```

#### S3/MinIO Access Keys
```bash
# Generate new MinIO access keys
# Update your MinIO configuration
```

#### API Keys
```bash
# Regenerate API key
openssl rand -hex 32

# Update in your production environment
```

#### JWT Secrets
```bash
# Generate new JWT secret
openssl rand -base64 32

# Update in production
```

---

## 🔍 Additional Security Checks

### Check for Other Sensitive Data

```bash
# Scan for common patterns
git grep -i "password\|secret\|api.key\|token" -- '*.env*'

# Check for private keys
find . -name "*.pem" -o -name "*.key" -o -name "*.p12"

# Check for certificates
find . -name "*.crt" -o -name "*.cer"
```

### Review All .env Files

```bash
# List all .env files
find . -name ".env*" -type f

# Check each one manually
```

---

## 📋 Safe Files to Keep in Git

These are OK (just templates/examples):
- ✅ `.env.example`
- ✅ `.env.production.example`
- ✅ `.env.production.minimal` (has placeholders only)
- ✅ `docker/.env.example`
- ✅ `packages/api/.env.example`

---

## 🎯 Before Making Repo Public

### Pre-Launch Security Checklist

- [ ] Remove `.env.shared` from git
- [ ] Remove `examples/react-chat/.env.production` from git
- [ ] Clean git history (BFG or filter-branch)
- [ ] Rotate database password
- [ ] Regenerate S3/MinIO access keys
- [ ] Regenerate all API keys
- [ ] Generate new JWT secrets
- [ ] Update `.gitignore` to prevent future leaks
- [ ] Scan entire repo for other sensitive data
- [ ] Review all markdown files for internal URLs/IPs
- [ ] Check for personal email addresses
- [ ] Remove any internal server hostnames
- [ ] Review beta-testing materials for real names
- [ ] Verify no real customer data in examples
- [ ] Run automated security scan (Trufflehog, GitGuardian)

---

## 🛠️ Recommended Tools

### Automated Secret Scanners

```bash
# Install Trufflehog
brew install trufflehog

# Scan repository
trufflehog filesystem .

# Install GitGuardian CLI
brew install gitguardian

# Scan for secrets
ggshield secret scan repo .
```

### GitHub Secret Scanning

If you push to GitHub, they automatically scan for:
- AWS credentials
- Azure credentials
- GitHub tokens
- Stripe keys
- And 200+ other secret types

---

## ⚠️ Current Risk Assessment

**Risk Level:** 🔴 HIGH

**Why:**
- Real credentials committed to git
- Repository exists on GitHub
- Git history contains secrets

**Recommendation:**
1. **DO NOT make repository public** until cleanup complete
2. **Rotate all secrets immediately** (assume compromised)
3. **Clean git history** before any public launch
4. **Enable GitHub secret scanning** when ready
5. **Set up pre-commit hooks** to prevent future leaks

---

## 🔐 Long-Term Security Best Practices

### For Production Deployments

1. **Use Secret Managers:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - 1Password Secrets Automation

2. **Environment Variables Only:**
   - Never commit `.env` files
   - Use CI/CD to inject secrets
   - Rotate secrets regularly

3. **Pre-Commit Hooks:**
   ```bash
   # Install pre-commit
   brew install pre-commit

   # Add secret detection
   # .pre-commit-config.yaml
   repos:
     - repo: https://github.com/Yelp/detect-secrets
       hooks:
         - id: detect-secrets
   ```

4. **GitHub Security Features:**
   - Enable Dependabot alerts
   - Enable Secret scanning
   - Enable Code scanning
   - Review security advisories

---

## 📞 Next Steps

1. **Immediate:** Review this checklist
2. **Today:** Remove sensitive files from git
3. **This week:** Rotate all secrets
4. **Before launch:** Clean git history
5. **Ongoing:** Set up automated scanning

---

## ✅ Sign-Off

Once all steps complete, document:

- [ ] Date cleaned: __________
- [ ] Secrets rotated: __________
- [ ] Git history cleaned: __________
- [ ] Security scan passed: __________
- [ ] Reviewed by: __________

**Only make repository public after ALL boxes checked!**

---

**Security Contact:** security@chatsdk.dev (update to real email)
**Last Updated:** January 10, 2026
