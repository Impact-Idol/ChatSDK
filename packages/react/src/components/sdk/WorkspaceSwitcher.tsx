/**
 * WorkspaceSwitcher - Component for switching between workspaces
 */

import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaces, type Workspace } from '../../hooks/useWorkspaces';

export interface WorkspaceSwitcherProps {
  className?: string;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
}

/**
 * WorkspaceSwitcher - Dropdown to switch between workspaces
 *
 * @example
 * ```tsx
 * <WorkspaceSwitcher onCreateClick={() => setShowCreateDialog(true)} />
 * ```
 */
export function WorkspaceSwitcher({
  className = '',
  showCreateButton = true,
  onCreateClick,
}: WorkspaceSwitcherProps) {
  const { workspaces, activeWorkspace, setActiveWorkspace, loading } = useWorkspaces();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (loading && !activeWorkspace) {
    return (
      <div className={`workspace-switcher-loading p-2 ${className}`}>
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const handleSwitch = (workspace: Workspace) => {
    setActiveWorkspace(workspace);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`workspace-switcher relative ${className}`}
    >
      {/* Trigger Button */}
      <button
        className="workspace-switcher-button w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Workspace Avatar */}
        {activeWorkspace?.image ? (
          <img
            src={activeWorkspace.image}
            alt={activeWorkspace.name}
            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {activeWorkspace?.name.charAt(0).toUpperCase() || 'W'}
          </div>
        )}

        {/* Workspace Name */}
        <div className="flex-1 text-left min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {activeWorkspace?.name || 'Select Workspace'}
          </div>
          {activeWorkspace && (
            <div className="text-xs text-gray-500 truncate">
              {activeWorkspace.channelCount} channels · {activeWorkspace.memberCount} members
            </div>
          )}
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="workspace-switcher-dropdown absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-96 overflow-y-auto">
          {workspaces.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No workspaces found
            </div>
          ) : (
            workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className={`workspace-switcher-item w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                  workspace.id === activeWorkspace?.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSwitch(workspace)}
              >
                {/* Workspace Avatar */}
                {workspace.image ? (
                  <img
                    src={workspace.image}
                    alt={workspace.name}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {workspace.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Workspace Details */}
                <div className="flex-1 text-left min-w-0">
                  <div
                    className={`font-medium truncate ${
                      workspace.id === activeWorkspace?.id
                        ? 'text-blue-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {workspace.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {workspace.channelCount} channels · {workspace.memberCount} members
                  </div>
                </div>

                {/* Active Indicator */}
                {workspace.id === activeWorkspace?.id && (
                  <svg
                    className="w-5 h-5 text-blue-600 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))
          )}

          {/* Create Workspace Button */}
          {showCreateButton && (
            <>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                className="workspace-switcher-create w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-blue-600 font-medium"
                onClick={() => {
                  setIsOpen(false);
                  onCreateClick?.();
                }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>Create workspace</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
