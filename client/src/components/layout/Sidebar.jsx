import React, { useState, useEffect } from 'react';
import {
  IconDashboard,
  IconPackage,
  IconReceipt,
  IconTruck,
  IconHistory,
  IconTransfer,
  IconAdjust,
  IconSettings,
  IconWarehouse,
  IconUser,
} from '../common/Icons';

export default function Sidebar({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  counts = {},
}) {
  // Determine active primary rail section from activeTab
  const getSectionForTab = (tab) => {
    switch (tab) {
      case 'dashboard':
        return 'dashboard';
      case 'receipts':
      case 'deliveries':
      case 'transfers':
      case 'adjustments':
        return 'operations';
      case 'products':
        return 'products';
      case 'ledger':
      case 'moves':
        return 'ledger';
      case 'warehouses':
      case 'settings':
        return 'settings';
      default:
        return 'dashboard';
    }
  };

  const [activeSection, setActiveSection] = useState(() => getSectionForTab(activeTab));

  useEffect(() => {
    setActiveSection(getSectionForTab(activeTab));
  }, [activeTab]);

  // Primary Slim Rail Items (Dashboard, Operations, Products, Move History, Settings)
  const railItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: IconDashboard,
      defaultTab: 'dashboard',
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: IconTruck,
      defaultTab: 'receipts',
      badge: (counts.pendingReceipts || 0) + (counts.pendingDeliveries || 0) + (counts.pendingTransfers || 0),
    },
    {
      id: 'products',
      label: 'Products',
      icon: IconPackage,
      defaultTab: 'products',
      badge: counts.totalProducts || null,
    },
    {
      id: 'ledger',
      label: 'Move History',
      icon: IconHistory,
      defaultTab: 'ledger',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: IconSettings,
      defaultTab: 'settings',
    },
  ];

  // Secondary Panel Sub-Items by Section
  const sectionSubItems = {
    dashboard: {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
      ],
    },
    operations: {
      title: 'OPERATIONS',
      items: [
        {
          id: 'receipts',
          label: 'Receipts',
          icon: IconReceipt,
          badge: counts.pendingReceipts || 0,
          badgeColor: 'amber',
        },
        {
          id: 'deliveries',
          label: 'Delivery Orders',
          icon: IconTruck,
          badge: counts.pendingDeliveries || 0,
          badgeColor: 'blue',
        },
        {
          id: 'transfers',
          label: 'Internal Transfers',
          icon: IconTransfer,
          badge: counts.pendingTransfers || null,
          badgeColor: 'blue',
        },
        {
          id: 'adjustments',
          label: 'Stock Adjustments',
          icon: IconAdjust,
        },
      ],
    },
    products: {
      title: 'INVENTORY',
      items: [
        {
          id: 'products',
          label: 'Products & Stock',
          icon: IconPackage,
          badge: counts.totalProducts || null,
        },
        {
          id: 'warehouses',
          label: 'Warehouses',
          icon: IconWarehouse,
        },
      ],
    },
    ledger: {
      title: 'AUDIT & MOVES',
      items: [
        {
          id: 'ledger',
          label: 'Stock Ledger',
          icon: IconHistory,
        },
      ],
    },
    settings: {
      title: 'CONFIGURATION',
      items: [
        {
          id: 'settings',
          label: 'System Settings',
          icon: IconSettings,
        },
        {
          id: 'warehouses',
          label: 'Warehouses',
          icon: IconWarehouse,
        },
      ],
    },
  };

  const currentSubItems = sectionSubItems[activeSection] || sectionSubItems.dashboard;

  const handleRailClick = (item) => {
    setActiveSection(item.id);
    if (getSectionForTab(activeTab) !== item.id) {
      onSelectTab(item.defaultTab);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`app-sidebar-two-panel ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Panel 1: Slim Icon-Only Far-Left Rail */}
        <div className="sidebar-rail">
          {/* Brand Mark */}
          <div className="rail-brand" title="StockSense">
            <div className="rail-brand-icon">
              <IconPackage size={22} />
            </div>
          </div>

          {/* Primary Nav Icons */}
          <div className="rail-nav">
            {railItems.map((item) => {
              const Icon = item.icon;
              const isRailActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  className={`rail-nav-btn ${isRailActive ? 'active' : ''}`}
                  onClick={() => handleRailClick(item)}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon size={20} />
                  {item.badge && item.badge > 0 ? (
                    <span className="rail-badge-dot" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Rail Footer (Profile) */}
          <div className="rail-footer">
            <div className="rail-profile-btn" title="User Profile">
              <IconUser size={19} />
            </div>
          </div>
        </div>

        {/* Panel 2: Wider Labeled Secondary Panel */}
        <div className="sidebar-subpanel">
          <div className="subpanel-header">
            <span className="subpanel-brand-title">StockSense</span>
            <span className="subpanel-section-label">{currentSubItems.title}</span>
          </div>

          <nav className="subpanel-nav">
            {currentSubItems.items.map((subItem) => {
              const SubIcon = subItem.icon;
              const isActive = activeTab === subItem.id;
              return (
                <button
                  key={subItem.id}
                  className={`subpanel-nav-pill ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onSelectTab(subItem.id);
                    if (onClose) onClose();
                  }}
                >
                  <div className="subpanel-item-left">
                    <SubIcon size={17} className="subpanel-icon" />
                    <span className="subpanel-label">{subItem.label}</span>
                  </div>

                  {subItem.badge !== null && subItem.badge !== undefined && subItem.badge > 0 && (
                    <span
                      className={`subpanel-badge ${
                        subItem.badgeColor === 'amber'
                          ? 'badge-amber'
                          : subItem.badgeColor === 'blue'
                          ? 'badge-blue'
                          : 'badge-neutral'
                      }`}
                    >
                      {subItem.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="subpanel-footer">
            <div className="subpanel-health-chip">
              <span className="health-dot live-pulse" />
              <span className="health-text">Warehouse Online</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

