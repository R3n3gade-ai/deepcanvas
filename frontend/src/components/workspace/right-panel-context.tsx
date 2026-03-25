"use client";

import { createContext, useContext } from "react";

interface RightPanelContextValue {
    isOpen: boolean;
    toggle: () => void;
    close: () => void;
}

const RightPanelContext = createContext<RightPanelContextValue>({
    isOpen: true,
    toggle: () => { },
    close: () => { },
});

export const RightPanelProvider = RightPanelContext.Provider;

export function useRightPanel() {
    return useContext(RightPanelContext);
}
