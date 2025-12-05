
import React, { createContext, useContext, useState } from 'react';
const ToastContext = createContext<any>(null);
export const ToastProvider = ({ children }: any) => <ToastContext.Provider value={{}}>{children}</ToastContext.Provider>;
export const useToast = () => useContext(ToastContext);
