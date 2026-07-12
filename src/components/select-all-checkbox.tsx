"use client";

export function SelectAllCheckbox({
  targetName,
  className,
}: {
  targetName: string;
  className?: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label="Alle auswählen"
      className={className}
      onChange={(e) => {
        const form = e.currentTarget.closest("form");
        if (!form) return;
        const checkboxes = form.querySelectorAll<HTMLInputElement>(
          `input[type="checkbox"][name="${targetName}"]`,
        );
        checkboxes.forEach((checkbox) => {
          checkbox.checked = e.currentTarget.checked;
        });
      }}
    />
  );
}
