/**
 * App — Root component with tabbed navigation.
 * Routes between Register, Proximity, and Dashboard views.
 */

import { useState } from 'react';
import { RegisterView } from './components/RegisterView';
import { ProximityComponent } from './components/ProximityComponent';
import { DashboardView } from './components/DashboardView';

type Tab = 'register' | 'proximity' | 'dashboard';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'register', label: 'Register', emoji: '🔑' },
    { id: 'proximity', label: 'Attend', emoji: '📡' },
    { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Trusted Proximity Attendance</h1>
        <p className="app-subtitle">
          BLE Proximity + FIDO2 Biometric Verification
        </p>
      </header>

      {/* Navigation */}
      <nav className="nav-tabs" id="main-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            id={`nav-${tab.id}`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </nav>

      {/* Views */}
      <main>
        {activeTab === 'register' && <RegisterView />}
        {activeTab === 'proximity' && <ProximityComponent />}
        {activeTab === 'dashboard' && <DashboardView />}
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          marginTop: 'var(--space-12)',
          paddingBottom: 'var(--space-8)',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-xs)',
        }}
      >
        <div>
          🛡️ Trusted Proximity Attendance System v1.0
        </div>
        <div style={{ marginTop: 'var(--space-1)' }}>
          Hono + React + WebAuthn + BLE + WebSocket • Built with real technologies
        </div>
      </footer>
    </div>
  );
}

export default App;
