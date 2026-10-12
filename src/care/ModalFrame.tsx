// Vaultline Care addition. Keep keyboard focus in the reviewed evidence or approval.
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function ModalFrame({
  titleId,
  closeLabel,
  onClose,
  children,
}: {
  titleId: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const surfaces = Array.from(
      document.querySelectorAll<HTMLElement>(".care-nav, .care-main"),
    );
    surfaces.forEach((element) => {
      element.inert = true;
    });
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input, select, textarea",
        ) || [],
      );
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      surfaces.forEach((element) => {
        element.inert = false;
      });
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <section
        ref={panel}
        className="care-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          className="modal-close"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <X size={19} />
        </button>
        {children}
      </section>
    </div>
  );
}
