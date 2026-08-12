# AgriShop Foundation

Build Phase 1 of a production-grade Agriculture Shop Management & E-Commerce System.

This phase must focus only on:

Admin Panel foundation

Homepage / storefront foundation

Theme system

Project structure / file organization

Reusable layout and UI components

Navigation skeleton for future phases

Do not build customer section, supplier section, khata section, dashboard analytics, reports, export flows, or backend business logic in this phase. Those are reserved for later phases.

Core goal of Phase 1

Create a polished, modern, responsive agriculture business platform foundation that looks like a real shop-management product and is ready for later expansion.

The admin should be able to manage the business from a clean panel, while the homepage should present the shop professionally to customers.

1) Tech stack and implementation rules

Use:

TypeScript

React

Vite

Tailwind CSS

shadcn/ui

React Router

TanStack Query

React Hook Form

Zod

Framer Motion

Recharts only if needed for placeholder widgets

Clean component architecture

Production-quality code

Reusable UI patterns

Responsive design for desktop, tablet, and mobile

Follow these standards:

Use modular, scalable folder structure

Keep components reusable

Use proper typing everywhere

Use clean naming

Use mock/static data only where backend is not part of Phase 1

Avoid unnecessary complexity

Keep code easy to extend for future phases

2) Phase 1 scope

A. Admin Panel foundation

Create the admin panel shell with these parts:

Layout

Left sidebar navigation

Top header bar

Main content area

Collapsible sidebar for smaller screens

Mobile-friendly navigation drawer

Admin navigation items

Add only the navigation structure for now, even if some pages are placeholders:

Dashboard / Overview

Customers

Suppliers

Inventory

Products

Sales

Reports

Analytics

Advertisements

Backups

Activity Logs

Security Logs

Search

Settings

Admin layout behavior

Sidebar should remain fixed on desktop

Top bar should show:

Brand/logo

Search icon or search input placeholder

Notifications icon placeholder

Profile/avatar placeholder

Content area should be clean and spacious

Use cards, sections, badges, tables, and summary widgets as needed

Each menu item can open a placeholder page for now, except the core Phase 1 screens below

Admin Phase 1 screens to fully build

Build the following screens with real UI:

Admin Overview

Advertisements

Backups

Activity Logs

Security Logs

Search

Settings

For the rest of the sections, create placeholder pages or empty state pages with proper structure so they can be expanded later.

B. Homepage / storefront foundation

Build a modern homepage for the agriculture shop that feels professional, trustworthy, and business-ready.

Homepage sections

Create these sections:

Top bar with contact info

Navbar with logo and navigation

Search field

Login/Register buttons

Cart icon

Hero section with promotional banner

Category section

Featured products section

About / business highlight section

Footer with business information, links, and support details

Homepage behavior

Responsive layout

Clean visual hierarchy

Agriculture-inspired look

Promotional but not cluttered

Suitable for a real shop selling agricultural products

Navigation structure on homepage

Include links for:

Home

Categories

Products

Offers / Promotions

About

Contact

Login

Cart

Do not build full product browsing logic yet unless needed for homepage visuals.

3) Theme and design system

Use a modern agriculture business dashboard theme with warm, natural, trustworthy visuals.

Color palette

Use these tones as the base direction:

Background: #FBF4EC, #EFEFEF, #FFFFFF

Primary green: #2EA739

Secondary green: #629F38

Accent green: #91B429

Dark text: #1F2937

Success: #16A34A

Warning: #F59E0B

Danger: #DC2626

Typography

Use:

Inter

Poppins

Nunito

Style direction

Rounded buttons

Soft shadows

Minimal but premium visuals

Clear spacing

Gentle animations only

Professional business look

Dark mode support

Clean icon usage

Strong readability

4) Admin UI details

Admin panel should include:

Summary cards

Placeholder charts or stat widgets where useful

Tables for section overviews

Empty states for unfinished modules

Quick action cards

Recent activity panels

Search input area

Settings cards with toggle UI

Backup action UI

Log list UI

For Phase 1, these are mostly layout and interface foundations, not full business logic.

5) Homepage UI details

Homepage should include:

Strong hero section with agriculture-themed messaging

CTA buttons like:

Shop Now

Explore Categories

Category cards

Featured product cards

Trust badges / business highlights

Clean footer

The homepage must feel like the front face of a serious agriculture business.

6) Project structure

Set up a clean scalable structure similar to this:

src/

components/

layout/

ui/

admin/

home/

pages/

admin/

home/

routes/

lib/

data/

hooks/

types/

styles/

Use reusable components for:

Sidebar

Header

Navbar

Footer

Hero section

Section cards

Stats cards

Empty state cards

Buttons

Search bar

Theme toggle if needed

7) Routing

Create routing for:

/ → Homepage

/admin → Admin overview

/admin/advertisements

/admin/backups

/admin/activity-logs

/admin/security-logs

/admin/search

/admin/settings

Add placeholder routes for the other admin sections so the app structure is ready for later phases.

8) Content direction

Use realistic copy for an agriculture shop management system.

Tone:

Professional

Business-focused

Trustworthy

Simple

Clear

Modern

Avoid generic SaaS filler text. Make it feel like a real agricultural commerce and shop-management product.

9) Phase 1 output expectation

At the end of Phase 1, the app should have:

A strong homepage

A complete admin shell

Real UI for the admin foundation screens

A consistent theme

Reusable file structure

Ready foundation for Phase 2, Phase 3, and Phase 4

Make sure the app looks polished, professional, and ready for real business use.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
