PHASE 1: SSL Certificate (do this first — validation takes time)
Request an ACM certificate in us-east-1 (must be us-east-1 for CloudFront):

aws acm request-certificate \
 --domain-name fscreentime.app \
 --subject-alternative-names "\*.fscreentime.app" \
 --validation-method DNS \
 --region us-east-1
Get the DNS validation records:

aws acm describe-certificate \
 --certificate-arn <ARN_FROM_STEP_1> \
 --region us-east-1 \
 --query 'Certificate.DomainValidationOptions'
Add the CNAME validation records in Namecheap:
Go to Namecheap → Domain List → fscreentime.app → Advanced DNS
Add a CNAME record for each validation entry (the \_xxx.fscreentime.app → \_yyy.acm-validations.aws values)
Wait for the certificate status to become ISSUED (check with aws acm describe-certificate)
PHASE 2: OAuth Providers
Google (Google Cloud Console):

Go to https://console.cloud.google.com → APIs & Services → Credentials
Create an OAuth 2.0 Client ID (Web application)
Add authorized redirect URI: https://screen-time-api-prod-<YOUR_SUFFIX>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
Save the Client ID and Client Secret
Facebook (Facebook Developer Portal):

Go to https://developers.facebook.com → Your App → Facebook Login → Settings
Add valid OAuth redirect URI: https://screen-time-api-prod-<YOUR_SUFFIX>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
Save the App ID and App Secret
PHASE 3: Initial Backend Deploy (one-time manual)
Create the backend .env file:

cd backend
cp .env.example .env
Fill in backend/.env:

STAGE=prod
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
FACEBOOK_APP_ID=<your-facebook-app-id>
FACEBOOK_APP_SECRET=<your-facebook-app-secret>
COGNITO_DOMAIN_SUFFIX=fst
INGEST_API_KEY=<generate-a-random-32-char-string>
CALLBACK_URL=https://fscreentime.app/app
LOGOUT_URL=https://fscreentime.app/
DOMAIN_NAME=fscreentime.app
ACM_CERTIFICATE_ARN=<arn-from-phase-1>
Generate the ingest API key: openssl rand -hex 32

Deploy:

cd backend
npm ci
npx serverless deploy --stage prod
Save the stack outputs (you'll need these for the frontend and GitHub Secrets):

npx serverless info --stage prod --verbose
Note down: ApiEndpoint, UserPoolId, UserPoolClientId, IdentityPoolId, CognitoDomain, CloudFrontDistributionId, CloudFrontDomainName

PHASE 4: DNS Configuration (Namecheap)
You have two options for the apex domain. Option A (recommended) gives you the cleanest setup:

Option A — Transfer DNS to Route 53:

Create a hosted zone in Route 53:

aws route53 create-hosted-zone \
 --name fscreentime.app \
 --caller-reference $(date +%s)
Copy the 4 NS records from the output
In Namecheap → Domain List → fscreentime.app → Custom DNS, replace nameservers with the Route 53 NS records
Add Route 53 records pointing to CloudFront:

# Get the hosted zone ID

aws route53 list-hosted-zones-by-name --dns-name fscreentime.app

# Create A record (apex) + A record (www) as aliases to CloudFront

aws route53 change-resource-record-sets \
 --hosted-zone-id <ZONE_ID> \
 --change-batch '{
"Changes": [
{
"Action": "CREATE",
"ResourceRecordSet": {
"Name": "fscreentime.app",
"Type": "A",
"AliasTarget": {
"HostedZoneId": "Z2FDTNDATAQYW2",
"DNSName": "<CLOUDFRONT_DOMAIN_NAME>",
"EvaluateTargetHealth": false
}
}
},
{
"Action": "CREATE",
"ResourceRecordSet": {
"Name": "www.fscreentime.app",
"Type": "A",
"AliasTarget": {
"HostedZoneId": "Z2FDTNDATAQYW2",
"DNSName": "<CLOUDFRONT_DOMAIN_NAME>",
"EvaluateTargetHealth": false
}
}
}
]
}'
(Z2FDTNDATAQYW2 is the fixed hosted zone ID for all CloudFront distributions)

Option B — Stay on Namecheap DNS:

Add a CNAME: www → <CLOUDFRONT_DOMAIN_NAME> (e.g., d1234abcdef.cloudfront.net)
For the apex domain (fscreentime.app), use Namecheap's "URL Redirect" to redirect fscreentime.app → https://www.fscreentime.app
In this case, your primary domain becomes www.fscreentime.app
PHASE 5: Initial Frontend Deploy (one-time manual)
Create the root .env file:

cp .env.example .env
Fill in .env using the stack outputs from Phase 3:

VITE_API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=<client-id>
VITE_COGNITO_IDENTITY_POOL_ID=us-east-1:<uuid>
VITE_COGNITO_DOMAIN=screen-time-api-prod-fst.auth.us-east-1.amazoncognito.com
VITE_DATA_BUCKET=screen-time-api-prod-data
VITE_AWS_REGION=us-east-1
VITE_REDIRECT_SIGN_IN=https://fscreentime.app/app
VITE_REDIRECT_SIGN_OUT=https://fscreentime.app/
Build and deploy:

npm ci
npm run build
aws s3 sync dist/ s3://screen-time-api-prod-website --delete
aws cloudfront create-invalidation \
 --distribution-id E21CINNGXZHTTX \
 --paths "/\*"
Verify — visit https://fscreentime.app and confirm it loads.
PHASE 6: GitHub Repo + CI/CD Setup
6a. Create GitHub repo and push:

cd /Users/antoniosanchez/Downloads/dashboard-test-reduced
git remote add origin git@github.com:<YOUR_USERNAME>/fscreentime.git
git add -A
git commit -m "Initial production setup"
git push -u origin main
6b. Create AWS IAM OIDC provider for GitHub Actions (no long-lived keys):

# Create the OIDC identity provider

aws iam create-open-id-connect-provider \
 --url https://token.actions.githubusercontent.com \
 --client-id-list sts.amazonaws.com \
 --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
6c. Create the deployment IAM role:

# Save this as trust-policy.json (replace YOUR_USERNAME and REPO_NAME)

cat > /tmp/trust-policy.json << 'EOF'
{
"Version": "2012-10-17",
"Statement": [
{
"Effect": "Allow",
"Principal": {
"Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
},
"Action": "sts:AssumeRoleWithWebIdentity",
"Condition": {
"StringEquals": {
"token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
},
"StringLike": {
"token.actions.githubusercontent.com:sub": "repo:<YOUR_USERNAME>/<REPO_NAME>:ref:refs/heads/main"
}
}
}
]
}
EOF

aws iam create-role \
 --role-name GitHubActions-fscreentime-deploy \
 --assume-role-policy-document file:///tmp/trust-policy.json

# Attach permissions (scoped to what serverless + S3 sync + CloudFront needs)

aws iam attach-role-policy \
 --role-name GitHubActions-fscreentime-deploy \
 --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
Security note: AdministratorAccess works for initial setup. After everything is stable, scope this down to only the services used (CloudFormation, Lambda, S3, DynamoDB, Cognito, CloudFront, IAM, API Gateway, CloudWatch Logs). The OIDC trust policy already restricts access to only your main branch.

6d. Add GitHub Secrets (Settings → Secrets and variables → Actions):

Secret Name Value
AWS_DEPLOY_ROLE_ARN arn:aws:iam::<ACCOUNT_ID>:role/GitHubActions-fscreentime-deploy
ACM_CERTIFICATE_ARN From Phase 1
GOOGLE_CLIENT_ID From Phase 2
GOOGLE_CLIENT_SECRET From Phase 2
FACEBOOK_APP_ID From Phase 2
FACEBOOK_APP_SECRET From Phase 2
COGNITO_DOMAIN_SUFFIX fst (or whatever you chose)
INGEST_API_KEY The random key you generated
VITE_API_URL API endpoint from Phase 3 output
VITE_COGNITO_USER_POOL_ID From Phase 3 output
VITE_COGNITO_CLIENT_ID From Phase 3 output
VITE_COGNITO_IDENTITY_POOL_ID From Phase 3 output
VITE_COGNITO_DOMAIN From Phase 3 output
CLOUDFRONT_DISTRIBUTION_ID From Phase 3 output
6e. Test the pipeline:
Make any small change, commit, and push to main. Check the Actions tab in GitHub to verify both jobs succeed.

Security Summary
What's been configured:

HTTPS enforced — CloudFront redirects all HTTP to HTTPS
TLS 1.2+ only — TLSv1.2_2021 minimum protocol
Security headers — HSTS (2 years + preload), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, XSS-Protection
S3 not publicly accessible — Origin Access Control (OAC) ensures only CloudFront can read the bucket
No long-lived AWS keys — GitHub Actions uses OIDC federation
SPA routing — CloudFront returns index.html for 404/403 (React Router compatibility)
HTTP/2 + HTTP/3 — modern protocols enabled
Cache strategy — hashed assets cached 1 year, index.html never cached
IAM scoped to branch — only main branch can assume the deploy role
What the files I created/modified do:
serverless.yml — Added CloudFrontDistribution, WebsiteBucket, CloudFrontOAC, SecurityHeadersPolicy, and WebsiteBucketPolicy resources (all conditional on --stage prod). Also added useDotenv: true and a custom section for domain configuration.
.github/workflows/deploy.yml — CI/CD pipeline that triggers on push to main. Deploys backend first (serverless), then builds the frontend and syncs to S3 with proper cache headers, and invalidates CloudFront.
