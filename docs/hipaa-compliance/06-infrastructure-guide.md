# HIPAA-Compliant Infrastructure Guide

**Document Date:** 2026-01-09
**Audience:** DevOps Engineers, System Administrators

## Overview

This guide provides step-by-step instructions for deploying ChatSDK on HIPAA-compliant infrastructure. We focus on AWS as the primary cloud provider, with notes for Azure and GCP alternatives.

**Timeline:** 2-4 weeks
**Prerequisites:** AWS account, domain name, basic Kubernetes knowledge

## AWS Infrastructure Setup

### Step 1: AWS Account Configuration (Day 1)

#### Create Dedicated AWS Account

```bash
# Use AWS Organizations for multi-account setup
aws organizations create-account \
  --email production@company.com \
  --account-name "ChatSDK Production" \
  --iam-user-access-to-billing ALLOW
```

**Why:** Isolate production HIPAA workloads from development/testing

#### Enable AWS Config

```bash
# Enable Config for compliance monitoring
aws configservice put-configuration-recorder \
  --configuration-recorder name=default,roleARN=arn:aws:iam::ACCOUNT:role/aws-config-role

aws configservice put-delivery-channel \
  --delivery-channel name=default,s3BucketName=chatsdk-config-logs

aws configservice start-configuration-recorder --configuration-recorder-name default
```

**Purpose:** Track resource configuration changes for compliance audits

#### Enable GuardDuty

```bash
# Enable GuardDuty for threat detection
aws guardduty create-detector --enable

# Configure findings export to S3
aws guardduty create-publishing-destination \
  --detector-id <detector-id> \
  --destination-type S3 \
  --destination-properties DestinationArn=arn:aws:s3:::chatsdk-security-findings
```

**Purpose:** Real-time threat detection and security monitoring

#### Enable CloudTrail

```bash
# Create audit log bucket
aws s3api create-bucket --bucket chatsdk-audit-logs --region us-east-1

# Enable versioning (HIPAA requirement)
aws s3api put-bucket-versioning \
  --bucket chatsdk-audit-logs \
  --versioning-configuration Status=Enabled

# Enable CloudTrail
aws cloudtrail create-trail \
  --name chatsdk-audit \
  --s3-bucket-name chatsdk-audit-logs \
  --include-global-service-events \
  --is-multi-region-trail \
  --enable-log-file-validation

# Start logging
aws cloudtrail start-logging --name chatsdk-audit
```

**Purpose:** Audit all API calls for compliance (7-year retention required)

### Step 2: Sign Business Associate Agreement (Days 2-5)

#### Request BAA from AWS

1. Navigate to AWS Artifact: https://aws.amazon.com/artifact/
2. Download "AWS Business Associate Addendum (BAA)"
3. Review with legal counsel
4. Upload signed BAA back to AWS Artifact
5. Wait for AWS counter-signature (typically 2-3 business days)

**Covered Services:**
- Amazon RDS (PostgreSQL)
- Amazon ElastiCache (Redis)
- Amazon S3
- Amazon EKS (Kubernetes)
- AWS CloudTrail
- Amazon SES (email)
- Amazon SNS (SMS)

**Not Covered (Do Not Use):**
- Amazon Lightsail
- AWS Amplify
- Amazon WorkMail (without BAA)

### Step 3: VPC and Networking (Day 6)

#### Create VPC with Terraform

```hcl
# terraform/vpc.tf

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "chatsdk-production"
    Environment = "production"
    HIPAA       = "true"
  }
}

# Public subnets (for load balancers)
resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name                                        = "chatsdk-public-${count.index + 1}"
    "kubernetes.io/role/elb"                   = "1"
    "kubernetes.io/cluster/chatsdk-production" = "shared"
  }
}

# Private subnets (for database, EKS nodes)
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                                        = "chatsdk-private-${count.index + 1}"
    "kubernetes.io/role/internal-elb"          = "1"
    "kubernetes.io/cluster/chatsdk-production" = "shared"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "chatsdk-igw"
  }
}

# NAT Gateways (one per AZ for HA)
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"

  tags = {
    Name = "chatsdk-nat-eip-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "chatsdk-nat-${count.index + 1}"
  }
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "chatsdk-public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "chatsdk-private-rt-${count.index + 1}"
  }
}

# Route table associations
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

**Apply:**

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Step 4: RDS PostgreSQL with Encryption (Day 7)

#### Create KMS Key for RDS Encryption

```hcl
# terraform/kms.tf

resource "aws_kms_key" "rds" {
  description             = "ChatSDK RDS encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name    = "chatsdk-rds-encryption"
    HIPAA   = "true"
    Purpose = "rds-encryption"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/chatsdk-rds"
  target_key_id = aws_kms_key.rds.key_id
}
```

#### Create RDS Instance

```hcl
# terraform/rds.tf

resource "aws_db_subnet_group" "main" {
  name       = "chatsdk-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "chatsdk-db-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name        = "chatsdk-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]  # Only from VPC
    description = "PostgreSQL from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "chatsdk-rds-sg"
  }
}

resource "aws_db_parameter_group" "postgres" {
  name   = "chatsdk-postgres16"
  family = "postgres16"

  parameter {
    name  = "ssl"
    value = "1"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"  # Log DDL statements for audit
  }

  tags = {
    Name = "chatsdk-postgres16-params"
  }
}

resource "aws_db_instance" "main" {
  identifier = "chatsdk-postgres-prod"

  # Engine
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = "db.r6g.xlarge"  # 4 vCPU, 32GB RAM

  # Storage
  allocated_storage     = 500
  max_allocated_storage = 2000  # Auto-scaling up to 2TB
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  # Database
  db_name  = "chatsdk"
  username = "chatsdk_admin"
  password = random_password.db_password.result

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  port                   = 5432

  # High Availability
  multi_az               = true
  availability_zone      = null  # Auto-select for multi-AZ

  # Backups (HIPAA requirement)
  backup_retention_period = 35  # 35 days
  backup_window           = "03:00-04:00"  # 3-4 AM UTC
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = 60  # Enhanced monitoring every 60 seconds
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  # Parameter group
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Deletion protection
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "chatsdk-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  copy_tags_to_snapshot     = true

  # Automatic minor version upgrades
  auto_minor_version_upgrade = true

  tags = {
    Name        = "chatsdk-postgres-prod"
    Environment = "production"
    HIPAA       = "true"
  }
}

# Generate secure password
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "chatsdk/postgres/password"
  recovery_window_in_days = 30

  tags = {
    Name = "chatsdk-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.db_password.result
    engine   = "postgres"
    host     = aws_db_instance.main.endpoint
    port     = 5432
    dbname   = aws_db_instance.main.db_name
  })
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "chatsdk-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

#### Create Read Replica (Optional, for scaling)

```hcl
resource "aws_db_instance" "read_replica" {
  identifier             = "chatsdk-postgres-replica"
  replicate_source_db    = aws_db_instance.main.identifier
  instance_class         = "db.r6g.xlarge"
  publicly_accessible    = false
  skip_final_snapshot    = true
  auto_minor_version_upgrade = false

  # Monitoring
  monitoring_interval      = 60
  monitoring_role_arn      = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true

  tags = {
    Name = "chatsdk-postgres-replica"
    Role = "read-replica"
  }
}
```

**Apply:**

```bash
terraform apply
```

**Expected Output:**

```
aws_db_instance.main: Creation complete after 15m
RDS Endpoint: chatsdk-postgres-prod.xxxxx.us-east-1.rds.amazonaws.com:5432
```

### Step 5: ElastiCache Redis (Day 8)

```hcl
# terraform/elasticache.tf

resource "aws_elasticache_subnet_group" "main" {
  name       = "chatsdk-redis-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "chatsdk-redis-subnet-group"
  }
}

resource "aws_security_group" "redis" {
  name        = "chatsdk-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "Redis from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "chatsdk-redis-sg"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "chatsdk-redis"
  replication_group_description = "Redis cluster for ChatSDK"

  # Engine
  engine         = "redis"
  engine_version = "7.1"
  node_type      = "cache.r6g.large"  # 2 vCPU, 13GB RAM

  # High Availability
  num_cache_clusters         = 3  # 1 primary + 2 replicas
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Networking
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  port               = 6379

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = true
  auth_token                 = random_password.redis_token.result
  kms_key_id                 = aws_kms_key.redis.arn

  # Backups
  snapshot_retention_limit = 7  # 7 days
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "mon:05:00-mon:06:00"

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = {
    Name        = "chatsdk-redis"
    Environment = "production"
    HIPAA       = "true"
  }
}

# KMS key for Redis encryption
resource "aws_kms_key" "redis" {
  description             = "ChatSDK Redis encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "chatsdk-redis-encryption"
  }
}

# Redis auth token
resource "random_password" "redis_token" {
  length  = 32
  special = false  # Redis auth token doesn't support special chars
}

# Store in Secrets Manager
resource "aws_secretsmanager_secret" "redis_token" {
  name = "chatsdk/redis/auth-token"
}

resource "aws_secretsmanager_secret_version" "redis_token" {
  secret_id     = aws_secretsmanager_secret.redis_token.id
  secret_string = random_password.redis_token.result
}

# CloudWatch log groups
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/chatsdk-redis/slow-log"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/chatsdk-redis/engine-log"
  retention_in_days = 30
}
```

### Step 6: S3 Buckets with Encryption (Day 9)

```hcl
# terraform/s3.tf

# KMS key for S3 encryption
resource "aws_kms_key" "s3" {
  description             = "ChatSDK S3 encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "chatsdk-s3-encryption"
  }
}

# Main bucket for file uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "chatsdk-uploads-prod-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "chatsdk-uploads"
    Environment = "production"
    HIPAA       = "true"
  }
}

# Versioning (HIPAA requirement)
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Encryption (HIPAA requirement)
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "intelligent-tiering"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "INTELLIGENT_TIERING"
    }

    transition {
      days          = 90
      storage_class = "GLACIER_INSTANT_RETRIEVAL"
    }

    expiration {
      days = 2555  # 7 years (HIPAA requirement)
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# CORS configuration
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["https://chatsdk.example.com"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Disaster recovery bucket (different region)
resource "aws_s3_bucket" "uploads_dr" {
  provider = aws.us-west-2  # Different region
  bucket   = "chatsdk-uploads-dr-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name    = "chatsdk-uploads-dr"
    Purpose = "disaster-recovery"
  }
}

resource "aws_s3_bucket_versioning" "uploads_dr" {
  provider = aws.us-west-2
  bucket   = aws_s3_bucket.uploads_dr.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Cross-region replication
resource "aws_s3_bucket_replication_configuration" "uploads_replication" {
  bucket = aws_s3_bucket.uploads.id
  role   = aws_iam_role.s3_replication.arn

  rule {
    id     = "disaster-recovery"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.uploads_dr.arn
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.s3_dr.arn
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }

    delete_marker_replication {
      status = "Enabled"
    }
  }
}

# IAM role for replication
resource "aws_iam_role" "s3_replication" {
  name = "chatsdk-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "s3.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "s3_replication" {
  role = aws_iam_role.s3_replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = aws_s3_bucket.uploads.arn
      },
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl"
        ]
        Effect = "Allow"
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete"
        ]
        Effect = "Allow"
        Resource = "${aws_s3_bucket.uploads_dr.arn}/*"
      },
      {
        Action = [
          "kms:Decrypt"
        ]
        Effect = "Allow"
        Resource = aws_kms_key.s3.arn
      },
      {
        Action = [
          "kms:Encrypt"
        ]
        Effect = "Allow"
        Resource = aws_kms_key.s3_dr.arn
      }
    ]
  })
}
```

### Step 7: EKS Cluster (Days 10-12)

```hcl
# terraform/eks.tf

resource "aws_eks_cluster" "main" {
  name     = "chatsdk-production"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]  # Restrict to your IPs in production
    security_group_ids      = [aws_security_group.eks_cluster.id]
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_resource_controller,
    aws_cloudwatch_log_group.eks,
  ]

  tags = {
    Name = "chatsdk-production"
    HIPAA = "true"
  }
}

# KMS key for EKS secrets encryption
resource "aws_kms_key" "eks" {
  description             = "ChatSDK EKS secrets encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# CloudWatch log group for EKS logs
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/chatsdk-production/cluster"
  retention_in_days = 30
}

# IAM role for EKS cluster
resource "aws_iam_role" "eks_cluster" {
  name = "chatsdk-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster.name
}

# Security group for EKS cluster
resource "aws_security_group" "eks_cluster" {
  name        = "chatsdk-eks-cluster-sg"
  description = "Security group for EKS cluster control plane"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "chatsdk-eks-cluster-sg"
  }
}

# EKS node group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "chatsdk-workers"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = aws_subnet.private[*].id

  instance_types = ["t3.xlarge"]

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 3
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    role = "worker"
  }

  tags = {
    Name = "chatsdk-eks-workers"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]
}

# IAM role for EKS nodes
resource "aws_iam_role" "eks_node" {
  name = "chatsdk-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node.name
}

# Output
output "eks_cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "eks_cluster_name" {
  value = aws_eks_cluster.main.name
}
```

**Apply and Configure kubectl:**

```bash
terraform apply

# Configure kubectl
aws eks update-kubeconfig --name chatsdk-production --region us-east-1

# Verify connection
kubectl get nodes
```

### Step 8: Deploy ChatSDK to EKS (Days 13-14)

Full deployment manifests are in [/Users/pushkar/Downloads/ChatSDK/docs/production/deployment/kubernetes-production.md](../production/deployment/kubernetes-production.md)

**Quick Start:**

```bash
# Create namespace
kubectl create namespace chatsdk-prod

# Create secrets
kubectl create secret generic chatsdk-secrets \
  --from-literal=DATABASE_URL="postgresql://user:pass@rds-endpoint:5432/chatsdk" \
  --from-literal=REDIS_URL="redis://elasticache-endpoint:6379" \
  --from-literal=JWT_SECRET="your-secret-key" \
  --from-literal=CENTRIFUGO_SECRET="your-centrifugo-secret" \
  -n chatsdk-prod

# Deploy application
kubectl apply -f kubernetes/ -n chatsdk-prod

# Check status
kubectl get pods -n chatsdk-prod
kubectl get services -n chatsdk-prod
```

## Azure Alternative

For Azure deployments with BAA:

```hcl
# Azure Kubernetes Service (AKS)
resource "azurerm_kubernetes_cluster" "main" {
  name                = "chatsdk-production"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "chatsdk"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D4s_v3"
  }

  identity {
    type = "SystemAssigned"
  }
}

# Azure Database for PostgreSQL
resource "azurerm_postgresql_flexible_server" "main" {
  name                = "chatsdk-postgres"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  sku_name   = "GP_Standard_D4s_v3"
  storage_mb = 524288  # 512 GB

  version = "16"

  backup_retention_days        = 35
  geo_redundant_backup_enabled = true

  # Encryption
  customer_managed_key {
    key_vault_key_id = azurerm_key_vault_key.postgres.id
  }
}
```

## GCP Alternative

For GCP deployments with BAA:

```hcl
# Google Kubernetes Engine (GKE)
resource "google_container_cluster" "main" {
  name     = "chatsdk-production"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.gke.id
  }
}

# Cloud SQL for PostgreSQL
resource "google_sql_database_instance" "main" {
  name             = "chatsdk-postgres"
  database_version = "POSTGRES_16"
  region           = "us-central1"

  settings {
    tier = "db-custom-4-16384"  # 4 vCPU, 16 GB RAM

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    database_flags {
      name  = "cloudsql.enable_pgaudit"
      value = "on"
    }
  }

  encryption_key_name = google_kms_crypto_key.sql.id
}
```

## Verification Checklist

After infrastructure deployment, verify HIPAA compliance:

- [ ] AWS BAA signed and stored
- [ ] RDS encryption at rest enabled (`SHOW data_encryption;` returns `on`)
- [ ] RDS automated backups configured (35 days)
- [ ] RDS SSL/TLS enforced (`SHOW ssl;` returns `on`)
- [ ] S3 encryption at rest enabled (all buckets)
- [ ] S3 versioning enabled
- [ ] S3 cross-region replication working
- [ ] CloudTrail logging all API calls
- [ ] GuardDuty threat detection enabled
- [ ] ElastiCache Redis encryption in-transit enabled
- [ ] ElastiCache Redis authentication enabled
- [ ] EKS secrets encryption enabled
- [ ] All resources tagged with `HIPAA: true`

**Audit Command:**

```bash
# Check encryption status
aws rds describe-db-instances --db-instance-identifier chatsdk-postgres-prod \
  --query 'DBInstances[0].StorageEncrypted'

aws s3api get-bucket-encryption --bucket chatsdk-uploads-prod-ACCOUNT

aws elasticache describe-replication-groups --replication-group-id chatsdk-redis \
  --query 'ReplicationGroups[0].AtRestEncryptionEnabled'

# Check CloudTrail logging
aws cloudtrail get-trail-status --name chatsdk-audit
```

## Cost Summary

| Component | Specification | Monthly Cost |
|-----------|--------------|--------------|
| EKS Control Plane | Managed | $73 |
| Worker Nodes | 3× t3.xlarge | $450 |
| RDS PostgreSQL | db.r6g.xlarge (multi-AZ) | $690 |
| ElastiCache Redis | cache.r6g.large (cluster) | $360 |
| S3 Storage | 1TB + replication | $114 |
| CloudTrail | Audit logging | $5 |
| GuardDuty | Threat detection | $5 |
| **Total** | | **~$1,697/month** |

## Next Steps

1. Complete [Security Hardening](07-security-hardening.md)
2. Run [Compliance Checklist](08-compliance-checklist.md)
3. Schedule external security assessment
4. Document disaster recovery procedures
5. Conduct backup restoration test
