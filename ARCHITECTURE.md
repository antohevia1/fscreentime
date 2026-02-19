# Screen Time Dashboard - Scalable Architecture

## Scale Requirements
- 5 million customers
- 1 file per customer per day = 5M files/day
- 30% daily active users = 1.5M dashboard views/day
- 100% weekly active users = 5M dashboard views/week

## Architecture Overview

### Data Flow
1. Customer uploads file → Presigned S3 URL (direct upload)
2. S3 trigger → Lambda processes file → Parquet format
3. Store in processed bucket with partitioning
4. Update DynamoDB metadata index
5. Dashboard queries → Check cache → Fetch from S3 → Return data

### Storage Strategy

#### Raw Data Bucket
- Lifecycle: Delete after 30 days (after processing)
- Encryption: S3 SSE-S3 (AES256)
- Versioning: Enabled
- Purpose: Temporary storage for uploaded files

#### Processed Data Bucket
- Format: Parquet with GZIP compression + Dictionary encoding
- Compression ratio: 15-30x smaller than JSON (GZIP > Snappy for long-term storage)
- Partitioning: `processed/{customerId}/{date}/aggregated.parquet`
- Lifecycle (Multi-year retention):
  - 0-90 days: S3 Standard (hot data, frequent access)
  - 90-180 days: S3 Standard-IA (50% cost reduction)
  - 180-365 days: S3 Intelligent-Tiering (automatic optimization)
  - 365-730 days: S3 Glacier Instant Retrieval (68% cost reduction, ms retrieval)
  - 730+ days: S3 Glacier Deep Archive (95% cost reduction, 12hr retrieval)
- Encryption: S3 SSE-S3 (AES256)
- Versioning: Enabled
- Retention: 7+ years (2555 days)

### Database Strategy

#### DynamoDB Metadata Table
- Partition Key: customerId
- Sort Key: date
- GSI: uploadTimestamp for queries
- TTL: 7 years (2555 days) - matches data retention
- Billing: On-demand (handles spiky traffic)

#### DynamoDB Cache Table
- Stores aggregated query results
- TTL: 1 hour
- Reduces S3 reads by ~70% (30% daily active users)

### Cost Optimization

#### Storage Costs (Monthly for 5M customers)
- Raw: 5M files/day × 30 days × 50KB = 7.5TB × $0.023 = $173
- Processed (Standard, 0-90d): 5M × 2KB × 90 days = 900GB × $0.023 = $21
- Processed (IA, 90-180d): 5M × 2KB × 90 days = 900GB × $0.0125 = $11
- Processed (Intelligent, 180-365d): 5M × 2KB × 185 days = 1.85TB × $0.01 = $19
- Processed (Glacier IR, 1-2yr): 5M × 2KB × 365 days = 3.65TB × $0.004 = $15
- Processed (Deep Archive, 2-7yr): 5M × 2KB × 1825 days = 18.25TB × $0.00099 = $18
- Total: ~$257/month for 7 years of data

Note: GZIP compression achieves ~2KB per customer/day vs 50KB raw JSON (25x compression)

#### Compute Costs
- Lambda invocations: 5M uploads + 5M processing = 10M/day
- API calls: 1.5M/day (with 70% cache hit rate)
- Estimated: $200-300/month

#### Data Transfer
- CloudFront CDN for frontend
- S3 Transfer Acceleration for uploads
- Estimated: $100-150/month

### Performance Optimization

#### Parquet with GZIP Benefits
- 15-30x compression vs JSON (GZIP > Snappy for storage)
- Columnar format for fast queries
- Built-in statistics for query optimization
- Dictionary encoding for repeated values (app names)
- GZIP level 9 for maximum compression (long-term storage priority)
- Data Page V2 for better compression ratios

#### Caching Strategy
- DynamoDB cache: 1 hour TTL
- CloudFront: Static assets
- API Gateway caching: Optional for read-heavy endpoints
- Expected cache hit rate: 70%

#### Concurrency Limits
- Upload: 500 concurrent
- getData: 1000 concurrent
- Processing: 200 concurrent (prevents S3 throttling)

### Security Best Practices

#### Encryption
- At rest: S3 SSE-S3 (AES256) for S3, AWS managed encryption for DynamoDB
- In transit: TLS 1.2+ only
- No KMS costs, simpler key management

#### Access Control
- IAM roles with least privilege
- API Gateway authorizer (JWT/API Key)
- Customer data isolation (partition by customerId)
- WAF rate limiting: 2000 req/5min per IP

#### Data Protection
- S3 bucket policies: Block public access
- Versioning enabled for recovery
- Point-in-time recovery for DynamoDB
- Input validation and sanitization

#### Monitoring
- CloudWatch alarms for errors and latency
- SNS email alerts for critical issues
- Structured logging with correlation IDs
- X-Ray tracing for performance analysis

### Scalability Features

#### Auto-scaling
- Lambda: Automatic scaling to 1000s of concurrent executions
- DynamoDB: On-demand billing scales automatically
- API Gateway: Handles millions of requests

#### Partitioning
- S3: Partitioned by customerId and date
- DynamoDB: Distributed by customerId hash
- No hot partitions with proper key design

#### Batch Processing
- Daily aggregation job for analytics
- Cleanup job for old data
- Can process millions of records in parallel

### Monitoring & Alerts

#### CloudWatch Alarms
- High error rate (>10 errors in 5 min)
- High latency (>5s average)
- Throttling events
- Failed uploads

#### SNS Email Notifications
- Critical errors
- Processing failures
- Security events
- Daily summary reports

### Disaster Recovery

#### Backup Strategy
- S3 versioning: Recover deleted/corrupted files
- DynamoDB PITR: 35-day recovery window
- Glacier/Deep Archive: Immutable long-term storage
- Cross-region replication: Optional for critical data

#### RTO/RPO
- RTO: <1 hour (redeploy from IaC)
- RPO: <5 minutes (continuous replication)
- Historical data recovery: 12 hours (Deep Archive retrieval)

### Future Enhancements

1. Multi-region deployment for global users
2. Athena for ad-hoc queries on S3 data
3. QuickSight for business intelligence
4. Real-time analytics with Kinesis
5. Machine learning insights with SageMaker
