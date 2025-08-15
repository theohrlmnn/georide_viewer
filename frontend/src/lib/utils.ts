// Version simplifiée de cn sans clsx ni tailwind-merge
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
