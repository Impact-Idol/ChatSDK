import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/channels', label: 'Channels', icon: '💬' },
    { path: '/messages', label: 'Messages', icon: '✉️' },
    { path: '/api-keys', label: 'API Keys', icon: '🔑' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
    { path: '/audit-log', label: 'Audit Log', icon: '📋' },
  ];

  const getPageTitle = () => {
    const item = navItems.find(item => item.path === location.pathname);
    return item ? item.label : 'Dashboard';
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>ChatSDK Admin</h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <span style={{ marginRight: '8px' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="user-details">
              <h4>{user?.name || 'Admin'}</h4>
              <p>{user?.email || 'admin@example.com'}</p>
            </div>
          </div>
          <button className="logout-button" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <h1 className="page-title">{getPageTitle()}</h1>
        </div>

        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
