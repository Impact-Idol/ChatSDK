import React, { useState } from 'react';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  memberCount: number;
  isDefault?: boolean;
  isSystem?: boolean;
}

export interface RolesPermissionsProps {
  roles: Role[];
  permissions: Permission[];
  onRoleCreate?: (role: Omit<Role, 'id' | 'memberCount'>) => void;
  onRoleUpdate?: (role: Role) => void;
  onRoleDelete?: (roleId: string) => void;
  loading?: boolean;
}

export function RolesPermissions({
  roles,
  permissions,
  onRoleCreate,
  onRoleUpdate,
  onRoleDelete,
  loading = false,
}: RolesPermissionsProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(roles[0] || null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRole, setNewRole] = useState<Omit<Role, 'id' | 'memberCount'>>({
    name: '',
    description: '',
    color: '#6366f1',
    permissions: [],
  });

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) acc[permission.category] = [];
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const colorOptions = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6b7280',
  ];

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      height: '100vh',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
    },
    sidebar: {
      width: '280px',
      borderRight: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    sidebarHeader: {
      padding: '20px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    sidebarTitle: {
      fontSize: '18px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      margin: 0,
      marginBottom: '8px',
    },
    sidebarSubtitle: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      margin: 0,
    },
    roleList: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '12px',
    },
    roleItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      marginBottom: '4px',
    },
    roleItemActive: {
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
    },
    roleColor: {
      width: '12px',
      height: '12px',
      borderRadius: '4px',
      flexShrink: 0,
    },
    roleInfo: {
      flex: 1,
      minWidth: 0,
    },
    roleName: {
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    roleMeta: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    addButton: {
      margin: '12px',
      padding: '12px',
      borderRadius: '10px',
      border: '2px dashed var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'transparent',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.15s ease',
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    mainHeader: {
      padding: '24px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    mainTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    mainTitleText: {
      fontSize: '20px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
    },
    systemBadge: {
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    defaultBadge: {
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
      color: 'var(--chatsdk-accent-color, #6366f1)',
    },
    deleteButton: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'var(--chatsdk-error-light, #fee2e2)',
      color: 'var(--chatsdk-error-color, #ef4444)',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    content: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '24px',
    },
    section: {
      marginBottom: '32px',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '16px',
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginBottom: '16px',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '8px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      fontSize: '14px',
      color: 'var(--chatsdk-text-primary, #111827)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      fontSize: '14px',
      color: 'var(--chatsdk-text-primary, #111827)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      outline: 'none',
      minHeight: '80px',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
    },
    colorPicker: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap' as const,
    },
    colorOption: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      cursor: 'pointer',
      border: '2px solid transparent',
      transition: 'all 0.15s ease',
    },
    colorOptionSelected: {
      border: '2px solid var(--chatsdk-text-primary, #111827)',
      transform: 'scale(1.1)',
    },
    permissionCategory: {
      marginBottom: '24px',
    },
    categoryTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '12px',
      textTransform: 'capitalize' as const,
    },
    permissionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '12px',
    },
    permissionItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '12px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '8px',
    },
    checkbox: {
      width: '20px',
      height: '20px',
      borderRadius: '6px',
      border: '2px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: '2px',
      transition: 'all 0.15s ease',
    },
    checkboxChecked: {
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      borderColor: 'var(--chatsdk-accent-color, #6366f1)',
    },
    permissionInfo: {
      flex: 1,
    },
    permissionName: {
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '4px',
    },
    permissionDesc: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    actions: {
      padding: '16px 24px',
      borderTop: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    buttonPrimary: {
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      color: '#ffffff',
    },
    buttonSecondary: {
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    emptyState: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column' as const,
      padding: '48px',
    },
    emptyIcon: {
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      marginBottom: '16px',
    },
    emptyTitle: {
      fontSize: '18px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '8px',
    },
    emptyText: {
      fontSize: '14px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
  };

  const togglePermission = (permissionId: string) => {
    if (!selectedRole || selectedRole.isSystem) return;

    const newPermissions = selectedRole.permissions.includes(permissionId)
      ? selectedRole.permissions.filter((p) => p !== permissionId)
      : [...selectedRole.permissions, permissionId];

    onRoleUpdate?.({ ...selectedRole, permissions: newPermissions });
  };

  const toggleNewRolePermission = (permissionId: string) => {
    const newPermissions = newRole.permissions.includes(permissionId)
      ? newRole.permissions.filter((p) => p !== permissionId)
      : [...newRole.permissions, permissionId];

    setNewRole({ ...newRole, permissions: newPermissions });
  };

  const handleCreateRole = () => {
    onRoleCreate?.(newRole);
    setIsCreating(false);
    setNewRole({ name: '', description: '', color: '#6366f1', permissions: [] });
  };

  const renderRoleEditor = (role: Role | typeof newRole, isNew: boolean) => {
    const currentPermissions = role.permissions;
    const isSystemRole = !isNew && 'isSystem' in role && role.isSystem;

    return (
      <>
        <div style={styles.content}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Basic Information</div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role Name</label>
                <input
                  type="text"
                  style={styles.input}
                  value={role.name}
                  onChange={(e) =>
                    isNew
                      ? setNewRole({ ...newRole, name: e.target.value })
                      : onRoleUpdate?.({ ...(role as Role), name: e.target.value })
                  }
                  disabled={isSystemRole}
                  placeholder="e.g., Moderator"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Color</label>
                <div style={styles.colorPicker}>
                  {colorOptions.map((color) => (
                    <div
                      key={color}
                      style={{
                        ...styles.colorOption,
                        backgroundColor: color,
                        ...(role.color === color ? styles.colorOptionSelected : {}),
                      }}
                      onClick={() =>
                        !isSystemRole &&
                        (isNew
                          ? setNewRole({ ...newRole, color })
                          : onRoleUpdate?.({ ...(role as Role), color }))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                style={styles.textarea}
                value={role.description}
                onChange={(e) =>
                  isNew
                    ? setNewRole({ ...newRole, description: e.target.value })
                    : onRoleUpdate?.({ ...(role as Role), description: e.target.value })
                }
                disabled={isSystemRole}
                placeholder="Describe what this role can do..."
              />
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Permissions</div>
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <div key={category} style={styles.permissionCategory}>
                <div style={styles.categoryTitle}>{category}</div>
                <div style={styles.permissionGrid}>
                  {perms.map((permission) => {
                    const isChecked = currentPermissions.includes(permission.id);
                    return (
                      <div key={permission.id} style={styles.permissionItem}>
                        <div
                          style={{
                            ...styles.checkbox,
                            ...(isChecked ? styles.checkboxChecked : {}),
                            cursor: isSystemRole ? 'not-allowed' : 'pointer',
                            opacity: isSystemRole ? 0.6 : 1,
                          }}
                          onClick={() =>
                            isNew
                              ? toggleNewRolePermission(permission.id)
                              : togglePermission(permission.id)
                          }
                        >
                          {isChecked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div style={styles.permissionInfo}>
                          <div style={styles.permissionName}>{permission.name}</div>
                          <div style={styles.permissionDesc}>{permission.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isNew && (
          <div style={styles.actions}>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </button>
            <button
              style={{ ...styles.button, ...styles.buttonPrimary }}
              onClick={handleCreateRole}
              disabled={!newRole.name}
            >
              Create Role
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Roles</h2>
          <p style={styles.sidebarSubtitle}>Manage user roles and permissions</p>
        </div>

        <div style={styles.roleList}>
          {roles.map((role) => (
            <div
              key={role.id}
              style={{
                ...styles.roleItem,
                ...(selectedRole?.id === role.id && !isCreating ? styles.roleItemActive : {}),
              }}
              onClick={() => {
                setSelectedRole(role);
                setIsCreating(false);
              }}
            >
              <div style={{ ...styles.roleColor, backgroundColor: role.color }} />
              <div style={styles.roleInfo}>
                <div style={styles.roleName}>{role.name}</div>
                <div style={styles.roleMeta}>{role.memberCount} members</div>
              </div>
            </div>
          ))}
        </div>

        <button
          style={styles.addButton}
          onClick={() => {
            setIsCreating(true);
            setSelectedRole(null);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Role
        </button>
      </div>

      <div style={styles.main}>
        {isCreating ? (
          <>
            <div style={styles.mainHeader}>
              <div style={styles.mainTitle}>
                <div
                  style={{
                    ...styles.roleColor,
                    width: '16px',
                    height: '16px',
                    backgroundColor: newRole.color,
                  }}
                />
                <span style={styles.mainTitleText}>New Role</span>
              </div>
            </div>
            {renderRoleEditor(newRole, true)}
          </>
        ) : selectedRole ? (
          <>
            <div style={styles.mainHeader}>
              <div style={styles.mainTitle}>
                <div
                  style={{
                    ...styles.roleColor,
                    width: '16px',
                    height: '16px',
                    backgroundColor: selectedRole.color,
                  }}
                />
                <span style={styles.mainTitleText}>{selectedRole.name}</span>
                {selectedRole.isSystem && (
                  <span style={{ ...styles.badge, ...styles.systemBadge }}>System</span>
                )}
                {selectedRole.isDefault && (
                  <span style={{ ...styles.badge, ...styles.defaultBadge }}>Default</span>
                )}
              </div>
              {!selectedRole.isSystem && (
                <button
                  style={styles.deleteButton}
                  onClick={() => onRoleDelete?.(selectedRole.id)}
                >
                  Delete Role
                </button>
              )}
            </div>
            {renderRoleEditor(selectedRole, false)}
          </>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <div style={styles.emptyTitle}>Select a role</div>
            <div style={styles.emptyText}>Choose a role from the sidebar to view and edit permissions</div>
          </div>
        )}
      </div>
    </div>
  );
}
