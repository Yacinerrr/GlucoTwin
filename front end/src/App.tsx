import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
} from 'react-router-dom'

import {
  DashboardScreen,
  ScanScreen,
  SimulatorScreen,
  JournalScreen,
  ProfileScreen,
  SettingsScreen,
  ReportScreen,
  RamadanScreen,
  DoctorScreen,
  EmergencyScreen,
} from './pages'

import './App.css'

function App() {
  const currentGlucose = 0
  const ramadanMode = false

  return (
    <Router>
      <div className="app">
        <nav className="nav-tabs">
          <Link to="/">Dashboard</Link>
          <Link to="/scan">Scan</Link>
          <Link to="/simulator">Simulator</Link>
          <Link to="/journal">Journal</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/report">Report</Link>
          <Link to="/ramadan">Ramadan</Link>
          <Link to="/doctor">Doctor</Link>
          <Link to="/emergency">Emergency</Link>
        </nav>

        <main className="page-content">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardScreen
                  currentGlucose={currentGlucose}
                  ramadanMode={ramadanMode}
                />
              }
            />
            <Route path="/scan" element={<ScanScreen />} />
            <Route path="/simulator" element={<SimulatorScreen />} />
            <Route path="/journal" element={<JournalScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/settings" element={<SettingsScreen ramadanMode={ramadanMode} onRamadanToggle={() => {}} />} />
            <Route path="/report" element={<ReportScreen />} />
            <Route path="/ramadan" element={<RamadanScreen />} />
            <Route path="/doctor" element={<DoctorScreen />} />
            <Route path="/emergency" element={<EmergencyScreen currentGlucose={currentGlucose} />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App