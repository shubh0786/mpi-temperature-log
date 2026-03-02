import { AppProvider, useApp } from './AppContext';
import { AuroraBackground, IceCrystals } from './components/visuals';
import { HomeScreen } from './screens/HomeScreen';
import { LoggingScreen } from './screens/LoggingScreen';
import { CompleteScreen } from './screens/CompleteScreen';
import { RecordsScreen } from './screens/RecordsScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { CalendarScreen } from './screens/CalendarScreen';

function AppContent() {
  const { screen } = useApp();
  return (
    <div className="min-h-screen relative">
      <AuroraBackground />
      <IceCrystals />
      {screen === 'home' && <HomeScreen />}
      {screen === 'logging' && <LoggingScreen />}
      {screen === 'complete' && <CompleteScreen />}
      {screen === 'records' && <RecordsScreen />}
      {screen === 'dashboard' && <DashboardScreen />}
      {screen === 'calendar' && <CalendarScreen />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
