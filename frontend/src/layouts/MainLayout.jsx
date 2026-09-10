import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import '../styles/layout.css';

const MainLayout = () => {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar />
      <div className="main-panel">
        <Topbar />
        <main id="main-content" className="page-container" tabIndex="-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
