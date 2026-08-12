// src/lib/toast.ts
// Central alert/toast helper for the whole site, based on SweetAlert2
// (the maintained successor of t4t5/sweetalert).
// - showToast: auto-dismissing toast (bottom-right) with a close button.
// - showAlert: modal alert (title + message + icon).
import Swal from 'sweetalert2';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

const isDarkMode = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

const themeColors = (): { bg: string; color: string; border: string } =>
  isDarkMode()
    ? { bg: '#18181b', color: '#f4f4f5', border: 'rgba(240,181,61,0.25)' }
    : { bg: '#ffffff', color: '#1c1917', border: 'rgba(192,57,43,0.25)' };

export function showToast(message: string, type: ToastType = 'info', title?: string): void {
  const theme = themeColors();
  void Swal.fire({
    toast: true,
    position: 'bottom-end',
    icon: type,
    title: title || undefined,
    text: message,
    showConfirmButton: false,
    showCloseButton: true,
    timer: 4000,
    timerProgressBar: true,
    background: theme.bg,
    color: theme.color,
    didOpen: (toast) => {
      toast.style.border = `1px solid ${theme.border}`;
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });
}

export function showAlert(message: string, type: ToastType = 'info', title?: string): void {
  const theme = themeColors();
  void Swal.fire({
    icon: type,
    title: title || undefined,
    text: message,
    confirmButtonColor: '#C0392B',
    background: theme.bg,
    color: theme.color,
  });
}

export default { showToast, showAlert };
