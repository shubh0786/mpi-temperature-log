# HomeScreen Starter

This folder includes a copy-paste starter home screen that matches the Majestic design language kit.

## Files

- `HomeScreenStarter.tsx` - plug-and-play React component
- `ThemeProviderStarter.tsx` - reusable dark/light theme provider + hook

## How to use

1. Copy `HomeScreenStarter.tsx` into your new project's `src/screens/`.
2. Import CSS in your app stylesheet:

```css
@import "./styles/design-tokens.css";
@import "./styles/design-animations.css";
```

3. Make sure your `index.html` has the required Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Source+Sans+3:wght@400;600;700;900&display=swap" rel="stylesheet" />
```

4. Use the component:

```tsx
<HomeScreenStarter
  appName="My App"
  subtitle="Temperature Log"
  onStart={(name) => console.log(name)}
/>
```

## Optional Theme Provider Setup

Wrap your app at the root:

```tsx
import { ThemeProviderStarter } from "./starter/ThemeProviderStarter";

export default function AppRoot() {
  return (
    <ThemeProviderStarter>
      <App />
    </ThemeProviderStarter>
  );
}
```

Use the theme hook anywhere:

```tsx
import { useThemeStarter } from "./starter/ThemeProviderStarter";

function ThemeToggleButton() {
  const { theme, toggleTheme } = useThemeStarter();
  return (
    <button onClick={toggleTheme}>
      Theme: {theme}
    </button>
  );
}
```
