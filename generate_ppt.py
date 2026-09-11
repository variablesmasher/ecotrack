import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # 16:9 Widescreen standard
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette - EcoTrack Dark Theme
    COLOR_BG = RGBColor(13, 21, 32)         # Deep Navy Slate (#0D1520)
    COLOR_CARD = RGBColor(22, 33, 49)       # Card Navy (#162131)
    COLOR_CARD_BORDER = RGBColor(38, 56, 82)
    COLOR_ACCENT = RGBColor(16, 185, 129)   # Emerald (#10B981)
    COLOR_ACCENT_LIGHT = RGBColor(110, 231, 183)
    COLOR_WHITE = RGBColor(248, 250, 252)   # Off-white (#F8FAFC)
    COLOR_MUTED = RGBColor(148, 163, 184)   # Slate Muted (#94A3B8)
    COLOR_AMBER = RGBColor(245, 158, 11)    # Amber (#F59E0B)
    COLOR_BLUE = RGBColor(59, 130, 246)     # Sky Blue (#3B82F6)

    def set_slide_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = COLOR_BG
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category="ECOTRACK SUSTAINABILITY INTELLIGENCE PLATFORM"):
        # Category Tag
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = COLOR_ACCENT

        # Main Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.7))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(22)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_WHITE

    def add_card(slide, left, top, width, height, title=None, border_color=COLOR_CARD_BORDER, fill_color=COLOR_CARD):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = fill_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)

        if title:
            title_box = slide.shapes.add_textbox(Inches(left + 0.25), Inches(top + 0.2), Inches(width - 0.5), Inches(0.45))
            tf = title_box.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = title
            p.font.size = Pt(14)
            p.font.bold = True
            p.font.color.rgb = COLOR_ACCENT_LIGHT

        return card

    # =========================================================================
    # SLIDE 1: TITLE SLIDE
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s1)

    # Accent decorative banner
    banner = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.8), Inches(0.15), Inches(3.8))
    banner.fill.solid()
    banner.fill.fore_color.rgb = COLOR_ACCENT
    banner.line.fill.background()

    # Title & Subtitle text box
    tbox = s1.shapes.add_textbox(Inches(1.2), Inches(1.7), Inches(11.0), Inches(3.8))
    tf = tbox.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "ECOTRACK PLATFORM"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = COLOR_ACCENT
    p.space_after = Pt(10)

    p2 = tf.add_paragraph()
    p2.text = "Corporate Sustainability Intelligence & Carbon Accounting"
    p2.font.size = Pt(32)
    p2.font.bold = True
    p2.font.color.rgb = COLOR_WHITE
    p2.space_after = Pt(14)

    p3 = tf.add_paragraph()
    p3.text = "System Architecture, Business Flow & Member 1: Authentication & Security Core"
    p3.font.size = Pt(18)
    p3.font.color.rgb = COLOR_MUTED
    p3.space_after = Pt(30)

    p4 = tf.add_paragraph()
    p4.text = "Role: Member 1 (Authentication, Authorization & Cryptographic Security)  |  Target: variablesmasher/ecotrack"
    p4.font.size = Pt(13)
    p4.font.color.rgb = COLOR_ACCENT_LIGHT

    s1.notes_slide.notes_text_frame.text = (
        "Welcome professors and examiners. Today I am presenting the EcoTrack Corporate Sustainability platform. "
        "I will first walk through the overall system architecture and end-to-end business flow, "
        "and then dive deep into my primary ownership: Member 1 - Authentication, Authorization, Cryptographic Security, "
        "and Identity Management."
    )

    # =========================================================================
    # SLIDE 2: MOTIVATION & PROBLEM STATEMENT
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s2)
    add_header(s2, "Problem Statement & Industry Motivation", "BACKGROUND & CONTEXT")

    add_card(s2, 0.8, 1.6, 3.6, 5.2, "The Corporate Challenge")
    box = s2.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(3.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    bullets = [
        ("ESG Mandates:", "Modern enterprises face strict government ESG disclosures (Scope 1, 2, 3 emissions)."),
        ("Fragmented Silos:", "Emissions data is trapped in manual spreadsheets across multiple departments."),
        ("No Audit Trail:", "Inability to verify who inputted what data, leading to compliance penalties."),
    ]
    for title, desc in bullets:
        p = tf.add_paragraph()
        p.text = f"{title} {desc}"
        p.font.size = Pt(12)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(12)

    add_card(s2, 4.8, 1.6, 3.6, 5.2, "The EcoTrack Solution")
    box = s2.shapes.add_textbox(Inches(5.0), Inches(2.2), Inches(3.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    bullets = [
        ("Unified SaaS Platform:", "Multi-tenant cloud platform aggregating enterprise sustainability data in real time."),
        ("Department Tracking:", "Monitors carbon emissions across Facilities, Logistics, Production, IT."),
        ("Audit-Ready Reports:", "Generates certified ESG analytics and PDF compliance exports."),
    ]
    for title, desc in bullets:
        p = tf.add_paragraph()
        p.text = f"{title} {desc}"
        p.font.size = Pt(12)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(12)

    add_card(s2, 8.8, 1.6, 3.7, 5.2, "Why Security is Paramount")
    box = s2.shapes.add_textbox(Inches(9.0), Inches(2.2), Inches(3.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    bullets = [
        ("Confidential Data:", "Corporate emissions figures directly impact investor ratings and public stock valuation."),
        ("Multi-Tenancy Isolation:", "Company A must NEVER access or alter Company B's emissions records."),
        ("Tamper Resistance:", "Strong cryptographic authentication guarantees data provenance and accountability."),
    ]
    for title, desc in bullets:
        p = tf.add_paragraph()
        p.text = f"{title} {desc}"
        p.font.size = Pt(12)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(12)

    s2.notes_slide.notes_text_frame.text = (
        "Slide 2 establishes the problem. Modern companies are legally mandated to report carbon footprints, "
        "but data is fragmented in spreadsheets. EcoTrack provides a single multi-tenant platform, which makes security and multi-tenancy "
        "critical because corporate ESG numbers are sensitive and legally binding."
    )

    # =========================================================================
    # SLIDE 3: PLATFORM ARCHITECTURE & TECH STACK
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s3)
    add_header(s3, "Full-Stack System Architecture & Technology Stack", "PLATFORM ENGINEERING")

    cols = [
        ("Frontend Layer", ["React 18 & TypeScript", "Vite (Fast HMR Bundler)", "Tailwind CSS & Lucide Icons", "Context API (Auth & Theme)", "Axios HTTP Interceptor", "Google Identity Services (GIS)"], 0.8),
        ("Backend Services", ["Node.js Runtime Environment", "Express.js REST API Server", "Mongoose ODM for MongoDB", "Bcrypt.js (10 Salt Rounds)", "JSON Web Tokens (JWT)", "Nodemailer SMTP Service"], 4.8),
        ("Data & Cloud Services", ["MongoDB Atlas / In-Memory", "TTL Automatic Expire Indexes", "Google OAuth 2.0 Web Client", "RESTful API Endpoints", "Render / Cloud Deployable", "CORS & Reverse Proxy Routing"], 8.8)
    ]
    for title, items, left in cols:
        add_card(s3, left, 1.6, 3.7, 5.2, title)
        box = s3.shapes.add_textbox(Inches(left + 0.2), Inches(2.3), Inches(3.3), Inches(4.2))
        tf = box.text_frame
        tf.word_wrap = True
        for item in items:
            p = tf.add_paragraph()
            p.text = f"- {item}"
            p.font.size = Pt(13)
            p.font.color.rgb = COLOR_WHITE
            p.space_after = Pt(10)

    s3.notes_slide.notes_text_frame.text = (
        "Here we show the architecture: React with TypeScript and Vite on the client, Express and Node.js on the backend, "
        "with MongoDB for persistence. Notice how security is baked in: JWTs, Bcrypt, Google OAuth, and Axios interceptors."
    )

    # =========================================================================
    # SLIDE 4: USER ROLES & PERMISSIONS
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s4)
    add_header(s4, "Enterprise Personas & Role Hierarchy", "ACCESS CONTROL FOUNDATION")

    roles = [
        ("Administrator ('admin')", [
            "Company Onboarding & Profile setup",
            "Full Department management (Add/Edit/Delete)",
            "User management & team role assignments",
            "Full emission log oversight & review",
            "Access to all system routes & settings"
        ], 0.8, COLOR_AMBER),
        ("Operations Employee ('employee')", [
            "Daily & monthly carbon activity entry",
            "Utility & invoice CSV bulk file upload",
            "Personal and departmental log history view",
            "Edit draft carbon entries before lock",
            "Restricted from company settings & reports"
        ], 4.8, COLOR_ACCENT_LIGHT),
        ("ESG Executive ('executive')", [
            "High-level ESG analytics & visual trends",
            "Audit-ready compliance report generation",
            "Cross-department comparison dashboards",
            "Sustainability performance KPI tracking",
            "Read-only access to operational logs"
        ], 8.8, COLOR_BLUE)
    ]
    for title, items, left, color in roles:
        add_card(s4, left, 1.6, 3.7, 5.2, title, border_color=color)
        box = s4.shapes.add_textbox(Inches(left + 0.2), Inches(2.3), Inches(3.3), Inches(4.2))
        tf = box.text_frame
        tf.word_wrap = True
        for item in items:
            p = tf.add_paragraph()
            p.text = f"- {item}"
            p.font.size = Pt(12)
            p.font.color.rgb = COLOR_WHITE
            p.space_after = Pt(12)

    s4.notes_slide.notes_text_frame.text = (
        "EcoTrack enforces the Principle of Least Privilege with three core roles: Admin controls the organization and users, "
        "Employee records operational emission data, and Executive views audit-ready sustainability analytics."
    )

    # =========================================================================
    # SLIDE 5: END-TO-END BUSINESS FLOW
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s5)
    add_header(s5, "End-to-End Platform Business Workflow", "SYSTEM FLOW")

    steps = [
        ("Step 1: Org Onboarding", "New company signs up, selects country, sets strong admin credentials. (Member 1)", 0.8),
        ("Step 2: Department Setup", "Admin configures operational units: Manufacturing, Logistics, IT, HR. (Member 1/2)", 3.25),
        ("Step 3: Activity Logging", "Employees record electricity, fuel, freight & flight carbon usage. (Member 2)", 5.7),
        ("Step 4: Carbon Analytics", "Platform computes metric tons CO2e & identifies high-emission spikes. (Member 3)", 8.15),
        ("Step 5: ESG Reporting", "Executive generates audit-compliant reports for investors and regulators. (Member 4)", 10.6)
    ]
    for title, desc, left in steps:
        add_card(s5, left, 1.8, 2.0, 4.8, title)
        box = s5.shapes.add_textbox(Inches(left + 0.15), Inches(2.6), Inches(1.7), Inches(3.8))
        tf = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = desc
        p.font.size = Pt(12)
        p.font.color.rgb = COLOR_WHITE

    s5.notes_slide.notes_text_frame.text = (
        "This slide shows the entire lifecycle: from registration and department creation, through daily logging, "
        "to data analytics and final ESG reporting. Notice that Step 1 is the prerequisite gateway for everything else."
    )

    # =========================================================================
    # SLIDE 6: TEAM RESPONSIBILITIES
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s6)
    add_header(s6, "Team Division of Responsibilities", "PROJECT COLLABORATION")

    team = [
        ("Member 1 (Our Focus)", "Authentication & Security", [
            "Real JWT Authentication & Session Token",
            "Bcrypt (10 Salt Rounds) Password Storage",
            "Google OAuth 2.0 & Identity Services",
            "Forgot Password with 6-Digit Email OTP",
            "Strong Password Validator & Live Meter",
            "Role-Based Access Control (RBAC)"
        ], 0.8, True),
        ("Member 2", "Carbon Activity Logging", [
            "Carbon log entry forms (Scope 1, 2, 3)",
            "Bulk CSV file parsing & invoice upload",
            "Activity category filtering & pagination",
            "Department log attribution & tags",
            "Activity audit timestamps"
        ], 4.8, False),
        ("Members 3 & 4", "Analytics & Reporting", [
            "Monthly emissions trend charts",
            "Departmental breakdown bar graphs",
            "Net-zero reduction progress bars",
            "PDF report generation & export",
            "Compliance audit summaries"
        ], 8.8, False)
    ]
    for name, subtitle, tasks, left, is_focus in team:
        border = COLOR_ACCENT if is_focus else COLOR_CARD_BORDER
        add_card(s6, left, 1.6, 3.7, 5.2, f"{name}\n{subtitle}", border_color=border)
        box = s6.shapes.add_textbox(Inches(left + 0.2), Inches(2.4), Inches(3.3), Inches(4.2))
        tf = box.text_frame
        tf.word_wrap = True
        for task in tasks:
            p = tf.add_paragraph()
            p.text = f"- {task}"
            p.font.size = Pt(12)
            p.font.color.rgb = COLOR_ACCENT_LIGHT if is_focus else COLOR_WHITE
            p.space_after = Pt(8)

    s6.notes_slide.notes_text_frame.text = (
        "Here is the scope division. While other members handled logging, charts, and reports, "
        "Member 1 built the security backbone that protects every single one of those endpoints and user workflows."
    )

    # =========================================================================
    # SLIDE 7: TRANSITION TO MEMBER 1
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s7)
    
    # Large spotlight card
    add_card(s7, 1.5, 1.4, 10.3, 4.8, "DEEP DIVE: MEMBER 1 OWNERSHIP", border_color=COLOR_ACCENT)
    box = s7.shapes.add_textbox(Inches(1.8), Inches(2.2), Inches(9.7), Inches(3.6))
    tf = box.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "Authentication, Cryptographic Security & Access Control"
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = COLOR_WHITE
    p.space_after = Pt(20)

    features = [
        "Eliminated Mock Auth: Replaced simulated logins with enterprise-grade cryptographic JWT tokens.",
        "Production Password Hashing: Bcrypt with 10 salt rounds and timing-attack resistance.",
        "Google Single Sign-On: Google Identity Services (GIS) with backend RSA certificate verification.",
        "Multi-Step Account Recovery: 6-digit cryptographic OTP, Nodemailer SMTP, and MongoDB TTL.",
        "NIST/OWASP Password Standards: Real-time client evaluation widget & server enforcement.",
        "End-to-End RBAC: Client route guarding (ProtectedRoute) and server API middleware (requireRole)."
    ]
    for feat in features:
        p = tf.add_paragraph()
        p.text = f"  *  {feat}"
        p.font.size = Pt(13)
        p.font.color.rgb = COLOR_ACCENT_LIGHT
        p.space_after = Pt(8)

    s7.notes_slide.notes_text_frame.text = (
        "Now we transition fully into Member 1. My goal was clear: take EcoTrack from a prototype with mock authentication "
        "to a production-ready, bank-grade security architecture with real JWTs, Bcrypt, Google OAuth, and OTP account recovery."
    )

    # =========================================================================
    # SLIDE 8: ARCHITECTURE OF AUTH SUBSYSTEM
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s8)
    add_header(s8, "Member 1: Authentication Subsystem Architecture", "ARCHITECTURE DEEP DIVE")

    add_card(s8, 0.8, 1.6, 5.6, 5.2, "Client-Side Authentication Layer")
    box = s8.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.4))
    tf = box.text_frame
    tf.word_wrap = True
    client_points = [
        ("AuthContext (React Context):", "Centralizes session state (token, user, role). Handles login(), register(), googleLogin(), and logout()."),
        ("localStorage Persistence:", "Stores '{ token, user }' and automatically re-hydrates session via /api/auth/me on refresh."),
        ("Axios Request Interceptor:", "Automatically reads token and stamps 'Authorization: Bearer <token>' on all outgoing API calls."),
        ("PasswordStrengthMeter:", "Evaluates 5 complexity criteria live with reactive 4-color visual progress bars."),
        ("ProtectedRoute Guard:", "Enforces client-side route protection and role redirects.")
    ]
    for t, d in client_points:
        p = tf.add_paragraph()
        p.text = f"{t} {d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(8)

    add_card(s8, 6.8, 1.6, 5.7, 5.2, "Server-Side Security Layer")
    box = s8.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.4))
    tf = box.text_frame
    tf.word_wrap = True
    server_points = [
        ("authController.ts:", "7 core endpoints: register, login, googleLogin, forgotPassword, verifyOtp, resetPassword, getMe."),
        ("requireAuth Middleware:", "Extracts Bearer token, verifies JWT cryptographic signature, and loads user profile."),
        ("requireRole Middleware:", "Factory middleware verifying user role against route permission whitelist (HTTP 403)."),
        ("passwordValidator.ts:", "Backend validation enforcing NIST/OWASP complexity prior to hashing."),
        ("Otp & User Models:", "Mongoose schemas with unique email indexing and 10-minute MongoDB TTL indexes.")
    ]
    for t, d in server_points:
        p = tf.add_paragraph()
        p.text = f"{t} {d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(8)

    s8.notes_slide.notes_text_frame.text = (
        "Slide 8 shows the two sides of our auth architecture: the React client layer with AuthContext and Axios interceptor, "
        "and the Express server layer with authController and security middlewares."
    )

    # =========================================================================
    # SLIDE 9: REGISTRATION & ONBOARDING
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s9)
    add_header(s9, "Multi-Tenant Registration & Organization Setup", "USER ONBOARDING")

    add_card(s9, 0.8, 1.6, 5.6, 5.2, "Registration Workflow (Atomic Provisioning)")
    box = s9.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    steps = [
        ("1. Input Data:", "Collects Organization Name, Country/Region, Admin Name, Email, and Password."),
        ("2. Real-Time Verification:", "Frontend checks confirm-password match & 5 complexity rules."),
        ("3. Duplicate Check:", "Backend queries User.findOne({ email }) -> returns HTTP 409 Conflict if taken."),
        ("4. Organization Creation:", "Provisions Company document in MongoDB with selected region."),
        ("5. User Creation:", "Hashes password via bcrypt and creates User with role='admin' linked to companyId."),
        ("6. Session Issuance:", "Signs 7-day JWT containing { id, role: 'admin', companyId } and returns HTTP 201.")
    ]
    for t, d in steps:
        p = tf.add_paragraph()
        p.text = f"{t} {d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(7)

    add_card(s9, 6.8, 1.6, 5.7, 5.2, "Multi-Tenancy Security Model")
    box = s9.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    mt_points = [
        ("Tenant Isolation:", "Every user is strictly anchored to a 'companyId' foreign key."),
        ("Automatic Admin Elevation:", "The first registrant of an organization is granted role='admin', establishing ownership."),
        ("Cross-Tenant Shielding:", "Every subsequent API request filters data by req.user.companyId, ensuring complete data privacy between rival corporations."),
        ("Lowercase Normalization:", "Emails are trimmed and lowercased to prevent duplicate accounts due to casing differences.")
    ]
    for t, d in mt_points:
        p = tf.add_paragraph()
        p.text = f"{t} {d}"
        p.font.size = Pt(12)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(12)

    s9.notes_slide.notes_text_frame.text = (
        "When a user signs up on EcoTrack, they don't just create an account; they provision an entire organization tenant. "
        "The system creates both the Company and User records, assigns the admin role, and issues a JWT."
    )

    # =========================================================================
    # SLIDE 10: PASSWORD COMPLEXITY & VALIDATOR
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s10)
    add_header(s10, "Password Complexity: NIST & OWASP Standards", "CREDENTIAL SECURITY")

    add_card(s10, 0.8, 1.6, 5.6, 5.2, "5 Security Criteria Enforced")
    box = s10.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    rules = [
        ("1. Length (>= 8 characters):", "Protects against standard brute-force search spaces."),
        ("2. Uppercase Letter [A-Z]:", "Increases character variety and key entropy."),
        ("3. Lowercase Letter [a-z]:", "Enforces diverse character sets."),
        ("4. Number [0-9]:", "Prevents purely alphabetical dictionary attacks."),
        ("5. Special Symbol [!@#$%^&*]:", "Prevents automated rainbow table lookups.")
    ]
    for r, exp in rules:
        p = tf.add_paragraph()
        p.text = f"{r}\n  -> {exp}"
        p.font.size = Pt(12)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(8)

    add_card(s10, 6.8, 1.6, 5.7, 5.2, "Dual-Layer Validation Architecture")
    box = s10.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    dual = [
        ("Client Layer (UX & Immediate Feedback):", "PasswordStrengthMeter dynamically renders 4 color-coded segments (Weak -> Fair -> Strong) and checklist checkmarks as the user types."),
        ("Server Layer (Authoritative Gatekeeper):", "validateStrongPassword() in server/utils/passwordValidator.ts re-validates the password before hashing. If any rule fails, returns HTTP 400 Bad Request with a clear corrective message."),
        ("Why Both Layers?", "Client-side validation can be bypassed using cURL or Postman. The server validation ensures that zero weak passwords ever reach the database.")
    ]
    for t, d in dual:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    s10.notes_slide.notes_text_frame.text = (
        "We implement NIST and OWASP password complexity rules. Notice that we validate twice: "
        "on the client for visual feedback, and on the server for authoritative security."
    )

    # =========================================================================
    # SLIDE 11: BCRYPT HASHING
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s11)
    add_header(s11, "Password Hashing via Bcrypt (10 Salt Rounds)", "CRYPTOGRAPHY CORE")

    add_card(s11, 0.8, 1.6, 5.6, 5.2, "Why Bcrypt vs MD5 / SHA-256")
    box = s11.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    bc_points = [
        ("The Problem with SHA-256:", "SHA-256 is designed for speed (gigahashes/sec on GPUs). Attackers can test billions of guesses per second using Rainbow Tables."),
        ("Bcrypt Adaptive Work Factor:", "Uses 10 salt rounds (2^10 = 1,024 key expansion iterations). Intentionally consumes CPU cycles so brute force attacks are computationally impractical."),
        ("Unique Cryptographic Salt:", "Bcrypt generates a unique random 22-character salt for each password. Even identical passwords yield completely different stored hashes."),
        ("Timing-Attack Resistance:", "bcrypt.compare() compares hashes in constant time, preventing hackers from measuring microsecond response differences.")
    ]
    for t, d in bc_points:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(8)

    add_card(s11, 6.8, 1.6, 5.7, 5.2, "Anatomy of a Stored Bcrypt Hash")
    box = s11.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    hash_anatomy = [
        ("Stored Hash Example:", "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"),
        ("Breakdown:", "  * $2a$ = Algorithm identifier (Bcrypt)\n  * 10 = Cost factor (1024 rounds)\n  * N9qo8uLOickgx2ZMRZoMye = 22-character Salt\n  * IjZAgcfl7p92ldGxad68LJZdL17lhWy = 31-character Hash Digest"),
        ("Key Viva Takeaway:", "Hashing is strictly one-way! We never decrypt passwords. When logging in, we hash the submitted password with the stored salt and compare the resulting digests.")
    ]
    for t, d in hash_anatomy:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(8)

    s11.notes_slide.notes_text_frame.text = (
        "Examiners love asking about Bcrypt. Make sure to emphasize: hashing is one-way, 10 rounds means 1024 iterations, "
        "the unique salt prevents Rainbow Tables, and timing attacks are neutralized."
    )

    # =========================================================================
    # SLIDE 12: USER LOGIN & SESSION ISSUANCE
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s12)
    add_header(s12, "User Authentication & Session Issuance Lifecycle", "LOGIN WORKFLOW")

    add_card(s12, 0.8, 1.6, 5.6, 5.2, "Login Verification Lifecycle")
    box = s12.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    login_steps = [
        ("1. Submission:", "User inputs email and password on LoginPage.tsx."),
        ("2. Normalization:", "Email trimmed and converted to lowercase."),
        ("3. Database Query:", "User.findOne({ email }). If not found, returns generic HTTP 401 'Invalid email or password' (prevents user enumeration)."),
        ("4. Bcrypt Verification:", "bcrypt.compare(password, user.password) compares candidate against DB hash."),
        ("5. Organization Lookup:", "Fetches Company record to enrich session with organization details."),
        ("6. JWT Generation:", "Signs 7-day session token containing user ID, role, and companyId.")
    ]
    for t, d in login_steps:
        p = tf.add_paragraph()
        p.text = f"{t} {d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(7)

    add_card(s12, 6.8, 1.6, 5.7, 5.2, "Security Design Decisions")
    box = s12.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    decisions = [
        ("Anti-Enumeration Error Messages:", "Whether the email does not exist or the password is incorrect, the server returns the identical message: 'Invalid email or password'. This prevents hackers from discovering valid accounts."),
        ("Password Hash Exclusion:", "Password hashes are never returned in login responses or stored in React state. Only safe profile fields (name, email, role, avatar) are exposed."),
        ("Session Re-hydration:", "When the user refreshes their browser, AuthContext calls GET /api/auth/me using the stored JWT to verify the account is still active.")
    ]
    for t, d in decisions:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    s12.notes_slide.notes_text_frame.text = (
        "Here is the login lifecycle. Point out the security defense against user enumeration: "
        "we return 'Invalid email or password' regardless of whether the email or password was wrong."
    )

    # =========================================================================
    # SLIDE 13: JWT & STATELESS AUTH
    # =========================================================================
    s13 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s13)
    add_header(s13, "JSON Web Tokens (JWT) & Stateless Architecture", "SESSION TOKEN SPECIFICATION")

    add_card(s13, 0.8, 1.6, 5.6, 5.2, "Anatomy of an EcoTrack JWT")
    box = s13.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    jwt_parts = [
        ("Header (Base64Url):", "{ 'alg': 'HS256', 'typ': 'JWT' }"),
        ("Payload (Claims):", "{\n  'id': '65f01a8b...',\n  'role': 'admin',\n  'companyId': '65f019fc...',\n  'iat': 1710192000,\n  'exp': 1710796800 (7 days)\n}"),
        ("Signature:", "HMACSHA256(\n  base64Url(Header) + '.' + base64Url(Payload),\n  process.env.JWT_SECRET\n)"),
        ("Tamper-Proof Guarantee:", "If an attacker changes 'role' from 'employee' to 'admin', the signature will not match and the server rejects it instantly with HTTP 401.")
    ]
    for t, d in jwt_parts:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(7)

    add_card(s13, 6.8, 1.6, 5.7, 5.2, "Why Stateless Beats Stateful Sessions")
    box = s13.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    comp = [
        ("Traditional Stateful Sessions:", "  * Server stores session ID in Redis/RAM database.\n  * Every single HTTP request requires a database lookup.\n  * Hard to scale horizontally across multiple backend servers."),
        ("EcoTrack Stateless JWT:", "  * Session data is stored inside the signed token itself.\n  * Zero database lookups for session verification.\n  * Verified in CPU memory using secret key in microseconds.\n  * Scales horizontally across any number of server nodes effortlessly.")
    ]
    for t, d in comp:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    s13.notes_slide.notes_text_frame.text = (
        "Explain the three parts of the JWT: Header, Payload, and Signature. "
        "Highlight why stateless JWTs are superior for cloud microservices: no session database queries on every API request."
    )

    # =========================================================================
    # SLIDE 14: AXIOS INTERCEPTOR
    # =========================================================================
    s14 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s14)
    add_header(s14, "Client-Side Token Interception (Axios Interceptor)", "FRONTEND NETWORKING")

    add_card(s14, 0.8, 1.6, 5.6, 5.2, "Implementation in src/api/axiosClient.ts")
    box = s14.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = (
        "// Automatically attaches Bearer token to all outgoing requests\n"
        "apiClient.interceptors.request.use((config) => {\n"
        "  const storedAuth = localStorage.getItem('auth');\n"
        "  if (storedAuth) {\n"
        "    try {\n"
        "      const { token } = JSON.parse(storedAuth);\n"
        "      if (token) {\n"
        "        config.headers.Authorization = `Bearer ${token}`;\n"
        "      }\n"
        "    } catch {}\n"
        "  }\n"
        "  return config;\n"
        "});"
    )
    p.font.size = Pt(11)
    p.font.color.rgb = COLOR_ACCENT_LIGHT

    add_card(s14, 6.8, 1.6, 5.7, 5.2, "Why This Architecture Matters")
    box = s14.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    benefits = [
        ("Zero Boilerplate:", "Developers never need to manually write 'headers: { Authorization }' in components. It happens transparently."),
        ("Clean Separation of Concerns:", "Components focus on business logic (forms, graphs, tables) rather than HTTP transport security."),
        ("RFC 6750 Standard Compliant:", "Implements the standard OAuth 2.0 Bearer token authorization scheme recognized by all web proxies and API gateways."),
        ("Graceful Degradation:", "If local storage is corrupt or empty, the request proceeds unauthenticated, letting the server return 401.")
    ]
    for t, d in benefits:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    s14.notes_slide.notes_text_frame.text = (
        "Slide 14 explains our Axios interceptor. It acts as an outgoing HTTP gatekeeper: "
        "every single API call gets automatically injected with 'Authorization: Bearer token'."
    )

    # =========================================================================
    # SLIDE 15: GOOGLE OAUTH 2.0
    # =========================================================================
    s15 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s15)
    add_header(s15, "Google OAuth 2.0 & Google Identity Services (GIS)", "SINGLE SIGN-ON")

    add_card(s15, 0.8, 1.6, 5.6, 5.2, "Google Sign-In Architecture")
    box = s15.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    g_steps = [
        ("1. Google GIS Button:", "Embedded via Google Identity Services script. Renders native one-click account selector."),
        ("2. OpenID Connect ID Token:", "Google authenticates user and returns a signed JWT credential to handleCredentialResponse()."),
        ("3. Backend Transmission:", "Frontend posts credential string to POST /api/auth/google."),
        ("4. Cryptographic Verification:", "Backend uses google-auth-library (OAuth2Client) to verify Google's RSA signature against Google's public certificates."),
        ("5. User Provisioning / Linking:", "If user exists, links account; if new user, auto-provisions Company and User with role='admin'.")
    ]
    for t, d in g_steps:
        p = tf.add_paragraph()
        p.text = f"{t} {d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(7)

    add_card(s15, 6.8, 1.6, 5.7, 5.2, "Development Simulation Modal")
    box = s15.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    g_dev = [
        ("The Challenge:", "Google OAuth requires configuring origin URIs and domain authorization in Google Cloud Console, which fails during offline presentations or localhost port changes."),
        ("Our Solution: Dual-Mode Operation:", "When VITE_GOOGLE_CLIENT_ID is set in .env, renders the official Google GIS button."),
        ("Built-in Simulation Fallback:", "If running offline or without credentials, clicking the Google button opens a custom test dialog allowing examiners to test instant Google login with a test profile!"),
        ("Zero Evaluation Breakage:", "Guarantees 100% testability for professors and reviewers in any environment.")
    ]
    for t, d in g_dev:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(8)

    s15.notes_slide.notes_text_frame.text = (
        "Explain Google OAuth: Google issues an ID token, our backend verifies it using google-auth-library. "
        "Also mention our offline simulation modal, which lets reviewers test Google login even if offline!"
    )

    # =========================================================================
    # SLIDE 16: FORGOT PASSWORD WORKFLOW
    # =========================================================================
    s16 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s16)
    add_header(s16, "Account Recovery: 3-Step State Machine Workflow", "PASSWORD RECOVERY")

    steps = [
        ("Step 1: Email Request", "POST /api/auth/forgot-password", [
            "User submits registered email address",
            "Server checks user existence in MongoDB",
            "Generates 6-digit cryptographic OTP",
            "Hashes OTP with Bcrypt before saving",
            "Stores in MongoDB with 10-min TTL index",
            "Sends branded HTML email via Nodemailer"
        ], 0.8),
        ("Step 2: OTP Verification", "POST /api/auth/verify-otp", [
            "User enters 6 digits in auto-forwarding boxes",
            "Rate-limited to max 5 failed attempts",
            "Compares input with stored Bcrypt hash",
            "Deletes OTP record immediately on match",
            "Issues single-purpose 15-minute reset token",
            "60-second cooldown timer for resend"
        ], 4.8),
        ("Step 3: Password Reset", "POST /api/auth/reset-password", [
            "User submits new password with live meter",
            "Verifies 15-minute reset JWT signature",
            "Validates NIST/OWASP complexity rules",
            "Hashes new password with Bcrypt (10 rounds)",
            "Updates User document in MongoDB",
            "Redirects user to Login with success toast"
        ], 8.8)
    ]
    for title, subtitle, items, left in steps:
        add_card(s16, left, 1.6, 3.7, 5.2, f"{title}\n{subtitle}")
        box = s16.shapes.add_textbox(Inches(left + 0.2), Inches(2.4), Inches(3.3), Inches(4.2))
        tf = box.text_frame
        tf.word_wrap = True
        for item in items:
            p = tf.add_paragraph()
            p.text = f"- {item}"
            p.font.size = Pt(11)
            p.font.color.rgb = COLOR_WHITE
            p.space_after = Pt(7)

    s16.notes_slide.notes_text_frame.text = (
        "Here is the 3-step account recovery state machine in ForgotPasswordPage.tsx: "
        "1. Email submission -> 2. OTP verification -> 3. Password reset. Notice the clean separation of steps."
    )

    # =========================================================================
    # SLIDE 17: OTP SECURITY & MONGODB TTL
    # =========================================================================
    s17 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s17)
    add_header(s17, "OTP Cryptography & MongoDB TTL Indexes", "TEMPORARY CREDENTIAL MANAGEMENT")

    add_card(s17, 0.8, 1.6, 5.6, 5.2, "OTP Generation & Hashed Storage")
    box = s17.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    otp_crypto = [
        ("Cryptographic Randomness:", "Uses crypto.randomInt(100000, 1000000) rather than Math.random(). Math.random() is pseudo-random and predictable. crypto.randomInt is cryptographically secure."),
        ("Why Hash the OTP in MongoDB?", "We never store raw OTPs. If a database dump is leaked, attackers could see unexpired OTPs and hijack accounts within the 10-minute window. Hashing with Bcrypt guarantees confidentiality even if the DB is compromised."),
        ("Attempt Counting:", "The schema stores an 'attempts' field, incrementing on every failure to prevent brute-force attacks.")
    ]
    for t, d in otp_crypto:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    add_card(s17, 6.8, 1.6, 5.7, 5.2, "MongoDB TTL (Time-To-Live) Index")
    box = s17.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    ttl_points = [
        ("Mongoose Schema Definition:", "createdAt: { type: Date, default: Date.now, expires: 600 }"),
        ("How It Works:", "MongoDB maintains a background thread that monitors documents on indexed Date fields."),
        ("Automatic Purging:", "Exactly 600 seconds (10 minutes) after creation, MongoDB automatically purges the OTP document from disk."),
        ("Why This is Superior:", "Zero cron jobs, zero background tasks, zero database bloat. The database cleans up after itself automatically.")
    ]
    for t, d in ttl_points:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    s17.notes_slide.notes_text_frame.text = (
        "Explain why OTPs are hashed in the database and how MongoDB's TTL index works: "
        "expires: 600 means MongoDB's internal background thread deletes the document after 10 minutes."
    )

    # =========================================================================
    # SLIDE 18: OTP RATE LIMITING & RESET TOKENS
    # =========================================================================
    s18 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s18)
    add_header(s18, "Brute-Force Defense & 15-Minute Reset Tokens", "ACCOUNT RECOVERY SECURITY")

    add_card(s18, 0.8, 1.6, 5.6, 5.2, "Brute-Force Attack Mitigation")
    box = s18.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    bf_points = [
        ("The Math of 6 Digits:", "A 6-digit numeric OTP has 1,000,000 possibilities (10^6). A script sending 1,000 requests/sec could brute-force it in minutes."),
        ("Our Defense Mechanism:", "  1. 10-minute short lifespan via TTL.\n  2. Max 5 attempt limit enforced in database.\n  3. If attempts >= 5, the OTP is destroyed immediately and returns HTTP 429 Too Many Requests."),
        ("Result:", "An attacker has a maximum of 5 guesses out of 1,000,000 combinations (0.0005% probability), making brute force statistically impossible.")
    ]
    for t, d in bf_points:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    add_card(s18, 6.8, 1.6, 5.7, 5.2, "Single-Purpose Reset Tokens")
    box = s18.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    reset_tok = [
        ("Why Not Reset Immediately on OTP?", "Once OTP is verified, the user enters step 3 to type their new password. We delete the OTP record immediately so it cannot be reused."),
        ("The Reset Token Solution:", "The server issues a cryptographically signed JWT: { id, email, purpose: 'password_reset' } valid for 15 minutes only."),
        ("Strict Endpoint Guard:", "POST /api/auth/reset-password requires this token and validates decoded.purpose === 'password_reset'. Regular session tokens are rejected."),
        ("Benefit:", "Guarantees that only a user who correctly verified an OTP within the last 15 minutes can reset the password.")
    ]
    for t, d in reset_tok:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    s18.notes_slide.notes_text_frame.text = (
        "Highlight the 5-attempt brute-force limit: 5 guesses out of 1,000,000 makes brute force impossible. "
        "Then explain why we issue a 15-minute single-purpose reset JWT after OTP verification."
    )

    # =========================================================================
    # SLIDE 19: EMAIL SUBSYSTEM
    # =========================================================================
    s19 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s19)
    add_header(s19, "Email Delivery Subsystem: Nodemailer & SMTP", "NOTIFICATION INFRASTRUCTURE")

    add_card(s19, 0.8, 1.6, 5.6, 5.2, "Nodemailer Architecture (emailService.ts)")
    box = s19.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    email_points = [
        ("SMTP Configuration:", "Supports standard SMTP transport (Gmail, AWS SES, SendGrid, Mailgun) configured via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS."),
        ("HTML Template Design:", "Renders a branded email layout featuring the EcoTrack green color scheme, security warnings, and the 6-digit OTP code in a prominent box."),
        ("Security Notice:", "Email includes explicit warning: 'This OTP will expire in 10 minutes. If you did not request this, please ignore this email.'"),
        ("Asynchronous Dispatch:", "Email dispatch runs without blocking main event loop.")
    ]
    for t, d in email_points:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    add_card(s19, 6.8, 1.6, 5.7, 5.2, "Ethereal Sandbox for Local Viva Testing")
    box = s19.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    ethereal = [
        ("The Local Testing Challenge:", "In academic and offline environments, production SMTP servers often fail due to campus firewall port blocks or missing API keys."),
        ("Automated Ethereal Fallback:", "If SMTP credentials are not set, emailService.ts automatically calls nodemailer.createTestAccount() to create a virtual sandbox."),
        ("Terminal Preview URL:", "When an OTP is dispatched, the server logs a direct preview link in terminal: 'Preview URL: https://ethereal.email/message/...'"),
        ("Live Demonstration:", "Examiners can click the link, view the rendered HTML email in their browser, and copy the OTP code live!")
    ]
    for t, d in ethereal:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    s19.notes_slide.notes_text_frame.text = (
        "Explain how emails are sent using Nodemailer. Point out the Ethereal email fallback: "
        "even without internet or SMTP credentials, it logs a preview link in the console for immediate live demonstration."
    )

    # =========================================================================
    # SLIDE 20: DUAL-LAYER RBAC
    # =========================================================================
    s20 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s20)
    add_header(s20, "Dual-Layer Role-Based Access Control (RBAC)", "AUTHORIZATION ARCHITECTURE")

    add_card(s20, 0.8, 1.6, 5.6, 5.2, "Layer 1: Frontend Route Guard (ProtectedRoute)")
    box = s20.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    l1 = [
        ("Implemented in src/App.tsx:", "<ProtectedRoute allowedRoles={['admin']}>"),
        ("Client-Side Logic:", "  1. Waits for auth re-hydration (isLoading === false).\n  2. If !isAuthenticated -> redirects to /login.\n  3. If allowedRoles does not include user role -> redirects to /dashboard."),
        ("Purpose (User Experience):", "Ensures users never see broken or unauthorized pages. Hides admin-only navigation links (Departments, Users, Company Profile) from employees.")
    ]
    for t, d in l1:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    add_card(s20, 6.8, 1.6, 5.7, 5.2, "Layer 2: Server Middleware Guard (requireRole)")
    box = s20.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    l2 = [
        ("Implemented in server/middleware/requireRole.ts:", "router.delete('/departments/:id', requireAuth, requireRole(['admin']), deleteDept);"),
        ("Server-Side Logic:", "Checks req.user.role extracted from verified JWT. If role is not permitted, immediately returns HTTP 403 Forbidden."),
        ("Why Server RBAC is Mandatory:", "Frontend code can be easily manipulated via dev tools. The Express middleware is the authoritative security boundary that makes unauthorized database operations impossible.")
    ]
    for t, d in l2:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    s20.notes_slide.notes_text_frame.text = (
        "Crucial viva point: emphasize the difference between frontend protection (UX) and backend protection (Security). "
        "ProtectedRoute in React handles redirects, but requireRole in Express is the real security firewall."
    )

    # =========================================================================
    # SLIDE 21: DATA ISOLATION & MULTI-TENANCY
    # =========================================================================
    s21 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s21)
    add_header(s21, "Multi-Tenancy Security & Data Isolation", "ENTERPRISE DATA PRIVACY")

    add_card(s21, 0.8, 1.6, 5.6, 5.2, "How Multi-Tenancy Works in Database")
    box = s21.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    mt_points = [
        ("Shared Database, Isolated Collections:", "All tenants share a single MongoDB cluster, reducing cloud infrastructure costs."),
        ("Enforced Foreign Key Scoping:", "Every single User, Department, and CarbonLog document contains a companyId referencing the tenant organization."),
        ("Query-Level Filtering:", "All backend controllers strictly scope queries:\nconst logs = await CarbonLog.find({ companyId: req.user.companyId });"),
        ("Impossible Cross-Tenant Access:", "Even if an employee guesses an ID from another company, the query returns null because the companyId does not match.")
    ]
    for t, d in mt_points:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    add_card(s21, 6.8, 1.6, 5.7, 5.2, "Defense in Depth Security Principles")
    box = s21.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    did = [
        ("Password Hash Sanitization:", "User.findById().select('-password') guarantees that password hashes are never returned in JSON API responses or logged in server telemetry."),
        ("Environment Variable Safeguards:", "getJwtSecret() helper throws an immediate startup crash if JWT_SECRET is missing, preventing insecure fallback defaults."),
        ("CORS & CSRF Protection:", "Standard HTTP headers restrict origin domains. Stateless tokens are impervious to CSRF attacks because browsers do not automatically send custom Authorization headers.")
    ]
    for t, d in did:
        p = tf.add_paragraph()
        p.text = f"{t}\n{d}"
        p.font.size = Pt(11)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(10)

    s21.notes_slide.notes_text_frame.text = (
        "Explain multi-tenancy: each company's data is isolated using companyId scoping on every database query. "
        "Also highlight defense in depth: select('-password') to never leak hashes."
    )

    # =========================================================================
    # SLIDE 22: FILE MAPPING SUMMARY
    # =========================================================================
    s22 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s22)
    add_header(s22, "Codebase Index: 17 Auth-Related Files Overview", "FILE REFERENCE MATRIX")

    add_card(s22, 0.8, 1.6, 5.6, 5.2, "Backend Files (server/)")
    box = s22.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    b_files = [
        ("controllers/authController.ts:", "7 core endpoints (register, login, google, otp, reset)"),
        ("routes/authRoutes.ts:", "Express route mappings and middleware chaining"),
        ("middleware/auth.ts:", "Bearer token validator & req.user injector"),
        ("middleware/requireRole.ts:", "RBAC middleware guard returning HTTP 403"),
        ("models/User.ts:", "User Mongoose schema with email indexing & enum roles"),
        ("models/Otp.ts:", "Temporary OTP schema with 10-minute MongoDB TTL"),
        ("utils/emailService.ts:", "Nodemailer SMTP email dispatcher & Ethereal test"),
        ("utils/passwordValidator.ts:", "Backend NIST/OWASP password complexity check")
    ]
    for f, d in b_files:
        p = tf.add_paragraph()
        p.text = f"* {f} {d}"
        p.font.size = Pt(10)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(4)

    add_card(s22, 6.8, 1.6, 5.7, 5.2, "Frontend Files (src/)")
    box = s22.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    f_files = [
        ("pages/auth/RegisterPage.tsx:", "Multi-tenant registration & password meter"),
        ("pages/auth/LoginPage.tsx:", "Login form, Google button, show/hide pass"),
        ("pages/auth/ForgotPasswordPage.tsx:", "3-step state machine (Email, OTP, Reset)"),
        ("context/AuthContext.tsx:", "React Context with token persistence & session"),
        ("components/auth/PasswordStrengthMeter.tsx:", "4-bar reactive progress & checklist"),
        ("components/auth/GoogleSignInButton.tsx:", "Google GIS integration & dev modal"),
        ("utils/passwordValidator.ts:", "Client-side password evaluation rules"),
        ("api/axiosClient.ts:", "Axios instance with Bearer token interceptor"),
        ("App.tsx:", "Client-side ProtectedRoute & RBAC route table")
    ]
    for f, d in f_files:
        p = tf.add_paragraph()
        p.text = f"* {f} {d}"
        p.font.size = Pt(10)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(4)

    s22.notes_slide.notes_text_frame.text = (
        "This slide gives examiners a complete index of all 17 files created or modified for authentication, "
        "demonstrating that every single line has been reviewed and detailed comments added."
    )

    # =========================================================================
    # SLIDE 23: VIVA QUESTIONS & BULLETPROOF ANSWERS
    # =========================================================================
    s23 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s23)
    add_header(s23, "Key Viva Questions & Technical Code Defense", "EXAMINATION PREPARATION")

    add_card(s23, 0.8, 1.6, 5.6, 5.2, "Top 3 Architectural Viva Questions")
    box = s23.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(5.2), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    q1 = [
        ("Q: Why Bcrypt instead of SHA-256?", "A: SHA-256 is too fast and vulnerable to GPU brute forcing and Rainbow Tables. Bcrypt has an adaptive cost factor (10 rounds = 1024 iterations) and unique random salts."),
        ("Q: What if an attacker alters their role in a JWT?", "A: Tampering invalidates the HMAC-SHA256 signature calculated with JWT_SECRET. The server rejects it immediately with HTTP 401 Unauthorized."),
        ("Q: Why not store plain OTPs in MongoDB?", "A: If the database is compromised, attackers could read active OTPs and hijack accounts. Hashing with Bcrypt ensures OTP confidentiality even during a DB breach.")
    ]
    for q, a in q1:
        p = tf.add_paragraph()
        p.text = f"{q}\n{a}"
        p.font.size = Pt(10.5)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(8)

    add_card(s23, 6.8, 1.6, 5.7, 5.2, "Top 3 Implementation Viva Questions")
    box = s23.shapes.add_textbox(Inches(7.0), Inches(2.2), Inches(5.3), Inches(4.3))
    tf = box.text_frame
    tf.word_wrap = True
    q2 = [
        ("Q: What is the difference between ProtectedRoute and requireRole?", "A: ProtectedRoute is a frontend React guard for user redirection; requireRole is the authoritative backend Express middleware that returns HTTP 403 Forbidden."),
        ("Q: What is MongoDB TTL and why use it?", "A: Time-To-Live index that automatically purges OTP documents 10 minutes after creation, eliminating database bloat without cron jobs."),
        ("Q: How does the Axios Interceptor work?", "A: It intercepts outgoing HTTP requests, reads the JWT from localStorage, and stamps 'Authorization: Bearer <token>' automatically.")
    ]
    for q, a in q2:
        p = tf.add_paragraph()
        p.text = f"{q}\n{a}"
        p.font.size = Pt(10.5)
        p.font.color.rgb = COLOR_WHITE
        p.space_after = Pt(8)

    s23.notes_slide.notes_text_frame.text = (
        "Review these exact questions before presenting: why Bcrypt, what happens on JWT tampering, "
        "why hash OTPs, and the difference between client-side and server-side RBAC."
    )

    # =========================================================================
    # SLIDE 24: CONCLUSION & SUMMARY
    # =========================================================================
    s24 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s24)

    add_card(s24, 1.5, 1.4, 10.3, 4.8, "PROJECT CONCLUSION & MILESTONES ACHIEVED", border_color=COLOR_ACCENT)
    box = s24.shapes.add_textbox(Inches(1.8), Inches(2.2), Inches(9.7), Inches(3.6))
    tf = box.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "EcoTrack Authentication & Security is 100% Production Ready"
    p.font.size = Pt(22)
    p.font.bold = True
    p.font.color.rgb = COLOR_WHITE
    p.space_after = Pt(16)

    bullets = [
        "Replaced 100% of mock authentication with production JWT and Bcrypt cryptography.",
        "Delivered Google Identity Services (GIS) OAuth 2.0 with offline testing simulation.",
        "Built enterprise-grade account recovery: 6-digit OTP, MongoDB TTL, and rate limiting.",
        "Enforced Dual-Layer RBAC across Admin, Employee, and Executive tiers.",
        "Implemented real-time password complexity evaluation matching NIST & OWASP rules.",
        "Documented 100% of lines across all 17 auth files with zero compile errors (tsc --noEmit)."
    ]
    for b in bullets:
        p = tf.add_paragraph()
        p.text = f"  *  {b}"
        p.font.size = Pt(13)
        p.font.color.rgb = COLOR_ACCENT_LIGHT
        p.space_after = Pt(8)

    p_end = tf.add_paragraph()
    p_end.text = "\nThank You! Questions & Code Walkthrough Welcome."
    p_end.font.size = Pt(15)
    p_end.font.bold = True
    p_end.font.color.rgb = COLOR_WHITE

    s24.notes_slide.notes_text_frame.text = (
        "Conclude with confidence: we built a complete, enterprise-grade authentication and authorization backbone. "
        "Open the floor for questions and offer to demonstrate the live login, registration, OTP email, or code."
    )

    # Save presentation
    output_filename = "EcoTrack_Auth_Presentation.pptx"
    prs.save(output_filename)
    print(f"[SUCCESS] Presentation generated successfully: {output_filename}")
    print(f"[SUCCESS] Total slides generated: {len(prs.slides)}")

if __name__ == "__main__":
    create_presentation()
