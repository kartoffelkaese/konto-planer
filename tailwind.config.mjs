/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        },
        primary: {
          DEFAULT: 'var(--color-text-primary)',
          foreground: 'var(--color-text-primary)',
        },
        secondary: {
          DEFAULT: 'var(--color-text-secondary)',
          foreground: 'var(--color-text-secondary)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
          muted: 'var(--color-accent-muted)',
          foreground: 'var(--color-accent-foreground)',
          border: 'var(--color-accent-border)',
        },
        income: {
          DEFAULT: 'var(--color-income)',
          bg: 'var(--color-income-bg)',
        },
        expense: {
          DEFAULT: 'var(--color-expense)',
          bg: 'var(--color-expense-bg)',
        },
        pending: {
          DEFAULT: 'var(--color-pending)',
          bg: 'var(--color-pending-bg)',
          foreground: 'var(--color-pending-foreground)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          hover: 'var(--color-danger-hover)',
          foreground: 'var(--color-danger-foreground)',
          subtle: 'var(--color-danger-subtle)',
        },
        chart: {
          DEFAULT: 'var(--color-chart-default)',
        },
        background: 'var(--color-canvas)',
        foreground: 'var(--color-text-primary)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      transitionDuration: {
        feedback: 'var(--motion-duration-feedback)',
        expand: 'var(--motion-duration-expand)',
      },
    },
  },
  plugins: [],
}

export default config
