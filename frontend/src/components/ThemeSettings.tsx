import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeSettings: React.FC = () => {
  const { theme, updateTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (key: keyof typeof theme) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTheme({ [key]: e.target.value } as any);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'var(--primary-color)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          cursor: 'pointer',
          zIndex: 1000
        }}
        title="Theme Einstellungen"
      >
        🎨
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 1000,
      minWidth: '320px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Theme Einstellungen</h3>
        <button onClick={() => setIsOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✖</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Firmenname
          <input type="text" value={theme.companyName} onChange={handleChange('companyName')} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Slogan
          <input type="text" value={theme.companySlogan} onChange={handleChange('companySlogan')} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Header Primär
          <input type="color" value={theme.headerBgPrimary} onChange={handleChange('headerBgPrimary')} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Header Sekundär
          <input type="color" value={theme.headerBgSecondary} onChange={handleChange('headerBgSecondary')} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Sidebar Hintergrund
          <input type="color" value={theme.sidebarBgColor} onChange={handleChange('sidebarBgColor')} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Sidebar Akzent
          <input type="color" value={theme.sidebarAccentColor} onChange={handleChange('sidebarAccentColor')} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Primärfarbe
          <input type="color" value={theme.primaryColor} onChange={handleChange('primaryColor')} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Sekundärfarbe
          <input type="color" value={theme.secondaryColor} onChange={handleChange('secondaryColor')} />
        </label>
      </div>
    </div>
  );
};

export default ThemeSettings;


