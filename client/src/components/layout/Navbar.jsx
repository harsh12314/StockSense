import { useState, useRef, useEffect } from 'react';
import {
  IconSearch,
  IconBell,
  IconUser,
  IconLogOut,
  IconWarehouse,
  IconMenu,
} from '../common/Icons';

export default function Navbar({
  user,
  onLogout,
  toggleSidebar,
  currentWarehouse,
  onWarehouseChange,
  warehouses = [],
  lowStockCount = 0,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.loginId || user?.login_id || 'User';
  const roleTitle =
    user?.role === 'inventory_manager'
      ? 'Inventory Manager'
      : user?.role === 'warehouse_staff'
      ? 'Warehouse Staff'
      : 'Operations';

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <button
          className="mobile-sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <IconMenu size={22} />
        </button>

        <div className="brand-badge-group">
          <span className="brand-app-name">StockSense</span>
          <span className="brand-version-pill">v1.0</span>
        </div>

        {/* Warehouse Selector */}
        <div className="navbar-warehouse-select">
          <IconWarehouse size={16} className="warehouse-icon" />
          <select
            value={currentWarehouse}
            onChange={(e) => onWarehouseChange(e.target.value)}
            className="warehouse-dropdown"
          >
            <option value="ALL">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.code}>
                {wh.code} - {wh.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="navbar-center">
        <div className="navbar-search-box">
          <IconSearch size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search products, refs (IN/2026/00142), contacts..."
            className="navbar-search-input"
          />
          <span className="search-shortcut-hint">⌘K</span>
        </div>
      </div>

      <div className="navbar-right" ref={dropdownRef}>
        {/* Low Stock Alert Indicator */}
        <button
          className="navbar-icon-btn"
          title={`${lowStockCount} Low Stock Alerts`}
          onClick={() => setNotificationsOpen(!notificationsOpen)}
        >
          <IconBell size={19} />
          {lowStockCount > 0 && (
            <span className="alert-count-pill">{lowStockCount}</span>
          )}
        </button>

        {/* User Profile Avatar & Dropdown */}
        <div className="user-profile-wrapper">
          <button
            className="user-profile-button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
          >
            <div className="user-avatar">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="user-info-text">
              <span className="user-name">{displayName}</span>
              <span className="user-role-label">{roleTitle}</span>
            </div>
          </button>

          {dropdownOpen && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-header">
                <p className="dropdown-user-name">{displayName}</p>
                <p className="dropdown-user-email">{user?.email || 'user@stocksense.io'}</p>
                <span className="dropdown-user-badge">{roleTitle}</span>
              </div>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item danger-item"
                onClick={onLogout}
              >
                <IconLogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
