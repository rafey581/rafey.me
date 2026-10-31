#!/usr/bin/env python3
"""Generate rafey.me content pages (case studies, services, blog).

Usage: python3 tools/build_pages.py .   (run from the repo root, then commit the output)
"""
import json, os, sys, html

ROOT = sys.argv[1]
SITE = 'https://rafey.me'
TODAY = '2026-10-31'
PERSON = {'@id': f'{SITE}/#person'}
EMAIL = 'itsrafey.official@gmail.com'

def nav():
    return '''  <nav class="nav">
    <a href="/" class="nav-logo">AR<span>.</span></a>
    <ul class="nav-links">
      <li><a href="/#about">About</a></li>
      <li><a href="/#projects">Projects</a></li>
      <li><a href="/#services">Services</a></li>
      <li><a href="/blog/">Blog</a></li>
      <li><a href="/#contact">Contact</a></li>
    </ul>
    <a href="mailto:%s" class="nav-cta"><span>Hire Me</span></a>
    <button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
  </nav>
  <div class="mobile-menu" id="mobileMenu">
    <a href="/" class="mob-link">Home</a>
    <a href="/#projects" class="mob-link">Projects</a>
    <a href="/#services" class="mob-link">Services</a>
    <a href="/blog/" class="mob-link">Blog</a>
    <a href="/#contact" class="mob-link">Contact</a>
  </div>''' % EMAIL

def footer():
    return '''  <footer class="footer">
    <div class="wrap footer-inner">
      <a href="/" class="footer-logo">Abdul Rafey<span>.</span></a>
      <p>© <span id="year">2026</span> Abdul Rafey — Senior Developer &amp; Cybersecurity Specialist in Sahiwal, Punjab, Pakistan</p>
      <nav class="footer-nav" aria-label="Footer">
        <a href="/">Home</a><a href="/projects/finance-management-software/">Finance Software</a><a href="/projects/fitx-3d-gym-website/">FitX 3D Website</a>
        <a href="/services/penetration-testing/">Penetration Testing</a><a href="/services/web-development/">Web Development</a><a href="/services/website-security-audit/">Security Audit</a>
        <a href="/blog/">Blog</a><a href="https://github.com/rafey581" target="_blank" rel="noopener me">GitHub</a>
      </nav>
    </div>
  </footer>'''

def crumbs(trail):
    items = []
    for i, (name, url) in enumerate(trail):
        if i == len(trail) - 1:
            items.append(f'<li><span aria-current="page">{html.escape(name)}</span></li>')
        else:
            items.append(f'<li><a href="{url}">{html.escape(name)}</a></li>')
    return '<nav class="crumbs" aria-label="Breadcrumb"><ol>' + ''.join(items) + '</ol></nav>'

def breadcrumb_ld(trail):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': SITE + u} for i, (n, u) in enumerate(trail)]}

def faq_ld(faqs, url):
    return {'@type': 'FAQPage', '@id': url + '#faq', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faqs]}

def faq_html(faqs):
    out = ['<h2 id="faq">Frequently asked questions</h2>', '<div class="faq">']
    for q, a in faqs:
        out.append(f'<details class="glass"><summary><h3>{html.escape(q)}</h3></summary><p>{html.escape(a)}</p></details>')
    out.append('</div>')
    return '\n'.join(out)

def cta(title='Have a project in mind?', text='Tell me what you need — I usually reply within 24 hours.', subject='Project enquiry'):
    return f'''<section class="cta glass">
        <h2>{title}</h2>
        <p>{text}</p>
        <a class="btn btn-primary" href="mailto:{EMAIL}?subject={subject.replace(' ', '%20')}"><span>Email me →</span></a>
        <a class="btn btn-ghost" href="https://wa.link/kceoyh" target="_blank" rel="noopener"><span>WhatsApp</span></a>
      </section>'''

def page(path, title, desc, trail, body, graph, og_type='article', image='/assets/images/og-cover.jpg'):
    url = SITE + path
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': title, 'description': desc, 'inLanguage': 'en',
         'isPartOf': {'@id': f'{SITE}/#website'}, 'author': PERSON, 'dateModified': TODAY + 'T00:00:00+05:00',
         'breadcrumb': {'@id': url + '#breadcrumb'}, 'primaryImageOfPage': SITE + image},
        dict(breadcrumb_ld(trail), **{'@id': url + '#breadcrumb'}),
        {'@type': 'WebSite', '@id': f'{SITE}/#website', 'url': SITE + '/', 'name': 'Abdul Rafey'},
        {'@type': 'Person', '@id': f'{SITE}/#person', 'name': 'Abdul Rafey', 'url': SITE + '/',
         'jobTitle': 'Senior Developer & Cybersecurity Specialist', 'sameAs': ['https://github.com/rafey581']},
    ] + graph}
    e = html.escape
    doc = f'''<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>{e(title)}</title>
  <meta name="description" content="{e(desc)}" />
  <link rel="canonical" href="{url}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <meta name="author" content="Abdul Rafey" />
  <meta name="theme-color" content="#05070A" />
  <meta name="color-scheme" content="dark" />
  <meta property="og:type" content="{og_type}" />
  <meta property="og:site_name" content="Abdul Rafey" />
  <meta property="og:title" content="{e(title)}" />
  <meta property="og:description" content="{e(desc)}" />
  <meta property="og:url" content="{url}" />
  <meta property="og:image" content="{SITE}{image}" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{e(title)}" />
  <meta name="twitter:description" content="{e(desc)}" />
  <meta name="twitter:image" content="{SITE}{image}" />
  <link rel="icon" href="/assets/icons/logo.svg" type="image/svg+xml" />
  <link rel="icon" href="/assets/icons/icon-32.png" sizes="32x32" type="image/png" />
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/css/style.css" />
  <link rel="stylesheet" href="/assets/css/page.css" />
  <script type="application/ld+json">
{json.dumps(ld, indent=2, ensure_ascii=False)}
  </script>
  <script src="/assets/js/page.js" defer></script>
</head>
<body class="page">
{nav()}
  <main class="page-main">
    <div class="wrap narrow">
      {crumbs(trail)}
{body}
    </div>
  </main>
{footer()}
</body>
</html>
'''
    out = os.path.join(ROOT, path.strip('/'), 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w').write(doc)
    return path

pages = []

# ─────────────────────────── Case study: Finance ───────────────────────────
p = '/projects/finance-management-software/'
faqs = [
    ('Which organisations can use this finance management software?',
     'It is built for any organisation that bills members or clients on a recurring basis: schools and colleges (students and fees), hospitals and clinics (patients and charges), and gyms and fitness studios (members and monthly fees).'),
    ('What does the dashboard show?',
     'Income, expenses, profit and member counts for any date range — today, 7 days, 1 month, 3 or 6 months, this year, all time or a custom range — plus an income-versus-expenses chart and the status of open fee bills.'),
    ('Can I see a demo?', f'Yes. Email {EMAIL} and I will walk you through a live demo and discuss how it can be adapted to your organisation.'),
]
pages.append(page(p,
    'Finance Management Software — Case Study | Abdul Rafey',
    'Case study: a finance and operations platform for schools, colleges, hospitals and gyms — income, expenses, profit, fees, payments, inventory and reports.',
    [('Home', '/'), ('Projects', '/#projects'), ('Finance Management Software', p)],
    f'''      <header class="page-hero">
        <p class="eyebrow">Case study · Project 01</p>
        <h1>Finance Management Software for Schools, Colleges, Hospitals &amp; Gyms</h1>
        <p class="lead">A complete finance and operations platform that replaces spreadsheets and paper registers: income, expenses and profit in real time, plus members, staff, fees, payments, inventory and reports in one place.</p>
        <ul class="tags"><li>Full-Stack</li><li>Analytics Dashboard</li><li>Financial Reporting</li><li>Admin Roles</li></ul>
      </header>
      <figure class="shot">
        <img src="/assets/tex/finance.webp" width="1024" height="640" alt="Finance management software dashboard showing income, expenses, profit and members with date-range filters" />
        <figcaption>Dashboard — income Rs. 939,000, expenses Rs. 501,163 and profit Rs. 437,837 for the selected month.</figcaption>
      </figure>
      <article class="article">
        <h2>The problem</h2>
        <p>Schools, clinics and gyms run on recurring payments, yet most still track them in registers and spreadsheets. Fees go uncollected because nobody can see who owes what, expenses are recorded late or not at all, and the owner only learns whether the month was profitable long after it ends.</p>
        <h2>The solution</h2>
        <p>One web application where every rupee in and out is recorded once and reported everywhere. The dashboard answers the questions an owner asks every day — <em>how much came in, how much went out, what is left, and who still has to pay</em> — for any period, in a single click.</p>
        <h2>Modules</h2>
        <div class="cards">
          <div class="card glass"><h3>Dashboard</h3><p>Income, expenses, profit and member KPIs with Today, 7 days, 1/3/6 months, This year, All time or a custom date range.</p></div>
          <div class="card glass"><h3>Members</h3><p>Students, patients or gym members with status tracking (active and inactive).</p></div>
          <div class="card glass"><h3>Staff &amp; trainers</h3><p>Teachers, doctors or trainers linked to the people they serve.</p></div>
          <div class="card glass"><h3>Monthly fees</h3><p>Generate fees in bulk and track every open bill and the total outstanding.</p></div>
          <div class="card glass"><h3>Additional charges</h3><p>One-off items such as admission, lab, exam or locker charges.</p></div>
          <div class="card glass"><h3>Payments</h3><p>Record payments in seconds and keep a full history per member.</p></div>
          <div class="card glass"><h3>Expenses</h3><p>Rent, salaries, utilities and supplies, categorised for reporting.</p></div>
          <div class="card glass"><h3>Inventory</h3><p>Stock of products, equipment and consumables.</p></div>
          <div class="card glass"><h3>Reports</h3><p>Income-versus-expenses cash flow and financial reports for any period.</p></div>
        </div>
        <h2>Designed for speed of use</h2>
        <p>The most common tasks — <strong>Add Member, Record Payment, Generate Fees and Add Expense</strong> — sit in a Quick Actions bar on the dashboard, so front-desk staff can do their daily work without hunting through menus. Access is managed through administrator roles.</p>
        <h2>One platform, four industries</h2>
        <ul>
          <li><strong>Schools &amp; colleges:</strong> student fee generation, defaulter tracking and staff salaries.</li>
          <li><strong>Hospitals &amp; clinics:</strong> patient charges, payments and medical supply inventory.</li>
          <li><strong>Gyms &amp; fitness studios:</strong> monthly memberships, trainers and supplement stock.</li>
          <li><strong>Any membership business:</strong> anywhere recurring billing and expense control matter.</li>
        </ul>
        <p>Related: the <a href="/projects/fitx-3d-gym-website/">FitX 3D gym website</a> — the public-facing side of a gym business — and my <a href="/services/web-development/">web development services</a>.</p>
        {faq_html(faqs)}
      </article>
      {cta('Want this for your organisation?', 'Request a live demo of the finance management software.', 'Finance Management Software demo')}''',
    [{'@type': 'SoftwareApplication', '@id': SITE + p + '#app', 'name': 'Finance Management Software',
      'applicationCategory': 'FinanceApplication', 'operatingSystem': 'Web', 'author': PERSON,
      'image': SITE + '/assets/tex/finance.webp',
      'description': 'Finance and operations platform for schools, colleges, hospitals and gyms: income, expenses, profit, members, staff, fees, payments, inventory and reports.'},
     faq_ld(faqs, SITE + p)]))

# ─────────────────────────── Case study: FitX ───────────────────────────
p = '/projects/fitx-3d-gym-website/'
faqs = [
    ('What makes the FitX website different from a normal gym website?',
     'Instead of a static template, visitors scroll through a real-time 3D scene built with Three.js and WebGL — glowing rings and a 3D dumbbell — which makes the brand feel premium before a single word is read.'),
    ('Can the gym update the website without a developer?',
     'Yes. The custom admin panel lets staff publish blog posts, upload photos and edit other site data themselves.'),
    ('What does the chatbot do?',
     'It answers common visitor questions — about memberships, timings and training — at any hour, so potential members get answers even when the front desk is closed.'),
]
pages.append(page(p,
    'FitX 3D Gym Website & Admin Panel — Case Study | Abdul Rafey',
    'Case study: an immersive Three.js website for FitX Fitness Studio, Sahiwal, with an admin panel for blogs and photos and a chatbot for visitors.',
    [('Home', '/'), ('Projects', '/#projects'), ('FitX 3D Gym Website', p)],
    f'''      <header class="page-hero">
        <p class="eyebrow">Case study · Project 02</p>
        <h1>FitX — 3D Gym Website with Admin Panel &amp; Chatbot</h1>
        <p class="lead">A premium, scroll-driven 3D website for FitX Fitness Studio in Sahiwal, Punjab — backed by a custom admin panel the staff use to publish content, and a chatbot that answers visitors around the clock.</p>
        <ul class="tags"><li>Three.js · WebGL</li><li>Admin Panel / CMS</li><li>Chatbot</li><li>Full-Stack</li></ul>
      </header>
      <figure class="shot">
        <img src="/assets/tex/fitx.webp" width="1024" height="640" alt="FitX gym website hero with a 3D dumbbell inside glowing orange rings and the headline The Most Premium Training" />
        <figcaption>Hero section — a real-time 3D scene with the headline “The most premium training”.</figcaption>
      </figure>
      <article class="article">
        <h2>The goal</h2>
        <p>FitX positions itself as the most premium training studio in Sahiwal, offering one-on-one coaching built around each client’s body, schedule and goals. The website had to communicate that premium feel instantly — and keep working for the business after launch without a developer on call.</p>
        <h2>What I built</h2>
        <h3>1. An immersive 3D experience</h3>
        <p>The site opens on a real-time WebGL scene: concentric glowing rings, drifting particles and a 3D dumbbell, rendered with Three.js. Visitors “scroll to enter”, and the camera moves through the space as they explore the studio’s offer, timings (Saturday–Thursday, Friday closed) and location.</p>
        <h3>2. An admin panel for the gym team</h3>
        <p>A custom admin panel lets staff <strong>publish blog posts, upload photos and update other site data</strong> on their own. Fresh content keeps the site useful for members and gives search engines new pages to index.</p>
        <h3>3. A chatbot for instant answers</h3>
        <p>A built-in chatbot answers the questions prospective members ask most — memberships, timings and training — at any hour, turning late-night visitors into enquiries instead of lost leads.</p>
        <h3>4. Conversion first</h3>
        <p>Clear <strong>Book</strong> and WhatsApp calls to action are always one tap away, on desktop and mobile.</p>
        <h2>Technology</h2>
        <ul>
          <li><strong>Three.js / WebGL</strong> for the real-time 3D scene and scroll-driven camera.</li>
          <li><strong>Admin panel / CMS</strong> for blogs, photos and site data.</li>
          <li><strong>Chatbot</strong> integration for visitor questions.</li>
          <li>Responsive layout tuned for mobile, where most gym visitors browse.</li>
        </ul>
        <p>This portfolio uses the same 3D approach — scroll the <a href="/">home page</a> to see it. Related: the <a href="/projects/finance-management-software/">finance management software</a> that can run a gym’s fees, expenses and inventory behind the scenes.</p>
        {faq_html(faqs)}
      </article>
      {cta('Want a 3D website for your brand?', 'I build immersive, fast and secure 3D websites with an admin panel your team can use.', 'FitX 3D website demo')}''',
    [{'@type': 'CreativeWork', '@id': SITE + p + '#work', 'name': 'FitX — 3D Gym Website & Admin Panel', 'author': PERSON,
      'image': SITE + '/assets/tex/fitx.webp', 'keywords': 'Three.js, WebGL, 3D website, gym website, admin panel, chatbot',
      'about': {'@type': 'ExerciseGym', 'name': 'FitX Fitness Studio', 'address': {'@type': 'PostalAddress', 'addressLocality': 'Sahiwal', 'addressRegion': 'Punjab', 'addressCountry': 'PK'}},
      'description': 'Immersive Three.js website for FitX Fitness Studio, Sahiwal, with an admin panel for blogs, photos and site data, and a chatbot.'},
     faq_ld(faqs, SITE + p)]))

# ─────────────────────────── Service: Penetration testing ───────────────────────────
def service_ld(path, name, desc, stype):
    return {'@type': 'Service', '@id': SITE + path + '#service', 'name': name, 'serviceType': stype, 'description': desc,
            'provider': PERSON, 'url': SITE + path,
            'areaServed': [{'@type': 'City', 'name': 'Sahiwal'}, {'@type': 'Country', 'name': 'Pakistan'}, {'@type': 'Place', 'name': 'Worldwide (remote)'}]}

p = '/services/penetration-testing/'
faqs = [
    ('Is penetration testing legal?',
     'Yes — when it is authorised. I only test systems after the owner signs a written scope and rules of engagement that define exactly what may be tested, when and how. Testing without permission is illegal, and I never do it.'),
    ('Will a penetration test break my website?',
     'Testing is planned to be non-destructive: no denial-of-service attacks and no data deletion. For extra safety, risky tests can be run against a staging copy of your site instead of production.'),
    ('How long does a penetration test take?',
     'It depends on the scope. A small website or a single web application usually takes a few days of testing plus reporting; larger applications with many user roles or APIs take longer. You get a time estimate after scoping.'),
    ('What is the difference between a penetration test and a vulnerability scan?',
     'A scan runs automated tools and lists possible issues, often with false positives. A penetration test adds manual, human-led testing that confirms which issues are real, chains them together the way an attacker would, and shows their business impact.'),
]
pages.append(page(p,
    'Penetration Testing Services in Pakistan | Abdul Rafey',
    'Authorised penetration testing for websites, web apps and APIs in Pakistan and worldwide — OWASP methodology, severity-rated report and free retest.',
    [('Home', '/'), ('Services', '/#services'), ('Penetration Testing', p)],
    f'''      <header class="page-hero">
        <p class="eyebrow">Service · Offensive security</p>
        <h1>Penetration Testing for Websites, Web Apps &amp; APIs</h1>
        <p class="lead">I attack your application the way a real adversary would — with your written permission — then show you exactly what I found, how serious it is and how to fix it. Based in Sahiwal, Pakistan; testing remotely for clients worldwide.</p>
        <div class="meta-row"><span><b>Scope:</b> web apps · APIs · authentication · cloud-hosted sites</span><span><b>Standards:</b> OWASP WSTG · OWASP Top 10 · MITRE ATT&amp;CK</span></div>
      </header>
      <article class="article">
        <h2>What I test</h2>
        <div class="cards">
          <div class="card glass"><h3>Web applications</h3><p>Access control, injection, business-logic flaws, file uploads and client-side security.</p></div>
          <div class="card glass"><h3>APIs</h3><p>Broken object-level authorisation, mass assignment, rate limiting and data exposure.</p></div>
          <div class="card glass"><h3>Authentication</h3><p>Login, password reset, session handling, MFA bypass and account takeover paths.</p></div>
          <div class="card glass"><h3>Configuration</h3><p>Security headers, TLS, exposed files and secrets, cloud and server misconfiguration.</p></div>
        </div>
        <h2>Methodology</h2>
        <ol>
          <li><strong>Scoping &amp; authorisation.</strong> We agree targets, test windows, accounts and rules of engagement in writing before anything starts.</li>
          <li><strong>Reconnaissance.</strong> Mapping the attack surface: subdomains, endpoints, technologies and user roles.</li>
          <li><strong>Vulnerability discovery.</strong> Automated scanning combined with manual testing against the OWASP Web Security Testing Guide.</li>
          <li><strong>Controlled exploitation.</strong> Confirming real impact safely — proving a flaw is exploitable without damaging data or availability.</li>
          <li><strong>Reporting.</strong> Every finding with severity, evidence, reproduction steps and a concrete fix.</li>
          <li><strong>Retest.</strong> After you fix the issues, I verify the fixes and update the report.</li>
        </ol>
        <h2>What you receive</h2>
        <ul>
          <li><strong>Executive summary</strong> in plain language for owners and managers.</li>
          <li><strong>Technical findings</strong> ranked by severity (critical, high, medium, low) with proof and reproduction steps.</li>
          <li><strong>Remediation guidance</strong> your developers can act on immediately.</li>
          <li><strong>Retest results</strong> confirming which issues are closed.</li>
        </ul>
        <div class="callout"><strong>Not sure you need a full penetration test?</strong> A <a href="/services/website-security-audit/">website security audit</a> is a faster, lower-cost review that catches the most common weaknesses. Read my <a href="/blog/owasp-top-10-checklist/">OWASP Top 10:2025 checklist</a> to see what attackers look for first.</div>
        {faq_html(faqs)}
      </article>
      {cta('Book a penetration test', 'Tell me what you want tested and I will send a scope and time estimate.', 'Penetration testing enquiry')}''',
    [service_ld(p, 'Penetration Testing', 'Authorised penetration testing of websites, web applications and APIs using OWASP-based methodology, with a severity-rated report and retest.', 'Penetration testing'),
     faq_ld(faqs, SITE + p)]))

# ─────────────────────────── Service: Web development ───────────────────────────
p = '/services/web-development/'
faqs = [
    ('What kind of websites and apps do you build?',
     'Business websites, custom web applications and dashboards (like my finance management software), and immersive 3D websites built with Three.js (like the FitX gym website and this portfolio).'),
    ('Do you work with clients outside Sahiwal?',
     'Yes. I am based in Sahiwal, Punjab, and work with clients across Pakistan and worldwide remotely.'),
    ('Is SEO included?',
     'Technical SEO is built in from day one: semantic HTML, fast loading, structured data, a sitemap and correct metadata on every page.'),
    ('Can I update the website myself after launch?',
     'Yes. Where you need it, I add an admin panel so your team can publish posts, photos and other content without a developer.'),
]
pages.append(page(p,
    'Secure Web Development in Sahiwal, Pakistan | Abdul Rafey',
    'Custom websites, web apps, dashboards and 3D websites — secure, fast and SEO-ready, by a senior developer and security specialist in Sahiwal, Pakistan.',
    [('Home', '/'), ('Services', '/#services'), ('Web Development', p)],
    f'''      <header class="page-hero">
        <p class="eyebrow">Service · Engineering</p>
        <h1>Secure Web Development in Sahiwal, Pakistan</h1>
        <p class="lead">Websites and web applications engineered by a developer who is also a penetration tester — so security, speed and SEO are designed in from the first line of code, not bolted on later.</p>
      </header>
      <article class="article">
        <h2>What I build</h2>
        <div class="cards">
          <a class="card glass" href="/projects/finance-management-software/"><h3>Web apps &amp; dashboards</h3><p>Management systems with roles, reports and analytics — like my finance management software.</p><span class="more">See the case study →</span></a>
          <a class="card glass" href="/projects/fitx-3d-gym-website/"><h3>3D websites</h3><p>Immersive Three.js experiences with an admin panel and chatbot — like the FitX gym website.</p><span class="more">See the case study →</span></a>
          <div class="card glass"><h3>Business websites</h3><p>Fast, responsive company sites that rank on Google and turn visitors into enquiries.</p></div>
          <div class="card glass"><h3>Admin panels &amp; APIs</h3><p>Content management, integrations and secure back-end APIs.</p></div>
        </div>
        <h2>How every project is built</h2>
        <ul>
          <li><strong>Security-first:</strong> OWASP Top 10 protections, strict security headers (CSP, HSTS), safe authentication and least-privilege access.</li>
          <li><strong>Fast:</strong> optimised for Core Web Vitals, compressed images and edge hosting.</li>
          <li><strong>Search-ready:</strong> semantic HTML, structured data, sitemap and per-page metadata.</li>
          <li><strong>Accessible:</strong> keyboard-friendly, readable contrast and screen-reader support.</li>
          <li><strong>Cloud-deployed:</strong> automatic deployments with CI/CD on Cloudflare or AWS.</li>
        </ul>
        <h2>Process</h2>
        <ol>
          <li><strong>Discovery</strong> — goals, audience, features and budget.</li>
          <li><strong>Design</strong> — layout and user flow agreed before building.</li>
          <li><strong>Build</strong> — weekly progress you can see on a live preview link.</li>
          <li><strong>Security &amp; quality testing</strong> — I test my own work like an attacker would.</li>
          <li><strong>Launch &amp; support</strong> — deployment, monitoring and help after go-live.</li>
        </ol>
        {faq_html(faqs)}
      </article>
      {cta('Start your project', 'Share your idea and I will reply with next steps within 24 hours.', 'Web development enquiry')}''',
    [service_ld(p, 'Secure Web Development', 'Custom websites, web applications, dashboards and 3D websites built secure, fast and SEO-ready.', 'Web development'),
     faq_ld(faqs, SITE + p)]))

# ─────────────────────────── Service: Website security audit ───────────────────────────
p = '/services/website-security-audit/'
faqs = [
    ('What is the difference between a security audit and a penetration test?',
     'An audit is a structured review of your website’s configuration and common weaknesses — fast and affordable. A penetration test goes deeper, with manual attempts to actually exploit flaws. Many clients start with an audit and move to a penetration test for critical applications.'),
    ('Do you need access to my server or code?',
     'Not necessarily. Most checks work from the outside, as an attacker would see your site. Optional access to the admin panel, hosting or DNS lets me review more and fix issues faster.'),
    ('Can you also fix the problems you find?',
     'Yes. Every report includes clear fixes, and I can implement them for you — security headers, updates, email authentication and configuration changes.'),
]
pages.append(page(p,
    'Website Security Audit in Pakistan | Abdul Rafey',
    'Website security audit: OWASP Top 10, security headers, TLS, login security, exposed files, outdated plugins and email authentication — with a clear fix-list.',
    [('Home', '/'), ('Services', '/#services'), ('Website Security Audit', p)],
    f'''      <header class="page-hero">
        <p class="eyebrow">Service · Defensive security</p>
        <h1>Website Security Audit &amp; Vulnerability Assessment</h1>
        <p class="lead">A fast, structured check of your website against the weaknesses attackers exploit most — delivered as a prioritised fix-list you can act on the same day.</p>
      </header>
      <article class="article">
        <h2>What the audit covers</h2>
        <table>
          <thead><tr><th>Area</th><th>What I check</th></tr></thead>
          <tbody>
            <tr><td>OWASP Top 10</td><td>Access control, injection, misconfiguration, authentication and other <a href="/blog/owasp-top-10-checklist/">OWASP Top 10:2025</a> risks.</td></tr>
            <tr><td>Security headers</td><td>Content-Security-Policy, HSTS, X-Frame-Options, Referrer-Policy and Permissions-Policy.</td></tr>
            <tr><td>TLS / HTTPS</td><td>Certificate validity, protocol versions, redirects and mixed content.</td></tr>
            <tr><td>Login &amp; sessions</td><td>Password policy, brute-force protection, session cookies and MFA.</td></tr>
            <tr><td>Exposure</td><td>Public backups, <code>.git</code> folders, admin panels, debug pages and leaked secrets.</td></tr>
            <tr><td>Software</td><td>Outdated CMS versions, plugins, themes and JavaScript libraries.</td></tr>
            <tr><td>Email security</td><td>SPF, DKIM and DMARC records that stop spoofing — see my <a href="/blog/spf-dkim-dmarc-guide/">SPF, DKIM &amp; DMARC guide</a>.</td></tr>
            <tr><td>Credentials</td><td>Company emails and passwords exposed in known data breaches.</td></tr>
          </tbody>
        </table>
        <h2>Your report</h2>
        <ul>
          <li>An overall risk rating and a plain-language summary.</li>
          <li>Each issue ranked by severity, with evidence.</li>
          <li>Step-by-step fixes — or I implement them for you.</li>
        </ul>
        <p>Need deeper assurance for a critical application? Upgrade to a full <a href="/services/penetration-testing/">penetration test</a>.</p>
        {faq_html(faqs)}
      </article>
      {cta('Get your website audited', 'Send me your website address and I will tell you what the audit will cover.', 'Website security audit')}''',
    [service_ld(p, 'Website Security Audit', 'Structured website security audit covering OWASP Top 10, security headers, TLS, authentication, exposed files, outdated software, email authentication and leaked credentials.', 'Security audit'),
     faq_ld(faqs, SITE + p)]))

# ─────────────────────────── Blog posts ───────────────────────────
POSTS = []
def post(slug, title, h1, desc, excerpt, body, keywords):
    path = f'/blog/{slug}/'
    POSTS.append((path, h1, excerpt))
    pages.append(page(path, title, desc,
        [('Home', '/'), ('Blog', '/blog/'), (html.unescape(h1), path)],
        f'''      <header class="page-hero">
        <p class="eyebrow">Blog · Cybersecurity</p>
        <h1>{h1}</h1>
        <p class="lead">{excerpt}</p>
        <div class="meta-row"><span>By <b>Abdul Rafey</b></span><span><time datetime="{TODAY}">31 October 2026</time></span></div>
      </header>
      <article class="article">
{body}
        <p><em>Written by Abdul Rafey — senior developer, penetration tester and cybersecurity specialist (Harvard CS50 Cybersecurity) based in Sahiwal, Pakistan.</em></p>
      </article>
      {cta('Want me to check your website?', 'I can review this for you and fix what is missing.', 'Security check')}''',
        [{'@type': 'BlogPosting', '@id': SITE + path + '#post', 'headline': html.unescape(h1), 'description': desc,
          'datePublished': TODAY + 'T09:00:00+05:00', 'dateModified': TODAY + 'T09:00:00+05:00',
          'author': PERSON, 'publisher': PERSON, 'image': SITE + '/assets/images/og-cover.jpg',
          'mainEntityOfPage': {'@id': SITE + path + '#webpage'}, 'keywords': keywords, 'inLanguage': 'en'}]))

post('spf-dkim-dmarc-guide',
     'SPF, DKIM & DMARC Explained: Stop Emails Going to Spam',
     'SPF, DKIM &amp; DMARC Explained: How to Stop Your Emails Going to Spam',
     'A practical guide to SPF, DKIM and DMARC: what each record does, example DNS records, a safe rollout plan and how to check your domain.',
     'If your business emails land in spam — or criminals send fake emails “from” your domain — these three DNS records are the fix. Here is what each one does and how to set them up safely.',
     '''        <h2>Why this matters now</h2>
        <p>Email was never designed to prove who sent a message. Anyone can put <code>ceo@yourcompany.com</code> in the From line. To fight spoofing and spam, mailbox providers check three DNS records on your domain — and since 2024 Gmail and Yahoo require them from bulk senders, while unauthenticated mail from smaller senders is increasingly filtered too.</p>
        <h2>SPF — who is allowed to send</h2>
        <p><strong>SPF (Sender Policy Framework)</strong> is a TXT record listing the servers allowed to send email for your domain. For a domain that sends through Google Workspace:</p>
        <pre><code>Type: TXT   Name: @
v=spf1 include:_spf.google.com ~all</code></pre>
        <ul>
          <li>Add an <code>include:</code> for every service that sends as you (your email provider, newsletter tool, CRM, invoicing app).</li>
          <li>A domain must have <strong>only one</strong> SPF record — merge them instead of adding a second.</li>
          <li>SPF allows at most 10 DNS lookups; too many includes make the whole record fail.</li>
          <li><code>~all</code> (soft fail) is a safe start; <code>-all</code> rejects everything not listed.</li>
        </ul>
        <h2>DKIM — a tamper-proof signature</h2>
        <p><strong>DKIM (DomainKeys Identified Mail)</strong> adds a cryptographic signature to every message. Your provider signs mail with a private key; receivers check it against a public key you publish in DNS. If the message was altered in transit, the check fails.</p>
        <pre><code>Type: TXT   Name: google._domainkey
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...</code></pre>
        <p>You do not write this record yourself: generate it in your email provider’s admin console (for Google Workspace: Admin → Apps → Gmail → Authenticate email), publish it, then switch signing on. Use 2048-bit keys where offered.</p>
        <h2>DMARC — the policy that ties it together</h2>
        <p><strong>DMARC</strong> tells receivers what to do when a message fails SPF and DKIM <em>alignment</em> — meaning the domain that passed must match the domain in the visible From address — and where to send reports.</p>
        <pre><code>Type: TXT   Name: _dmarc
v=DMARC1; p=none; rua=mailto:dmarc-reports@yourcompany.com</code></pre>
        <h2>A safe rollout plan</h2>
        <ol>
          <li><strong>Inventory</strong> every service that sends email as your domain.</li>
          <li><strong>Publish SPF and enable DKIM</strong> for each of them.</li>
          <li><strong>Start DMARC at <code>p=none</code></strong> — monitoring only — and read the aggregate reports for two to four weeks.</li>
          <li><strong>Fix</strong> any legitimate sender that fails.</li>
          <li><strong>Tighten</strong> to <code>p=quarantine</code> (failures go to spam), then <code>p=reject</code> (failures are blocked).</li>
        </ol>
        <div class="callout">Jumping straight to <code>p=reject</code> can block your own invoices or newsletters. Monitor first, enforce second.</div>
        <h2>Gmail and Yahoo bulk-sender rules</h2>
        <p>If you send large volumes to personal Gmail or Yahoo inboxes (Google’s line is around 5,000 messages a day), you must authenticate with SPF and DKIM, publish DMARC with alignment, offer one-click unsubscribe in marketing mail, and keep spam complaints below 0.3%. Below that volume the rules are softer — but authenticated mail still lands in the inbox far more reliably.</p>
        <h2>How to check your domain</h2>
        <pre><code>dig +short TXT yourcompany.com
dig +short TXT _dmarc.yourcompany.com
dig +short TXT google._domainkey.yourcompany.com</code></pre>
        <p>In Gmail you can also open any message you sent, choose <strong>Show original</strong>, and confirm SPF, DKIM and DMARC all say <code>PASS</code>.</p>
        <p>Setting this up is part of my <a href="/services/website-security-audit/">website security audit</a> — I can configure and verify all three records for you.</p>''',
     'SPF, DKIM, DMARC, email security, email deliverability, spam')

post('owasp-top-10-checklist',
     'OWASP Top 10:2025 Checklist for Small Business Websites',
     'OWASP Top 10:2025 — A Practical Security Checklist for Your Website',
     'The OWASP Top 10:2025 explained in plain language, with a practical checklist for each risk that small business websites and web apps can act on today.',
     'The OWASP Top 10 is the industry’s list of the most critical web application security risks. Here is the 2025 edition in plain language — and what to check on your own site for each one.',
     '''        <h2>What is the OWASP Top 10?</h2>
        <p>The <strong>Open Worldwide Application Security Project (OWASP)</strong> publishes the Top 10 from real-world vulnerability data and practitioner surveys. It is the baseline most security audits and penetration tests are measured against. The 2025 edition adds two new categories — software supply chain failures and the mishandling of exceptional conditions.</p>
        <h2>The list, with a checklist for each</h2>
        <h3>A01:2025 — Broken Access Control</h3>
        <p>Users can do or see things they should not, such as opening another customer’s invoice by changing an ID in the URL.</p>
        <ul><li>Enforce permissions on the server for every request — never rely on hidden buttons.</li><li>Deny by default; test every user role, including logged-out visitors.</li></ul>
        <h3>A02:2025 — Security Misconfiguration</h3>
        <p>Default passwords, debug mode in production, open cloud storage, missing security headers.</p>
        <ul><li>Turn off debug output and directory listing; remove sample files.</li><li>Send security headers (CSP, HSTS, X-Frame-Options) and review cloud permissions.</li></ul>
        <h3>A03:2025 — Software Supply Chain Failures</h3>
        <p>New in 2025: compromised or vulnerable libraries, plugins, build tools and update channels.</p>
        <ul><li>Keep an inventory of dependencies and plugins; remove what you do not use.</li><li>Update promptly and install only from trusted, maintained sources.</li></ul>
        <h3>A04:2025 — Cryptographic Failures</h3>
        <p>Sensitive data sent or stored without strong encryption.</p>
        <ul><li>Use HTTPS everywhere with HSTS; never store plain-text passwords — use a slow hash such as bcrypt or Argon2.</li></ul>
        <h3>A05:2025 — Injection</h3>
        <p>Untrusted input interpreted as code: SQL injection, cross-site scripting (XSS), command injection.</p>
        <ul><li>Use parameterised queries and output encoding; validate input on the server.</li><li>A strict Content-Security-Policy limits the damage of any XSS that slips through.</li></ul>
        <h3>A06:2025 — Insecure Design</h3>
        <p>Flaws in the logic itself — for example, a password reset that can be guessed, or a checkout that trusts prices sent by the browser.</p>
        <ul><li>Threat-model important features before building them; rate-limit sensitive actions.</li></ul>
        <h3>A07:2025 — Authentication Failures</h3>
        <p>Weak login, session and credential handling that enables account takeover.</p>
        <ul><li>Offer multi-factor authentication; block brute-force and credential-stuffing attempts.</li><li>Expire sessions properly and use secure, HttpOnly cookies.</li></ul>
        <h3>A08:2025 — Software or Data Integrity Failures</h3>
        <p>Trusting code or data without verifying it — unsigned updates or insecure deserialisation.</p>
        <ul><li>Verify integrity (signatures, checksums) of updates and third-party scripts; protect your CI/CD pipeline.</li></ul>
        <h3>A09:2025 — Logging &amp; Alerting Failures</h3>
        <p>Attacks go unnoticed because nothing is logged — or nobody is alerted.</p>
        <ul><li>Log logins, failures and admin actions; alert on suspicious spikes and review regularly.</li></ul>
        <h3>A10:2025 — Mishandling of Exceptional Conditions</h3>
        <p>New in 2025: applications that fail unsafely under errors or unexpected input — leaking stack traces or “failing open” and granting access.</p>
        <ul><li>Show generic error pages to users and log details privately; make failures deny access, not grant it.</li></ul>
        <h2>Where to start</h2>
        <p>For most small business websites, the quickest wins are updating every plugin and library (A03), adding security headers and removing debug settings (A02), and turning on multi-factor authentication for every admin account (A07).</p>
        <p>Want an expert to check your site against the full list? Start with a <a href="/services/website-security-audit/">website security audit</a>, or go deeper with a <a href="/services/penetration-testing/">penetration test</a>.</p>''',
     'OWASP Top 10 2025, web application security, website security checklist, penetration testing')

# ─────────────────────────── Blog index ───────────────────────────
p = '/blog/'
items = '\n'.join(f'''        <a class="card glass" href="{path}"><time datetime="{TODAY}">31 October 2026</time><h2>{h1}</h2><p>{ex}</p><span class="more">Read article →</span></a>''' for path, h1, ex in POSTS)
pages.append(page(p,
    'Cybersecurity & Web Development Blog | Abdul Rafey',
    'Practical articles on cybersecurity, penetration testing, email security and secure web development by Abdul Rafey, senior developer in Sahiwal, Pakistan.',
    [('Home', '/'), ('Blog', p)],
    f'''      <header class="page-hero">
        <p class="eyebrow">Blog</p>
        <h1>Cybersecurity &amp; Secure Web Development</h1>
        <p class="lead">Practical, no-fluff guides from my work as a developer and penetration tester.</p>
      </header>
      <div class="post-list">
{items}
      </div>''',
    [{'@type': 'Blog', '@id': SITE + p + '#blog', 'name': 'Abdul Rafey — Cybersecurity & Web Development Blog', 'author': PERSON,
      'blogPost': [{'@id': SITE + path + '#post'} for path, _, _ in POSTS]}], og_type='website'))

print('\n'.join(pages))
