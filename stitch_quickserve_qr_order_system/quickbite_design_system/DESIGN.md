---
name: QuickBite Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#594139'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#8d7168'
  outline-variant: '#e1bfb5'
  surface-tint: '#ab3500'
  primary: '#ab3500'
  on-primary: '#ffffff'
  primary-container: '#ff6b35'
  on-primary-container: '#5f1900'
  inverse-primary: '#ffb59d'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#00677e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00a7cb'
  on-tertiary-container: '#003744'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59d'
  on-primary-fixed: '#390c00'
  on-primary-fixed-variant: '#832600'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#b5ebff'
  tertiary-fixed-dim: '#59d5fb'
  on-tertiary-fixed: '#001f28'
  on-tertiary-fixed-variant: '#004e60'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 16px
  gutter: 12px
---

## Brand & Style

The design system is centered on a **Premium Minimalist** aesthetic tailored for high-frequency, mobile-first dining environments. The brand personality is efficient, appetizing, and reliable, aiming to reduce the friction between "browsing" and "eating."

The visual language utilizes a "Soft-Modern" approach—combining clean, functional layouts with organic roundedness and tactile depth. By leveraging generous whitespace and a sophisticated primary palette, the interface feels less like a utility tool and more like a digital extension of the restaurant’s physical hospitality. The emotional response should be one of effortless control and modern convenience.

## Colors

The palette is anchored by a vibrant **Crave Orange** (#FF6B35), specifically chosen to stimulate appetite and signal primary actions. 

- **Light Mode (Default):** Uses a clean white background with subtle slate-blue surfaces to define content areas without heavy borders.
- **Dark Mode:** Transitions to a deep navy-charcoal base, ensuring high legibility and reduced eye strain in low-light restaurant environments.
- **Functional Colors:** Green and Amber are reserved for status indicators (Ready, Preparing, New Order) to ensure the kitchen and customers have instant visual feedback on order progression.

## Typography

This design system utilizes **Inter** for its exceptional legibility and systematic feel across mobile devices. 

- **Headlines:** Use tight letter-spacing and bold weights to create a strong visual hierarchy for menu categories and order totals.
- **Body:** Standardized at 16px for mobile accessibility to prevent browser zooming on input focus.
- **Labels:** Small caps or bold weights are used for utility metadata like "Table Number" or "Modifier" options to differentiate from standard descriptive text.

## Layout & Spacing

The layout philosophy follows a **Fluid Mobile-First** model. The core interaction zone is optimized for one-handed thumb use, with primary actions anchored to the bottom of the screen.

- **Grid:** A 4-column grid for mobile and a 12-column grid for tablet/desktop management views.
- **Margins:** Standard 16px horizontal margins for mobile views to allow the content "breath."
- **Rhythm:** An 8px linear scale (4, 8, 16, 24, 32) governs all padding and margin decisions to ensure a harmonious vertical rhythm.

## Elevation & Depth

Visual hierarchy is conveyed through **Ambient Shadows** and **Tonal Layering**. 

- **Level 1 (Surface):** Subtle 1px border (#E2E8F0) with no shadow. Used for list items and inputs.
- **Level 2 (Floating):** Soft, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)). Used for product cards and search bars.
- **Level 3 (Overlay):** High-diffusion shadow (0px 10px 25px rgba(0,0,0,0.1)). Used for modals, bottom sheets, and toast notifications.

In Dark Mode, elevation is communicated by increasing the lightness of the surface color rather than increasing shadow opacity.

## Shapes

The shape language is consistently **Rounded**, using a 12px (0.75rem) corner radius as the primary architectural unit. 

- **Standard Elements (Buttons, Cards, Inputs):** 12px radius.
- **Small Elements (Chips, Checkboxes):** 8px radius.
- **Containers (Bottom Sheets, Modals):** 24px top-only radius for a soft, integrated look.

This creates a friendly, approachable interface that mirrors the physical experience of modern dining.

## Components

### Buttons
- **Primary:** Solid #FF6B35 with white text. High-contrast, 12px radius.
- **Secondary:** Surface-colored background with #FF6B35 border and text.
- **Ghost:** No background, #1F2937 text, used for "Cancel" or "Go Back."

### Cards
Product cards feature a fixed-ratio image on top or left, with Title-md and Price clearly visible. Soft shadows (Level 2) are applied on hover or selection.

### Inputs & Search Bars
- **Text Inputs:** 12px radius, 16px padding. In focus, the border transitions to Primary Orange with a subtle glow.
- **Search:** Includes a leading icon (Magnifying Glass) and a persistent "Filter" trailing icon.

### Status Indicators
- **Status Badges:** Use a "pill" shape (rounded-xl) with 10% opacity backgrounds of the functional color (Success Green, Warning Amber, Error Red) and 100% opacity text.

### Feedback
- **Toasts:** Positioned at the bottom-center for mobile. Dark background in Light Mode to ensure maximum prominence.
- **Skeleton Loaders:** Use a shimmering pulse effect on #F1F5F9 surfaces to maintain perceived speed during menu loading.

### Modals & Sheets
Mobile views should favor **Bottom Sheets** (sliding up from the bottom) over centered modals to maintain thumb-accessibility for item customization.