# Majestic Design Language Kit

Use this kit to apply the same visual style across future apps.

## Included Files

- `src/styles/design-tokens.css`
- `src/styles/design-animations.css`

## Brand Foundation

- Primary: `#002e6d`
- Accent Gold: `#c9a84c`
- Light background: `#f4f1ec`
- Dark background: `#0a1628`
- Headline font: `Cormorant Garamond`
- UI font: `Source Sans 3`

## Install In A New Project

1. Add Google Fonts to `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Source+Sans+3:wght@400;600;700;900&display=swap" rel="stylesheet" />
```

2. Import CSS files in your app entry CSS:

```css
@import "./styles/design-tokens.css";
@import "./styles/design-animations.css";
```

3. Toggle theme by setting:

- light: `data-theme="light"`
- dark: `data-theme="dark"`

on your `html` or root element.

## Recommended Component Styles

- Containers: `glass`, `glass-card`, `glass-strong`
- Inputs: `glass-input`
- Primary CTA: `btn-accent`
- Secondary buttons: `btn-glass`
- Brand heading: `font-brand`
- Text colors: `tc-heading`, `tc-primary`, `tc-secondary`, `tc-muted`

## Motion Language

- Entrance: `animate-fade-in-down`, `animate-fade-in-up`, `animate-home-hero`
- Ambient: `animate-float`, `home-star`, `home-orbit`
- Celebration: `confetti-particle`, `home-burst`
- Interaction: `home-logo-tap`

## Notes

- Keep colors tokenized via CSS variables.
- Avoid hardcoded text/background colors in components.
- Prefer subtle premium motion over fast/high-amplitude effects.
