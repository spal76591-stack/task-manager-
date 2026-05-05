import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">TaskFlow</Link>
      </div>
      {user && (
        <div className="navbar-links">
          <Link to="/" className={isActive('/') ? 'active' : ''}>Dashboard</Link>
          <Link to="/projects" className={isActive('/projects') ? 'active' : ''}>Projects</Link>
          <Link to="/my-tasks" className={isActive('/my-tasks') ? 'active' : ''}>My Tasks</Link>
          <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>Profile</Link>
          <div className="navbar-user">
            <span>{user.name}</span>
            <span className={`user-role role-${user.role}`}>{user.role}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
