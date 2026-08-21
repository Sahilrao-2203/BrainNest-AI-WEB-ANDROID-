function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "background": withOpacity("--background"),
        "surface": withOpacity("--surface"),
        "surface-bright": withOpacity("--surface-bright"),
        "surface-container-lowest": withOpacity("--surface-container-lowest"),
        "surface-container-low": withOpacity("--surface-container-low"),
        "surface-container": withOpacity("--surface-container"),
        "surface-container-high": withOpacity("--surface-container-high"),
        "surface-container-highest": withOpacity("--surface-container-highest"),
        "surface-variant": withOpacity("--surface-variant"),
        "surface-dim": withOpacity("--surface-dim"),
        "on-surface": withOpacity("--on-surface"),
        "on-surface-variant": withOpacity("--on-surface-variant"),
        "on-background": withOpacity("--on-background"),
        "outline": withOpacity("--outline"),
        "outline-variant": withOpacity("--outline-variant"),
        "primary": withOpacity("--primary"),
        "on-primary": withOpacity("--on-primary"),
        "primary-container": withOpacity("--primary-container"),
        "on-primary-container": withOpacity("--on-primary-container"),
        "primary-fixed": withOpacity("--primary-fixed"),
        "primary-fixed-dim": withOpacity("--primary-fixed-dim"),
        "secondary": withOpacity("--secondary"),
        "on-secondary": withOpacity("--on-secondary"),
        "secondary-container": withOpacity("--secondary-container"),
        "on-secondary-container": withOpacity("--on-secondary-container"),
        "tertiary": withOpacity("--tertiary"),
        "on-tertiary": withOpacity("--on-tertiary"),
        "error": withOpacity("--error"),
        "on-error": withOpacity("--on-error"),
        "error-container": withOpacity("--error-container"),
        "on-error-container": withOpacity("--on-error-container"),
        "glass-bg": "rgba(255, 255, 255, 0.7)",
        "glass-border": "rgba(255, 255, 255, 0.5)",
      },
      borderRadius: {
        "sm": "0.25rem",
        "DEFAULT": "0.5rem",
        "md": "0.75rem",
        "lg": "1.0rem",
        "xl": "1.5rem",
        "full": "9999px"
      },
      spacing: {
        "margin-mobile": "16px",
        "margin-desktop": "64px",
        "gutter": "24px",
        "panel-padding": "24px",
        "base-unit": "8px"
      },
      fontFamily: {
        "sans": ["Inter", "sans-serif"],
        "display-lg": ["Montserrat", "sans-serif"],
        "headline-lg": ["Montserrat", "sans-serif"],
        "headline-lg-mobile": ["Montserrat", "sans-serif"],
        "headline-md": ["Montserrat", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"]
      },
      fontSize: {
        "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "headline-lg": ["32px", { "lineHeight": "40px", "fontWeight": "700" }],
        "headline-lg-mobile": ["24px", { "lineHeight": "32px", "fontWeight": "700" }],
        "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "600" }],
        "label-sm": ["12px", { "lineHeight": "16px", "fontWeight": "500" }]
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        }
      }
    }
  }
};
