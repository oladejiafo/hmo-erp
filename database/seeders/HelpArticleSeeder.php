<?php
/**
 * FILE: database/seeders/HelpArticleSeeder.php
 *
 * Pre-populated help articles for all role groups.
 * visible_to_roles null = all roles see it.
 * related_pages = React route paths for contextual drawer matching.
 */
namespace Database\Seeders;

use App\Models\HelpArticle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class HelpArticleSeeder extends Seeder
{
    public function run(): void
    {
        $articles = $this->getArticles();
        foreach ($articles as $article) {
            HelpArticle::updateOrCreate(
                ['slug' => Str::slug($article['title'])],
                array_merge($article, ['slug' => Str::slug($article['title'])])
            );
        }
    }

    private function getArticles(): array
    {
        return [

            // ═══════════════════════════════════════════════════════════════
            // GETTING STARTED — all roles
            // ═══════════════════════════════════════════════════════════════

            [
                'title'            => 'Welcome — What You Can Do in This System',
                'category'         => 'getting_started',
                'is_featured'      => true,
                'sort_order'       => 1,
                'visible_to_roles' => null,
                'related_pages'    => ['dashboard'],
                'content'          => <<<MD
# Welcome to the HMO Management System

This system manages the complete lifecycle of healthcare provision — from enrolling members to paying providers and filing regulatory returns.

## What your role allows you to do

When you log in, you will only see the sections relevant to your role. This guide explains what each section is for and how to use it.

## The main sections

| Section | What it's for |
|---------|--------------|
| **Dashboard** | Overview of key numbers for today |
| **Enrollees** | Member records, dependents, plan assignments |
| **Claims** | Submit, review, and process healthcare claims |
| **Pre-Auth** | Authorise expensive treatments before they happen |
| **HCPs** | Healthcare provider (hospital/clinic) records |
| **Corporates** | Client company accounts |
| **Finance** | Payment batches, capitation, FFS settlements |
| **Reports** | NHIA returns and cost reports |
| **Help** | This guide — always available from the **?** button |

## How to get help fast

Click the **?** button at the bottom-right of any page to see articles specific to what you are doing. Use the search bar in this Help Centre to find any topic by keyword.

> **Tip:** If you cannot find an answer, contact your system administrator. Each organisation has a designated admin who can help with access and permissions.
MD,
            ],

            [
                'title'            => 'Logging In and Resetting Your Password',
                'category'         => 'getting_started',
                'is_featured'      => true,
                'sort_order'       => 2,
                'visible_to_roles' => null,
                'related_pages'    => ['login'],
                'content'          => <<<MD
# Logging In and Resetting Your Password

## Logging in

1. Open your browser and go to the system URL provided by your administrator
2. Enter your **email address** and **password**
3. Click **Sign In**

If you see an error saying your account is inactive, contact your administrator — your account may need to be enabled.

## Forgotten password

1. On the login page, click **Forgot Password?**
2. Enter your email address and click **Send Reset Link**
3. Check your email (including the spam/junk folder)
4. Click the link in the email — it expires after **60 minutes**
5. Enter and confirm your new password

## Changing your password when logged in

1. Click your name in the top-right corner
2. Select **Profile Settings**
3. Go to the **Security** tab
4. Enter your current password, then your new password twice
5. Click **Update Password**

## Session timeout

For security, you will be automatically logged out after a period of inactivity. Any unsaved work will be lost. Save your work regularly.

> **Important:** Never share your login credentials with anyone, including IT staff. The system records every action against the user account that performed it.
MD,
            ],

            [
                'title'            => 'Understanding the Dashboard',
                'category'         => 'getting_started',
                'is_featured'      => true,
                'sort_order'       => 3,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager','branch_manager','claims_officer'],
                'related_pages'    => ['dashboard'],
                'content'          => <<<MD
# Understanding the Dashboard

The Dashboard is the first page you see after logging in. It shows the most important numbers for your work today.

## Key metrics cards

| Card | What it shows |
|------|--------------|
| **Pending Claims** | Claims submitted but not yet reviewed |
| **Pending Pre-Auths** | Pre-authorisation requests awaiting decision |
| **Active Enrollees** | Members currently on valid plans |
| **Claims This Month** | Total claims processed in the current calendar month |

## Trend charts

The charts show claim volume and payment trends over the last 6 months. A rising claims line with a flat approved-amount line may indicate more queries or rejections — worth investigating.

## Recent activity feed

The right panel shows the last 10 actions in the system — useful for branch managers checking what the team has been doing.

## Quick actions

The coloured buttons at the top give one-click access to the most common tasks:
- **New Claim** → goes directly to the claim submission form
- **New Pre-Auth** → opens the pre-authorisation form
- **Import Claims** → opens the bulk import wizard

> **Tip:** The numbers on the dashboard refresh every 5 minutes automatically. Pull down to refresh manually on mobile.
MD,
            ],

            // ═══════════════════════════════════════════════════════════════
            // ENROLLEES — HMO staff + Corporate HR
            // ═══════════════════════════════════════════════════════════════

            [
                'title'            => 'How to Register a New Enrollee',
                'category'         => 'enrollees',
                'is_featured'      => true,
                'sort_order'       => 1,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager','branch_manager','claims_officer','corporate_admin'],
                'related_pages'    => ['enrollees.create','enrollees.index'],
                'content'          => <<<MD
# How to Register a New Enrollee

An enrollee is a member covered by an HMO plan. This guide walks through registering a new enrollee from scratch.

## Before you start

You will need:
- The enrollee's full legal name (as on their ID)
- Date of birth
- National Identification Number (NIN) or another government ID
- The corporate they belong to
- Which plan they are on
- A valid email or phone number

## Step-by-step

1. Go to **Enrollees** in the left menu
2. Click **+ New Enrollee** (top right)
3. Fill in the **Personal Information** section:
   - Full name, date of birth, gender, marital status
   - NIN or passport number
4. Fill in the **Contact Information** section:
   - Phone number and email
   - Home address
5. Select the **Corporate** from the dropdown
   - This determines which plans are available in the next field
6. Select the **Health Plan**
7. Set the **Enrollment Date** — this is the date coverage begins
8. Click **Save Enrollee**

The system will automatically:
- Generate a unique HMO Member Number
- Calculate the benefit expiry date based on the plan
- Set the status to **Active**

## After saving

You can immediately:
- Add **dependents** (spouse, children) using the Dependents tab
- Upload the enrollee's photo and ID document
- Print the member card from the Actions menu

> **Note for Corporate HR admins:** You can only enroll members under your own corporate. If the wrong corporate is pre-selected, contact your HMO relationship officer.
MD,
            ],

            [
                'title'            => 'Adding Dependents to an Enrollee',
                'category'         => 'enrollees',
                'sort_order'       => 2,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager','branch_manager','claims_officer','corporate_admin'],
                'related_pages'    => ['enrollees.show','dependents.create'],
                'content'          => <<<MD
# Adding Dependents to an Enrollee

Dependents are family members (typically a spouse and children) covered under the primary enrollee's plan.

## Dependent limits

Each health plan specifies the maximum number of dependents allowed. The system enforces this limit and will prevent you from adding more than allowed.

**Typical Nigerian HMO allowances:**
- Standard plan: spouse + up to 4 children
- Executive plan: spouse + up to 6 children
- Basic plan: no dependents

Check the **Plan Details** page to confirm the limit for this enrollee.

## Adding a dependent

1. Open the enrollee's profile
2. Click the **Dependents** tab
3. Click **+ Add Dependent**
4. Fill in:
   - Full name
   - Date of birth
   - Relationship (Spouse / Son / Daughter)
   - Gender
5. Click **Save Dependent**

## Age limits for children

Most plans cover children up to age 18 (or up to 21 if in full-time education). The system will warn you if a child is approaching the age limit. When a child turns 18 (or the plan limit), their status changes to **Aged Out** automatically.

> **Important:** Dependents share the primary enrollee's annual benefit ceiling. A large claim by one dependent reduces what remains for the others and the primary member.
MD,
            ],

            [
                'title'            => 'Searching for an Enrollee',
                'category'         => 'enrollees',
                'sort_order'       => 3,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager','branch_manager','claims_officer','corporate_admin'],
                'related_pages'    => ['enrollees.index'],
                'content'          => <<<MD
# Searching for an Enrollee

## Quick search

Use the search bar at the top of the Enrollees list. You can search by:
- **HMO Member Number** (e.g. HMO-000123) — fastest and most accurate
- **Full name** — partial names work (e.g. "Ade" will find "Adewale", "Adebayo", etc.)
- **Phone number**
- **National ID / NIN**

## Filters

Use the filter panel (click **Filter** next to the search bar) to narrow results by:
- **Corporate** — show only members from one company
- **Plan** — show only members on a specific plan
- **Status** — Active / Inactive / Expired / Suspended
- **Enrollment date range**

## What to do if you can't find someone

1. Try searching with just the first 3–4 letters of their surname
2. Check if they might be registered under a slightly different spelling
3. Try their phone number or NIN instead of their name
4. They may be a **dependent** (not a primary enrollee) — search for the primary member by family name
5. Contact your HMO administrator — the member may be in a different branch

> **Tip:** HCPs at the point of care can verify a member's eligibility quickly using just their Member Number. Make sure members know their number.
MD,
            ],

            // ═══════════════════════════════════════════════════════════════
            // CLAIMS — Claims Officers
            // ═══════════════════════════════════════════════════════════════

            [
                'title'            => 'How to Review and Process a Claim',
                'category'         => 'claims',
                'is_featured'      => true,
                'sort_order'       => 1,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager','branch_manager','claims_officer'],
                'related_pages'    => ['claims.index','claims.show'],
                'content'          => <<<MD
# How to Review and Process a Claim

## The claim review workflow

```
HCP submits claim → Pending → Review → Approved / Queried / Rejected → Payment
```

## Opening the claims queue

1. Go to **Claims** in the left menu
2. The list defaults to **Pending** claims — these need your attention
3. Claims are sorted oldest first — work from the top

## Reviewing a single claim

1. Click on any claim to open it
2. Check the following:

| What to check | Where to look |
|---|---|
| Is the enrollee valid and active? | Enrollee panel (top of page) |
| Is the service date within the plan period? | Service date vs enrollment date |
| Is the amount within the benefit limit? | Benefit utilisation bar |
| Is the diagnosis code valid? | ICD code field (system validates automatically) |
| Has this enrollee used this HCP before for this condition? | Claims history tab |
| Is a pre-auth required for this service type? | Plan's pre-auth threshold rules |

3. Choose an action:
   - **Approve** — enter the approved amount (may differ from claimed if partially approved)
   - **Query** — select a query reason and add your note; returns to HCP for clarification
   - **Reject** — select a rejection reason; claim is closed
4. Click **Submit Decision**

## Common query reasons

- Amount exceeds plan limit for this service
- Diagnosis code does not match the service description
- Pre-authorisation required but not obtained
- Enrollee was inactive on the date of service
- Duplicate claim (already processed)

> **Note:** All decisions are logged with your name, timestamp, and reason. This creates the audit trail required for NHIA compliance.
MD,
            ],

            [
                'title'            => 'Bulk Claims Import — Step by Step',
                'category'         => 'claims',
                'is_featured'      => true,
                'sort_order'       => 2,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager','branch_manager','claims_officer'],
                'related_pages'    => ['claims.import'],
                'content'          => <<<MD
# Bulk Claims Import — Step by Step

Instead of entering claims one at a time, you can import an Excel or CSV file submitted by an HCP.

## Step 1 — Upload

1. Go to **Claims → Bulk Import**
2. Drag and drop the file onto the upload area, or click to browse
   - Accepted formats: **.xlsx**, **.xls**, **.csv**
   - Maximum file size: 10 MB
3. Select the **HCP** this file is from
4. Select the **Claim Period** (month the services were rendered)
5. Click **Next: Map Columns**

## Step 2 — Map Columns

The system reads the column headers from the file and tries to automatically match them to the correct fields.

- Green fields were matched automatically
- Orange/empty fields need your attention

For each unmatched column, use the dropdown to select the correct field. If a column is not relevant, leave it as **"Skip this column"**.

**Required fields** (marked with *):
- Enrollee ID / Member Number
- Service Date
- Amount Submitted

Click **Validate Rows** when done.

## Step 3 — Review Rows

The system validates every row and shows:
- ✅ **Valid** — ready to import
- ⚠️ **Error** — has a problem you need to address
- 🔄 **Duplicate** — already exists in the system

**For error rows:** click the row to see what the problem is. You can:
- **Approve with override** — accept it anyway (enter a reason)
- **Skip** — exclude this row from the import

**Bulk approve:** Click **Approve All Valid** to approve all clean rows at once.

## Step 4 — Confirm & Push

Review the summary:
- How many rows will be pushed to the claims queue
- The total amount
- How many were skipped or had errors

Click **Push Claims** to send them to the pending queue where normal review begins.

> **Important:** Importing creates claims in **Pending** status. They still need to go through the standard review process before payment.
MD,
            ],

            // ═══════════════════════════════════════════════════════════════
            // PRE-AUTH
            // ═══════════════════════════════════════════════════════════════

            [
                'title'            => 'Processing a Pre-Authorisation Request',
                'category'         => 'pre_auth',
                'is_featured'      => true,
                'sort_order'       => 1,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager','branch_manager','claims_officer'],
                'related_pages'    => ['pre-auth.index','pre-auth.show'],
                'content'          => <<<MD
# Processing a Pre-Authorisation Request

Pre-authorisation (pre-auth or PA) is required before an HCP carries out a procedure above the plan's pre-auth threshold.

## When is pre-auth required?

The plan determines this. Common triggers:
- Any inpatient admission
- Surgery above ₦50,000 (varies by plan)
- Specialist referral for the first time
- Drugs above the drug threshold

The system flags when a claim comes in without the required pre-auth.

## Reviewing a pre-auth request

1. Go to **Pre-Auth** in the left menu
2. Open a request with **Pending** status
3. Review:
   - The proposed procedure / diagnosis
   - The estimated cost vs the plan limit
   - The enrollee's remaining benefit balance
   - Whether the HCP is on the approved provider list

4. Decide:
   - **Approve** — enter the approved amount and any conditions
   - **Modify** — approve for a different amount or different procedure
   - **Decline** — select a reason; the HCP and corporate are notified

## Time targets

| Request type | Target decision time |
|---|---|
| Emergency | Within 2 hours |
| Routine surgery | Within 24 hours |
| Chronic disease management | Within 48 hours |

## After approval

The system generates a **Pre-Auth Code** (e.g. PA-2025-001234). Share this code with the HCP — they must include it when submitting the claim. Claims matching a valid pre-auth code are fast-tracked in review.

> **Warning:** Approving a pre-auth does not guarantee payment. The eventual claim is still reviewed to confirm the service matched the approved procedure and amount.
MD,
            ],

            // ═══════════════════════════════════════════════════════════════
            // PLANS — HMO staff
            // ═══════════════════════════════════════════════════════════════

            [
                'title'            => 'Understanding Health Plans and Benefit Limits',
                'category'         => 'plans',
                'sort_order'       => 1,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager','branch_manager','claims_officer','corporate_admin'],
                'related_pages'    => ['corporates.show'],
                'content'          => <<<MD
# Understanding Health Plans and Benefit Limits

## What is a health plan?

A health plan is the package of healthcare benefits a corporate purchases for its employees. Each corporate can have multiple plans (e.g. Executive, Senior Staff, Junior Staff).

## Key plan fields

| Field | Meaning |
|---|---|
| **Annual Benefit Ceiling** | Maximum total amount the HMO will pay for one member per year |
| **Inpatient Limit** | Sub-limit for hospital admissions (part of the annual ceiling) |
| **Surgery Limit** | Maximum for any single surgical procedure |
| **Max Dependents** | How many family members can be enrolled |
| **Co-pay** | Amount the member pays at point of care (if any) |
| **Waiting Period** | Days from enrollment before coverage starts |

## Benefit utilisation

On any enrollee's profile, you will see a **Benefit Utilisation** bar showing:
- How much of the annual ceiling has been used
- How much remains
- When the benefit period ends

When a member reaches 80% utilisation, the system sends a notification to the corporate HR admin.

## Sub-limits explained

A member with a ₦500,000 annual ceiling and a ₦150,000 inpatient limit means:
- They can claim up to ₦500,000 total per year
- But no more than ₦150,000 of that can be for inpatient care
- Outpatient claims are only limited by the annual ceiling

## Benefit items (per-service rules)

Some plans define specific rules per service (e.g. "Dental: covered up to ₦30,000/year, requires pre-auth"). These are listed in the plan's **Benefit Items** tab.
MD,
            ],

            // ═══════════════════════════════════════════════════════════════
            // REPORTS — Branch Managers + HQ
            // ═══════════════════════════════════════════════════════════════

            [
                'title'            => 'Generating NHIA Returns and Regulatory Reports',
                'category'         => 'reports',
                'is_featured'      => true,
                'sort_order'       => 1,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager','branch_manager'],
                'related_pages'    => ['reports'],
                'content'          => <<<MD
# Generating NHIA Returns and Regulatory Reports

## Available reports

| Report | Who it goes to | Frequency |
|---|---|---|
| Monthly Claims Returns | NHIA | Monthly |
| Capitation Payment Schedule | NHIA | Monthly |
| Quarterly Utilisation Report | NHIA | Quarterly |
| FFS Claims Register | NHIA | Monthly |
| Annual Report | NHIA | Annually (January) |
| FFS Remittance Advice | HCP | Per payment batch |
| Corporate Cost Report | Corporate HR | Monthly |

## Generating a report manually

1. Go to **Reports** in the left menu
2. Click the report type you need
3. Select the **period** (month, quarter, or year)
4. Select the **output format** (Excel, PDF, or both)
5. For HCP-specific reports, select the HCP and payment batch
6. Click **Generate Report**

The report generates in the background. When ready, the **Download** button appears. Generation typically takes 10–30 seconds.

## Automated scheduling

Reports can be set to generate automatically on a scheduled day each month. Go to **Reports → Auto-Schedule** to configure this.

**Default schedule:**
- Monthly Claims Returns: 28th of each month (for previous month)
- Capitation Schedule: 28th of each month
- Annual Report: January 28th (for previous year)

## NHIA report format

All NHIA reports are generated in the prescribed format with:
- Your HMO name and NHIA code in the header
- The period covered
- Totals row at the bottom
- Summary sheet with key metrics

> **Reminder:** It is your responsibility to submit these reports to NHIA by the required deadlines. The system generates the file — submission is a manual step.
MD,
            ],

            // ═══════════════════════════════════════════════════════════════
            // FINANCE
            // ═══════════════════════════════════════════════════════════════

            [
                'title'            => 'Processing a Payment Batch (FFS)',
                'category'         => 'finance',
                'sort_order'       => 1,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager'],
                'related_pages'    => ['finance.batches','finance.batches.show'],
                'content'          => <<<MD
# Processing a Payment Batch (FFS)

Fee-for-service (FFS) payments are made to HCPs for approved claims. Payments are grouped into batches.

## Creating a payment batch

1. Go to **Finance → FFS Batches**
2. Click **+ New Batch**
3. Select the HCP
4. Select the claim period
5. The system pulls all approved, unpaid claims for that HCP in that period
6. Review the batch total
7. Click **Create Batch**

## Approving a batch for payment

Only users with finance approval permission can do this step.

1. Open the batch
2. Review the line items (each approved claim)
3. Confirm the bank account details for the HCP
4. Click **Approve for Payment**
5. The system:
   - Locks the claims (no further changes)
   - Generates the FFS Remittance Advice PDF for the HCP
   - Updates the claims' status to **Paid**

## Capitation payments

Capitation is a fixed monthly payment per enrolled member. Go to **Finance → Capitation** to:
- View the current month's capitation calculation
- Approve and record capitation payments
- Download the capitation schedule for NHIA

> **Note:** Capitation rates are set at the plan/HCP level. Contact your administrator to update rates.
MD,
            ],

            // ═══════════════════════════════════════════════════════════════
            // CORPORATE HR ADMIN
            // ═══════════════════════════════════════════════════════════════

            [
                'title'            => 'Corporate HR Admin — Your Quick Start Guide',
                'category'         => 'getting_started',
                'is_featured'      => true,
                'sort_order'       => 10,
                'visible_to_roles' => ['corporate_admin'],
                'related_pages'    => ['dashboard','enrollees.index'],
                'content'          => <<<MD
# Corporate HR Admin — Your Quick Start Guide

As a Corporate HR Administrator, you manage your company's enrolled members. You do not process claims — that is handled by the HMO. Your role is the membership side.

## What you can do

✅ Register new employees on their health plan
✅ Add and manage dependents (spouse, children)
✅ Suspend or terminate coverage when an employee leaves
✅ View your company's healthcare cost reports
✅ Check an individual employee's benefit utilisation
✅ Download plan details and member lists

## What you cannot do

❌ Approve or reject claims (HMO staff only)
❌ Change plan types or benefit amounts (HMO only)
❌ View other companies' data

## Most common tasks

| Task | Where to go |
|---|---|
| Register a new employee | Enrollees → New Enrollee |
| Add a spouse or child | Enrollees → [name] → Dependents |
| Employee resigned — remove coverage | Enrollees → [name] → Suspend/Terminate |
| Check how much an employee has claimed | Enrollees → [name] → Benefits tab |
| Download monthly cost report | Reports → Corporate Cost Report |
| See all active members | Enrollees → filter by Status: Active |

> **Need help?** Contact your HMO Relationship Officer. Their contact details are in the system under your corporate profile.
MD,
            ],

            [
                'title'            => 'How to Suspend or Terminate an Enrollee',
                'category'         => 'enrollees',
                'sort_order'       => 5,
                'visible_to_roles' => ['super_admin','hq_admin','hq_manager','branch_manager','corporate_admin'],
                'related_pages'    => ['enrollees.show'],
                'content'          => <<<MD
# How to Suspend or Terminate an Enrollee

## Suspension vs Termination

| | Suspension | Termination |
|---|---|---|
| **When to use** | Temporary leave (maternity, unpaid leave) | Employee has left the company |
| **Effect** | Coverage paused — claims during suspension period are rejected | Coverage ends permanently |
| **Reversible?** | Yes — reactivate when they return | No — must re-enroll if they rejoin |

## Suspending an enrollee

1. Open the enrollee's profile
2. Click **Actions → Suspend**
3. Enter the **suspension start date**
4. Optionally enter a **planned return date**
5. Select a reason from the dropdown
6. Click **Confirm Suspension**

The member's status changes to **Suspended**. Their HMO card becomes invalid from the suspension date.

## Terminating an enrollee

1. Open the enrollee's profile
2. Click **Actions → Terminate**
3. Enter the **last day of coverage** (usually the last day of employment or the end of the notice period)
4. Select the reason: Resignation / Redundancy / Retirement / Contract ended / Other
5. Click **Confirm Termination**

> **Warning for HR admins:** Once terminated, a member cannot submit claims for services received after the termination date. Process terminations promptly when an employee leaves to avoid fraudulent claims.

## Reactivating a suspended enrollee

1. Open the suspended enrollee's profile
2. Click **Actions → Reactivate**
3. Enter the **reactivation date**
4. Confirm

Benefits resume from the reactivation date. The period of suspension does not count towards their benefit year.
MD,
            ],

            // ═══════════════════════════════════════════════════════════════
            // ENROLLEE SELF-SERVICE
            // ═══════════════════════════════════════════════════════════════

            [
                'title'            => 'How to Check Your HMO Benefits and Coverage',
                'category'         => 'self_service',
                'is_featured'      => true,
                'sort_order'       => 1,
                'visible_to_roles' => ['enrollee'],
                'related_pages'    => ['member.dashboard','member.benefits'],
                'content'          => <<<MD
# How to Check Your HMO Benefits and Coverage

## Your benefit summary

When you log in, your **dashboard** shows:
- Your **annual benefit ceiling** — the maximum the HMO will pay for your care this year
- How much you have **used so far**
- How much **remains**
- Your **plan expiry date**

## What is covered on your plan

Click **My Plan** to see the full list of what your health plan covers, including:
- Which services are covered (consultations, lab tests, surgery, etc.)
- Any sub-limits (e.g. dental up to ₦30,000)
- Whether any services require pre-authorisation before treatment

## Your member details

Under **My Profile**, you can see:
- Your HMO Member Number (you need this at every hospital visit)
- Your plan tier and corporate
- Your enrolled dependents

## Viewing your claims history

Under **My Claims**, you can see every claim submitted on your behalf — including:
- Which hospital submitted it
- The service and date
- How much was claimed and how much was approved
- The current status (pending, approved, paid, queried)

> **At every hospital visit:** Tell the front desk your HMO Member Number. They use this to verify your coverage in real time. You do not need a physical card if you have the number.
MD,
            ],

            [
                'title'            => 'Finding an Approved Hospital or Clinic',
                'category'         => 'self_service',
                'is_featured'      => true,
                'sort_order'       => 2,
                'visible_to_roles' => ['enrollee'],
                'related_pages'    => ['member.hcps'],
                'content'          => <<<MD
# Finding an Approved Hospital or Clinic

You must use an HCP (Healthcare Provider) on the approved list for your claims to be covered. Visiting a non-approved provider means you pay out of pocket.

## Finding an approved provider

1. Log in and go to **Find a Provider** (or **HCPs** in the menu)
2. You can search by:
   - **Name** of the hospital or clinic
   - **Location** (city or state)
   - **Service type** (e.g. "dental", "radiology", "maternity")

## What the listing shows

For each provider you will see:
- Name and address
- Phone number
- Which services they offer
- Which HMO plans they accept

## Tier levels

Some plans have a **tier system**:
- **Tier 1** — Primary care clinics (GP consultations, basic tests)
- **Tier 2** — Secondary hospitals (specialists, minor surgery)
- **Tier 3** — Tertiary / teaching hospitals (complex surgery, ICU)

Your plan may require a referral from a Tier 1 provider before you can access Tier 2 or 3 services. Check your plan details or call the HMO helpline.

## In an emergency

Go to the nearest hospital. In a genuine emergency, you do not need to find an approved provider first. Notify your HMO within **24 hours** of an emergency admission to trigger the pre-authorisation process.

> **Tip:** Save the HMO helpline number in your phone: it's listed under **Contact Us** in the menu.
MD,
            ],

            [
                'title'            => 'What to Do If a Claim Is Queried or Rejected',
                'category'         => 'self_service',
                'sort_order'       => 3,
                'visible_to_roles' => ['enrollee'],
                'related_pages'    => ['member.claims'],
                'content'          => <<<MD
# What to Do If a Claim Is Queried or Rejected

## The difference between a query and a rejection

| Status | Meaning | What happens next |
|---|---|---|
| **Queried** | The HMO needs more information | The HCP is asked to provide additional documents |
| **Rejected** | The claim does not meet the plan's criteria | The claim is closed (you may appeal) |

## Why claims get queried

Common reasons:
- The diagnosis code does not match the treatment description
- The amount claimed exceeds the plan limit for that service
- Pre-authorisation was required but not obtained beforehand
- The enrollee was inactive on the date of service

## Why claims get rejected

Common reasons:
- The service is excluded from your plan (check the benefit items list)
- You visited a provider not on the approved list (for non-emergencies)
- The claim was submitted after the 90-day submission window
- Duplicate of a claim already processed

## What you can do

1. **For queries:** Contact your HCP — they need to respond with the requested documents. You do not need to do anything unless the HCP asks for documents you hold (e.g. a referral letter).

2. **For rejections you believe are wrong:**
   - Contact your **Corporate HR admin** — they can raise a formal query with the HMO
   - Or call the **HMO helpline** directly
   - Appeals must be submitted within **30 days** of the rejection date

> **Important:** If you believe you were wrongly rejected, act quickly. The appeal window is limited.
MD,
            ],

            // ═══════════════════════════════════════════════════════════════
            // ADMINISTRATION — super_admin only
            // ═══════════════════════════════════════════════════════════════

            [
                'title'            => 'Managing Users and Role Permissions',
                'category'         => 'administration',
                'sort_order'       => 1,
                'visible_to_roles' => ['super_admin','hq_admin'],
                'related_pages'    => ['admin.users','admin.roles'],
                'content'          => <<<MD
# Managing Users and Role Permissions

## System roles

| Role | Access level |
|---|---|
| **Super Admin** | Everything — no restrictions |
| **HQ Admin** | Full HQ access except system config |
| **HQ Manager** | Claims, enrollees, reports — no finance approval |
| **Branch Manager** | Their branch only — claims, enrollees, basic reports |
| **Claims Officer** | Claims review and pre-auth only |
| **Corporate Admin** | Their corporate's enrollees only |
| **Enrollee** | Self-service portal only |

## Creating a new user

1. Go to **Administration → Users**
2. Click **+ New User**
3. Enter name, email, and select the role
4. For Corporate Admins, also select which corporate they manage
5. Click **Create** — the user receives an email with login instructions

## Changing a user's role

1. Open the user's profile
2. Click **Edit**
3. Change the role dropdown
4. Click **Save**

Changes take effect on the user's next page load (they do not need to log out).

## Deactivating a user

When a staff member leaves:
1. Open their user profile
2. Click **Deactivate**

Their account is disabled but their action history is preserved for audit purposes. **Never delete users** — this breaks the audit trail.

## Password resets

Users can reset their own password via the login page. As an admin, you can trigger a reset email from the user's profile: **Actions → Send Password Reset**.
MD,
            ],

        ];
    }
}
