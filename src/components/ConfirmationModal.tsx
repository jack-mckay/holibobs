"use client";

import { X } from "lucide-react";

export function ConfirmationModal({
  title,
  message,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal confirmation-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="kicker">Please confirm</span>
            <h2>{title}</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        <p className="confirmation-message">{message}</p>
        <div className="modal-footer confirmation-footer">
          <button className="secondary-button" onClick={onClose}>
            Keep request
          </button>
          <button className="danger-button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}