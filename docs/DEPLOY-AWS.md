# Hosting rafey.me on AWS (and leaving Cloudflare)

**Where you end up:** a private S3 bucket holds the files, CloudFront serves them over HTTPS from edge locations worldwide, Route 53 runs DNS, and GitHub Actions deploys every push to `main` automatically. GitHub signs in to AWS with a short-lived token (OIDC), so no AWS keys are stored in GitHub.

```
push to main ──▶ GitHub Actions ──(OIDC role)──▶ S3 bucket (private)
                                                     │  Origin Access Control
visitor ──▶ Route 53 ──▶ CloudFront (HTTPS, HTTP/3, security headers, www → apex)
```

All AWS resources are defined in [`infra/aws/site.yml`](../infra/aws/site.yml): one CloudFormation stack, created in one step.

**Rough cost:** Route 53 hosted zone $0.50/month, plus DNS queries (cents). CloudFront's free tier covers 1 TB of data and 10 million requests a month, and S3 storage for a 8 MB site is close to $0. Expect about **$0.50–1/month**.

---

## Step 0 — Before you start
- An AWS account. Turn on MFA for the root user and create a **billing alarm** (Billing → Budgets → create a $5 monthly budget).
- **Find out where `rafey.me` is registered.** Check the WHOIS "Registrar" field, or your Cloudflare dashboard → Domain Registration.
  - **Registered somewhere else (Namecheap, GoDaddy, etc.) with only DNS on Cloudflare:** follow the steps below as written.
  - **Registered with Cloudflare Registrar:** Cloudflare doesn't let you change nameservers for domains it registers. You must **transfer the domain out first** (to Route 53 Domains or another registrar). Do that before Step 2. Domains are locked for 60 days after registration or a previous transfer.

## Step 1 — Back up your current DNS (important)
Cloudflare dashboard → `rafey.me` → **DNS → Records → Import and Export → Export**. This saves a zone file.

Note especially any **MX / TXT records**. These are email (for example a Google Workspace or Zoho mailbox on your domain) and domain verifications. If they're not copied to Route 53, **email on @rafey.me stops working**. You don't need to copy the old `A` / `AAAA` / `CNAME` records for `rafey.me` and `www`; the stack creates new ones.

## Step 2 — Create the Route 53 hosted zone
1. AWS Console → **Route 53 → Hosted zones → Create hosted zone** → Domain name `rafey.me`, Type **Public** → Create.
2. Open the zone and re-create your MX / TXT records from Step 1. You can paste the exported file under *Import zone file* after deleting the apex/www A, AAAA and CNAME lines.
3. Copy the **4 nameservers** shown in the zone's `NS` record (like `ns-123.awsdns-45.com`).
4. Copy the **Hosted zone ID** (like `Z0123456789ABC`). You'll need it in Step 4.

## Step 3 — Point the domain at Route 53
At your **registrar**, replace Cloudflare's nameservers with the 4 AWS nameservers. If Cloudflare shows DNSSEC as enabled, **turn DNSSEC off at the registrar first** and wait a few hours, or the domain will stop resolving.

Wait until the new nameservers are live. This is usually under an hour, but can take up to 48 hours. Check with:

```bash
dig +short NS rafey.me
```

Continue when it shows only `awsdns` servers.

## Step 4 — Create the AWS stack (us-east-1)
The certificate for CloudFront **must** be created in **US East (N. Virginia) `us-east-1`**, so create the stack there. The site is still served worldwide.

**Console:** switch the region to *us-east-1* → **CloudFormation → Create stack → With new resources** → *Upload a template file* → choose `infra/aws/site.yml` →
- Stack name: `rafey-me`
- `HostedZoneId`: the ID from Step 2
- leave the other parameters as they are. If your account already uses GitHub Actions with AWS, set `CreateGitHubOIDCProvider` to `false`.

→ tick *"I acknowledge that AWS CloudFormation might create IAM resources"* → **Submit**.

**Or with the AWS CLI:**

```bash
aws cloudformation deploy --region us-east-1 --stack-name rafey-me --template-file infra/aws/site.yml --capabilities CAPABILITY_IAM --parameter-overrides HostedZoneId=YOUR_ZONE_ID
```

The stack takes **10–30 minutes**, mostly waiting for the certificate to validate and CloudFront to deploy. When it shows `CREATE_COMPLETE`, open the **Outputs** tab. You'll need `DeployRoleArn`, `BucketName` and `DistributionId`.

## Step 5 — Connect GitHub
GitHub → `rafey581/rafey.me` → **Settings → Secrets and variables → Actions → Variables tab → New repository variable**. Add four variables. They're IDs, not secrets.

| Name | Value |
|---|---|
| `AWS_ROLE_ARN` | `DeployRoleArn` output |
| `S3_BUCKET` | `BucketName` output |
| `CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId` output |
| `AWS_REGION` | `us-east-1` |

## Step 6 — Deploy
Merge the pull request, or go to **Actions → Deploy to AWS → Run workflow**. The workflow uploads the site, clears the CloudFront cache, and smoke-tests `https://rafey.me`. Until the variables in Step 5 exist, the workflow is **skipped** rather than failing.

## Step 7 — Check it
```bash
curl -sI https://rafey.me/ | grep -iE "^HTTP|strict-transport|content-security|x-cache"
```

```bash
curl -sI https://www.rafey.me/ | grep -iE "^HTTP|location"
```

The first should show `HTTP/2 200` plus the security headers. The second should show `301` → `https://rafey.me/`. You can also run the site through <https://securityheaders.com> and <https://pagespeed.web.dev>.

## Step 8 — Remove Cloudflare
Do this only after Step 7 works.
1. Cloudflare → **Workers & Pages → `rafey-me` → Settings → Builds → Disconnect** the Git repository. This stops the failing "Workers Builds" check on GitHub.
2. Then **Settings → Delete** the `rafey-me` Worker.
3. Cloudflare → `rafey.me` site → **Overview → Remove site from Cloudflare** (right-hand column, at the bottom).
4. GitHub → your profile **Settings → Applications → Installed GitHub Apps → Cloudflare Workers and Pages → Configure** → remove access to `rafey.me`, or uninstall it if you don't use it elsewhere.

## Step 9 — Turn off GitHub Pages
Repo **Settings → Pages** → set *Source* to **None / Unpublish**. Otherwise the same site also exists at `rafey581.github.io/rafey.me`, which is duplicate content for search engines.

## Step 10 — Search engines
In **Google Search Console** add a *Domain* property for `rafey.me`. Google gives you a TXT record; add it in Route 53, verify, then submit `https://rafey.me/sitemap.xml`. Do the same in **Bing Webmaster Tools**.

---

### Troubleshooting
- **Stack stuck on `Certificate` for over 30 min:** the nameservers from Step 3 aren't live yet. Check `dig +short NS rafey.me`.
- **Workflow fails at "Configure AWS credentials" (`Not authorized to perform sts:AssumeRoleWithWebIdentity`):** the role only trusts the `main` branch of `rafey581/rafey.me`. Runs from other branches or forks are rejected by design.
- **Changes don't appear:** the workflow invalidates the cache on every deploy. Hard-refresh the browser (Ctrl+Shift+R), because assets are cached for 1 day.
- **Rollback:** revert the commit on `main` and the workflow redeploys the previous version. The bucket also keeps old file versions for 30 days.
