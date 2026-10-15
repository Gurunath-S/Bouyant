import { create } from 'zustand';
import React from 'react';

export type DialogType = 'warning' | 'danger' | 'info' | 'success';

export interface DialogOptions {
  title?: string;
  message: string | React.ReactNode;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  isAlert?: boolean;
}

interface DialogState {
  isOpen: boolean;
  options: DialogOptions | null;
  resolve: ((value: boolean) => void) | null;
  openDialog: (options: DialogOptions) => Promise<boolean>;
  closeDialog: (result: boolean) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: null,
  openDialog: (options: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options,
        resolve,
      });
    });
  },
  closeDialog: (result: boolean) => {
    const { resolve } = get();
    if (resolve) resolve(result);
    set({
      isOpen: false,
      options: null,
      resolve: null,
    });
  },
}));

/**
 * Clean customized confirm popup replacing standard browser confirm()
 */
export const showConfirm = (options: DialogOptions | string): Promise<boolean> => {
  const opts: DialogOptions =
    typeof options === 'string'
      ? { message: options, title: 'Confirmation Required', type: 'warning' }
      : options;

  return useDialogStore.getState().openDialog({
    title: opts.title || 'Confirmation Required',
    type: opts.type || 'warning',
    confirmText: opts.confirmText || 'Confirm',
    cancelText: opts.cancelText || 'Cancel',
    isAlert: false,
    ...opts,
  });
};

/**
 * Clean customized alert/warning popup replacing standard browser alert()
 */
export const showAlert = (options: DialogOptions | string): Promise<boolean> => {
  const opts: DialogOptions =
    typeof options === 'string'
      ? { message: options, title: 'Notice', type: 'info' }
      : options;

  return useDialogStore.getState().openDialog({
    title: opts.title || 'Notice',
    type: opts.type || 'info',
    confirmText: opts.confirmText || 'Got It',
    isAlert: true,
    ...opts,
  });
};
