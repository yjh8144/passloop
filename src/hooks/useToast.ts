import { useState } from "react";
import type { Toast } from "../lib/types";
import { createId } from "../lib/question";

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (tone: Toast["tone"], message: string) => {
    setToasts((items) => {
      const last = items[items.length - 1];
      if (last && last.message === message) {
        return items.map((item) =>
          item.id === last.id
            ? { ...item, bump: Date.now(), repeatCount: Math.min((item.repeatCount ?? 1) + 1, 5) }
            : item,
        );
      }
      const id = createId();
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, 3200);
      return [...items, { id, tone, message, repeatCount: 1 }];
    });
  };

  return { toasts, pushToast };
}
