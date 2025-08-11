import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeConfig {
  companyName: string;
  companySlogan: string;
  appVersion: string;
  companyLogoUrl: string;
  headerBgPrimary: string;
  headerBgSecondary: string;
  headerUseGradient: boolean;
  headerTextColor: string;
  sidebarBgColor: string;
  sidebarTextColor: string;
  sidebarAccentColor: string;
  sidebarWidth: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  hrColor: string;
  supportColor: string;
  aiColor: string;
  dashboardColor: string;
  headingColor: string;
  subheadingColor: string;
  borderRadius: string;
  shadowIntensity: string;
  animationDuration: string;
  fontFamily: string;
  fontSizeBase: string;
  fontWeightNormal: string;
  fontWeightBold: string;
  darkModeEnabled: boolean;
  darkBgColor: string;
  darkTextColor: string;
}

interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  applyTheme: () => void;
}

const defaultTheme: ThemeConfig = {
  companyName: 'CompanyAI',
  companySlogan: 'Intelligent Business Solutions',
  appVersion: 'v2.1.0',
  companyLogoUrl: '/logo.png',
  headerBgPrimary: '#667eea',
  headerBgSecondary: '#764ba2',
  headerUseGradient: true,
  headerTextColor: '#ffffff',
  sidebarBgColor: '#2d3748',
  sidebarTextColor: '#e2e8f0',
  sidebarAccentColor: '#667eea',
  sidebarWidth: '280px',
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  accentColor: '#48bb78',
  hrColor: '#48bb78',
  supportColor: '#ed8936',
  aiColor: '#9f7aea',
  dashboardColor: '#3182ce',
  headingColor: '#1e293b',
  subheadingColor: '#64748b',
  borderRadius: '8px',
  shadowIntensity: '0.1',
  animationDuration: '0.2s',
  fontFamily: "'Segoe UI', 'Roboto', sans-serif",
  fontSizeBase: '16px',
  fontWeightNormal: '400',
  fontWeightBold: '600',
  darkModeEnabled: false,
  darkBgColor: '#1a202c',
  darkTextColor: '#e2e8f0'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);

  // Initial load from Vite env variables
  useEffect(() => {
    const envTheme: ThemeConfig = {
      companyName: (import.meta as any).env.VITE_COMPANY_NAME || defaultTheme.companyName,
      companySlogan: (import.meta as any).env.VITE_COMPANY_SLOGAN || defaultTheme.companySlogan,
      appVersion: (import.meta as any).env.VITE_APP_VERSION || defaultTheme.appVersion,
      companyLogoUrl: (import.meta as any).env.VITE_COMPANY_LOGO_URL || defaultTheme.companyLogoUrl,
      headerBgPrimary: (import.meta as any).env.VITE_HEADER_BG_PRIMARY || defaultTheme.headerBgPrimary,
      headerBgSecondary: (import.meta as any).env.VITE_HEADER_BG_SECONDARY || defaultTheme.headerBgSecondary,
      headerUseGradient: String((import.meta as any).env.VITE_HEADER_USE_GRADIENT).toLowerCase() === 'true',
      headerTextColor: (import.meta as any).env.VITE_HEADER_TEXT_COLOR || defaultTheme.headerTextColor,
      sidebarBgColor: (import.meta as any).env.VITE_SIDEBAR_BG_COLOR || defaultTheme.sidebarBgColor,
      sidebarTextColor: (import.meta as any).env.VITE_SIDEBAR_TEXT_COLOR || defaultTheme.sidebarTextColor,
      sidebarAccentColor: (import.meta as any).env.VITE_SIDEBAR_ACCENT_COLOR || defaultTheme.sidebarAccentColor,
      sidebarWidth: (import.meta as any).env.VITE_SIDEBAR_WIDTH || defaultTheme.sidebarWidth,
      primaryColor: (import.meta as any).env.VITE_PRIMARY_COLOR || defaultTheme.primaryColor,
      secondaryColor: (import.meta as any).env.VITE_SECONDARY_COLOR || defaultTheme.secondaryColor,
      accentColor: (import.meta as any).env.VITE_ACCENT_COLOR || defaultTheme.accentColor,
      hrColor: (import.meta as any).env.VITE_HR_COLOR || defaultTheme.hrColor,
      supportColor: (import.meta as any).env.VITE_SUPPORT_COLOR || defaultTheme.supportColor,
      aiColor: (import.meta as any).env.VITE_AI_COLOR || defaultTheme.aiColor,
      dashboardColor: (import.meta as any).env.VITE_DASHBOARD_COLOR || defaultTheme.dashboardColor,
      headingColor: (import.meta as any).env.VITE_HEADING_COLOR || defaultTheme.headingColor,
      subheadingColor: (import.meta as any).env.VITE_SUBHEADING_COLOR || defaultTheme.subheadingColor,
      borderRadius: (import.meta as any).env.VITE_BORDER_RADIUS || defaultTheme.borderRadius,
      shadowIntensity: (import.meta as any).env.VITE_SHADOW_INTENSITY || defaultTheme.shadowIntensity,
      animationDuration: (import.meta as any).env.VITE_ANIMATION_DURATION || defaultTheme.animationDuration,
      fontFamily: (import.meta as any).env.VITE_FONT_FAMILY || defaultTheme.fontFamily,
      fontSizeBase: (import.meta as any).env.VITE_FONT_SIZE_BASE || defaultTheme.fontSizeBase,
      fontWeightNormal: (import.meta as any).env.VITE_FONT_WEIGHT_NORMAL || defaultTheme.fontWeightNormal,
      fontWeightBold: (import.meta as any).env.VITE_FONT_WEIGHT_BOLD || defaultTheme.fontWeightBold,
      darkModeEnabled: String((import.meta as any).env.VITE_DARK_MODE_ENABLED).toLowerCase() === 'true',
      darkBgColor: (import.meta as any).env.VITE_DARK_BG_COLOR || defaultTheme.darkBgColor,
      darkTextColor: (import.meta as any).env.VITE_DARK_TEXT_COLOR || defaultTheme.darkTextColor
    };
    setTheme(envTheme);
  }, []);

  const applyTheme = (): void => {
    const root = document.documentElement;
    root.style.setProperty('--company-name', theme.companyName);
    root.style.setProperty('--header-bg-primary', theme.headerBgPrimary);
    root.style.setProperty('--header-bg-secondary', theme.headerBgSecondary);
    root.style.setProperty('--header-text-color', theme.headerTextColor);
    root.style.setProperty('--sidebar-bg-color', theme.sidebarBgColor);
    root.style.setProperty('--sidebar-text-color', theme.sidebarTextColor);
    root.style.setProperty('--sidebar-accent-color', theme.sidebarAccentColor);
    root.style.setProperty('--sidebar-width', theme.sidebarWidth);
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--hr-color', theme.hrColor);
    root.style.setProperty('--support-color', theme.supportColor);
    root.style.setProperty('--ai-color', theme.aiColor);
    root.style.setProperty('--dashboard-color', theme.dashboardColor);
    root.style.setProperty('--heading-color', theme.headingColor);
    root.style.setProperty('--subheading-color', theme.subheadingColor);
    root.style.setProperty('--border-radius', theme.borderRadius);
    root.style.setProperty('--shadow-intensity', theme.shadowIntensity);
    root.style.setProperty('--animation-duration', theme.animationDuration);
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--font-size-base', theme.fontSizeBase);
    root.style.setProperty('--font-weight-normal', theme.fontWeightNormal);
    root.style.setProperty('--font-weight-bold', theme.fontWeightBold);

    const headerBg = theme.headerUseGradient
      ? `linear-gradient(135deg, ${theme.headerBgPrimary} 0%, ${theme.headerBgSecondary} 100%)`
      : theme.headerBgPrimary;
    root.style.setProperty('--header-background', headerBg);

    if (theme.darkModeEnabled) {
      root.style.setProperty('--bg-color', theme.darkBgColor);
      root.style.setProperty('--text-color', theme.darkTextColor);
      root.setAttribute('data-theme', 'dark');
    } else {
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--text-color', '#000000');
      root.setAttribute('data-theme', 'light');
    }
  };

  useEffect(() => {
    applyTheme();
  }, [theme]);

  const updateTheme = (updates: Partial<ThemeConfig>): void => {
    setTheme((prev) => ({ ...prev, ...updates }));
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;

