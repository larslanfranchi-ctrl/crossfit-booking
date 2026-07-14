"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
};

// Submit-Button, der vor dem Absenden eine Rückfrage stellt. Bricht der Nutzer
// ab, wird das Absenden des umgebenden Formulars (Server Action) verhindert.
export function ConfirmSubmitButton({ confirmMessage, ...props }: Props) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    />
  );
}
