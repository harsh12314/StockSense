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
  IconLogOut,
} from '../common/Icons';

export default function Sidebar({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  counts = {},
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: IconDashboard,
      badge: null,
    },
    {
      section: 'OPERATIONS',
    },
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
      badge: null,
    },
    {
      section: 'INVENTORY & AUDIT',
    },
    {
      id: 'products',
      label: 'Products & Stock',
      icon: IconPackage,
      badge: counts.totalProducts || null,
    },
    {
      id: 'ledger',
      label: 'Stock Ledger',
      icon: IconHistory,
      badge: null,
    },
    {
      section: 'CONFIGURATION',
    },
    {
      id: 'warehouses',
      label: 'Warehouses',
      icon: IconWarehouse,
      badge: null,
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: IconSettings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
            <IconPackage size={22} />
          </div>
          <div className="brand-title-box">
            <span className="brand-title">StockSense</span>
            <span className="brand-subtitle">Warehouse & Ops</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, index) => {
            if (item.section) {
              return (
                <div key={index} className="nav-section-title">
                  {item.section}
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                className={`nav-link-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onClose) onClose();
                }}
              >
                <div className="nav-link-content">
                  <Icon size={18} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </div>
                {item.badge !== null && item.badge > 0 && (
                  <span
                    className={`nav-badge ${
                      item.badgeColor === 'amber'
                        ? 'badge-amber'
                        : item.badgeColor === 'blue'
                        ? 'badge-blue'
                        : 'badge-neutral'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="system-health-card">
            <div className="health-indicator">
              <span className="health-dot live-pulse" />
              <span className="health-label">System Online</span>
            </div>
            <span className="health-status">Postgres DB Connected</span>
          </div>
        </div>
      </aside>
    </>
  );
}
