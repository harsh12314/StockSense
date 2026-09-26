import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Truck,
  Package,
  Layers,
  History,
  LayoutDashboard,
  LogOut,
  Warehouse,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { getUser } from '../api/client';

export default function Sidebar() {
  const user = getUser() || { login_id: 'admin1', role: 'inventory_manager' };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Truck size={18} />
          </div>
          <div>
            <h1>Stock<span>Sense</span></h1>
            <p>Warehouse Ops</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Operations</div>
        
        <NavLink
          to="/deliveries"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="icon"><Truck size={18} /></span>
          <span style={{ flex: 1 }}>Delivery Orders</span>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '10px',
            background: 'rgba(59,130,246,0.2)',
            color: '#60a5fa',
            fontWeight: 700
          }}>
            Outgoing
          </span>
        </NavLink>

        <div className="sidebar-section-label" style={{ marginTop: '16px' }}>Inventory Data</div>

        <div className="sidebar-link" style={{ opacity: 0.6, cursor: 'default' }}>
          <span className="icon"><Package size={18} /></span>
          <span>Products & Stock</span>
        </div>

        <div className="sidebar-link" style={{ opacity: 0.6, cursor: 'default' }}>
          <span className="icon"><History size={18} /></span>
          <span>Move History</span>
        </div>

        <div className="sidebar-section-label" style={{ marginTop: '16px' }}>Facility</div>
        <div className="sidebar-link" style={{ opacity: 0.6, cursor: 'default' }}>
          <span className="icon"><Warehouse size={18} /></span>
          <span>Main Warehouse (WH)</span>
        </div>
      </nav>

      <div style={{
        margin: '0 12px 12px',
        padding: '12px',
        borderRadius: '8px',
        background: 'rgba(30, 41, 59, 0.7)',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <CheckCircle2 size={14} color="#22c55e" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9' }}>Delivery Flow</span>
        </div>
        <p style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.4 }}>
          1. Pick items<br />
          2. Pack items<br />
          3. Validate → Stock auto-decreases
        </p>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          {user.login_id ? user.login_id.substring(0, 2).toUpperCase() : 'AD'}
        </div>
        <div className="user-info">
          <div className="user-name">{user.login_id || 'admin1'}</div>
          <div className="user-role">{user.role || 'Inventory Manager'}</div>
        </div>
      </div>
    </aside>
  );
}
