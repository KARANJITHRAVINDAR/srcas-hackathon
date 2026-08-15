import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Info } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertOptions {
    type?: AlertType;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

interface AlertContextType {
    showAlert: (options: AlertOptions | string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [alertState, setAlertState] = useState<(AlertOptions & { resolve?: (val: boolean) => void }) | null>(null);

    const showAlert = (options: AlertOptions | string): Promise<boolean> => {
        return new Promise((resolve) => {
            if (typeof options === 'string') {
                setAlertState({
                    type: 'info',
                    message: options,
                    resolve,
                });
            } else {
                setAlertState({
                    ...options,
                    resolve,
                });
            }
        });
    };

    const handleConfirm = () => {
        if (alertState?.onConfirm) alertState.onConfirm();
        if (alertState?.resolve) alertState.resolve(true);
        setAlertState(null);
    };

    const handleCancel = () => {
        if (alertState?.onCancel) alertState.onCancel();
        if (alertState?.resolve) alertState.resolve(false);
        setAlertState(null);
    };

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            {alertState && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                            <div className="flex items-start gap-3 sm:gap-4">
                                {alertState.type === 'success' && (
                                    <div className="p-2.5 sm:p-3 bg-emerald-100 text-emerald-600 rounded-full shrink-0">
                                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                )}
                                {alertState.type === 'error' && (
                                    <div className="p-2.5 sm:p-3 bg-rose-100 text-rose-600 rounded-full shrink-0">
                                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                )}
                                {alertState.type === 'warning' && (
                                    <div className="p-2.5 sm:p-3 bg-amber-100 text-amber-600 rounded-full shrink-0">
                                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                )}
                                {alertState.type === 'confirm' && (
                                    <div className="p-2.5 sm:p-3 bg-indigo-100 text-indigo-600 rounded-full shrink-0">
                                        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                )}
                                {(!alertState.type || alertState.type === 'info') && (
                                    <div className="p-2.5 sm:p-3 bg-blue-100 text-blue-600 rounded-full shrink-0">
                                        <Info className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base sm:text-lg font-extrabold text-[#10172A]">
                                        {alertState.title || (
                                            alertState.type === 'confirm' ? 'Confirm Action' : 
                                            alertState.type === 'error' ? 'Error' : 
                                            alertState.type === 'success' ? 'Success' : 
                                            alertState.type === 'warning' ? 'Warning' : 'Notice'
                                        )}
                                    </h3>
                                    <p className="text-xs sm:text-sm font-medium text-[#52627A] mt-1.5 leading-relaxed whitespace-pre-line break-words">
                                        {alertState.message}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 sm:gap-3 shrink-0">
                            {alertState.type === 'confirm' && (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition min-h-[40px] flex items-center justify-center"
                                >
                                    {alertState.cancelText || 'Cancel'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-sm transition min-h-[40px] flex items-center justify-center ${
                                    alertState.type === 'error'
                                        ? 'bg-rose-600 hover:bg-rose-700'
                                        : alertState.type === 'confirm'
                                        ? 'bg-indigo-600 hover:bg-indigo-700'
                                        : alertState.type === 'warning'
                                        ? 'bg-amber-600 hover:bg-amber-700'
                                        : 'bg-[#00A875] hover:bg-emerald-600'
                                }`}
                            >
                                {alertState.confirmText || (alertState.type === 'confirm' ? 'Confirm' : 'OK')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
};

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};
