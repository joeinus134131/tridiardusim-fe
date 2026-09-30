"use client";

import { FolderOpen, RefreshCw, X } from "lucide-react";

export interface ServerProjectSummary {
  id: string;
  name: string;
}

interface ServerProjectsModalProps {
  isOpen: boolean;
  projects: ServerProjectSummary[];
  busy: boolean;
  labels: {
    title: string;
    subtitle: string;
    empty: string;
    open: string;
    refresh: string;
    close: string;
  };
  onClose: () => void;
  onRefresh: () => void;
  onSelect: (project: ServerProjectSummary) => void;
}

export function ServerProjectsModal({
  isOpen,
  projects,
  busy,
  labels,
  onClose,
  onRefresh,
  onSelect,
}: ServerProjectsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="datasheet-modal-overlay" onClick={onClose}>
      <div
        className="server-projects-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="server-projects-title"
      >
        <div className="datasheet-header">
          <div>
            <h2 id="server-projects-title" className="text-base font-bold text-white">
              {labels.title}
            </h2>
            <p className="text-xs text-slate-300">{labels.subtitle}</p>
          </div>
          <button className="datasheet-close-btn" onClick={onClose} aria-label={labels.close}>
            <X size={18} />
          </button>
        </div>

        <div className="server-projects-body">
          {projects.length === 0 ? (
            <div className="server-projects-empty">{labels.empty}</div>
          ) : (
            <div className="server-projects-list">
              {projects.map((project) => (
                <button
                  key={project.id}
                  className="server-project-item"
                  disabled={busy}
                  onClick={() => onSelect(project)}
                >
                  <FolderOpen size={18} />
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.id}</small>
                  </span>
                  <span className="server-project-open-label">{labels.open}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="server-projects-footer">
          <button className="server-project-refresh" disabled={busy} onClick={onRefresh}>
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
            {labels.refresh}
          </button>
        </div>
      </div>
    </div>
  );
}
