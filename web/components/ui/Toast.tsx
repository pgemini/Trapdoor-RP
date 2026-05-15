"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/util";

export type ToastKind = "default" | "success" | "error";

interface ToastItem {
  id: number;
  msg: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toast: (msg: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3800;

interface InternalState {
  items: ToastItem[];
  push: (msg: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

const InternalContext = createContext<InternalState | null>(null);

function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (msg: string, kind: ToastKind = "default") => {
      const id = idRef.current++;
      setItems((cur) => [...cur, { id, msg, kind }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const internalValue = useMemo<InternalState>(
    () => ({ items, push, dismiss }),
    [items, push, dismiss],
  );
  const publicValue = useMemo<ToastContextValue>(
    () => ({ toast: push }),
    [push],
  );

  return (
    <ToastContext.Provider value={publicValue}>
      <InternalContext.Provider value={internalValue}>
        {children}
      </InternalContext.Provider>
    </ToastContext.Provider>
  );
}

// A lightweight global store so <Toaster /> can be mounted anywhere and
// useToast() works without an explicit provider. We layer it onto window.
interface GlobalToastStore {
  items: ToastItem[];
  listeners: Set<() => void>;
  push: (msg: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
  nextId: number;
}

declare global {
  interface Window {
    __trapdoorToast?: GlobalToastStore;
  }
}

function getStore(): GlobalToastStore {
  if (typeof window === "undefined") {
    // Server-safe no-op store
    return {
      items: [],
      listeners: new Set(),
      push: () => undefined,
      dismiss: () => undefined,
      nextId: 1,
    };
  }
  if (!window.__trapdoorToast) {
    const listeners = new Set<() => void>();
    const store: GlobalToastStore = {
      items: [],
      listeners,
      nextId: 1,
      push: (msg: string, kind: ToastKind = "default") => {
        const id = store.nextId++;
        store.items = [...store.items, { id, msg, kind }];
        listeners.forEach((l) => l());
        window.setTimeout(() => store.dismiss(id), AUTO_DISMISS_MS);
      },
      dismiss: (id: number) => {
        store.items = store.items.filter((t) => t.id !== id);
        listeners.forEach((l) => l());
      },
    };
    window.__trapdoorToast = store;
  }
  return window.__trapdoorToast;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return useMemo<ToastContextValue>(
    () => ({
      toast: (msg, kind) => {
        if (ctx) {
          ctx.toast(msg, kind);
        } else {
          getStore().push(msg, kind);
        }
      },
    }),
    [ctx],
  );
}

const KIND_CLASSES: Record<ToastKind, string> = {
  default: "border-line-strong",
  success: "border-sev-ok/55",
  error:   "border-sev-danger/55",
};

function KindIcon({ kind }: { kind: ToastKind }) {
  if (kind === "success") return <CheckCircle2 size={16} className="text-sev-ok shrink-0" />;
  if (kind === "error") return <XCircle size={16} className="text-sev-danger shrink-0" />;
  return <Info size={16} className="text-accent-blue shrink-0" />;
}

function ToastList({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={cn(
              "pointer-events-auto glass rounded-lg border px-3.5 py-2.5",
              "flex items-start gap-2.5 min-w-[260px] max-w-[380px] shadow-deep",
              KIND_CLASSES[t.kind],
            )}
          >
            <KindIcon kind={t.kind} />
            <div className="text-[13px] leading-snug text-white/90 flex-1 whitespace-pre-wrap">
              {t.msg}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="shrink-0 text-muted hover:text-white transition-colors -mr-1 -mt-0.5 p-0.5 rounded"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Toaster() {
  const internal = useContext(InternalContext);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (internal) return; // provider drives renders
    const store = getStore();
    const onChange = () => setTick((t) => t + 1);
    store.listeners.add(onChange);
    return () => {
      store.listeners.delete(onChange);
    };
  }, [internal]);

  if (internal) {
    return <ToastList items={internal.items} onDismiss={internal.dismiss} />;
  }
  const store = getStore();
  // tick used to force re-render when global store changes
  void tick;
  return <ToastList items={store.items} onDismiss={store.dismiss} />;
}

export { ToastProvider };

export default Toaster;
